// Pure ticket operations shared by every backend (localStorage and the
// API/DynamoDB server). Keeping the business logic here means a ticket behaves
// identically no matter where it's stored.
import { needsApproval, assigneeFor } from './catalog'
import { durationDays, slaForUrgency } from './jira'
import { displayName } from '../auth/session'

// Build a brand-new ticket. `app` is a catalog entry (needs .name).
// SLA is driven by priority (urgency), not the application.
export function buildTicket({ num, app, summary, data, user = {}, meta = {} }) {
  const now = Date.now()
  const requireApproval = needsApproval(app.name, data)
  const manager = requireApproval ? (meta.manager || '').trim().toLowerCase() || null : null
  const days = durationDays(meta.duration)
  const expiresAt = days ? now + days * 864e5 : null
  const urgency = meta.urgency || 'Medium'
  const assignee = assigneeFor(app.name) // auto-assign to the app's named owner, if any
  const activity = [
    {
      who: 'Automation',
      tm: now,
      tx: requireApproval
        ? 'Passed validation. Awaiting line-manager approval from ' + manager + '.'
        : 'Passed validation — all required fields present. Ticket opened and SLA timer started (' + slaForUrgency(urgency) + 'h target).',
    },
  ]
  if (assignee) activity.push({ who: 'Automation', tm: now, tx: 'Auto-assigned to ' + assignee + ' (' + app.name + ' owner).' })
  return {
    num,
    key: 'ACC-' + num,
    app: app.name,
    summary,
    requester: user.name || user.email || 'Unknown',
    requesterEmail: user.email || null,
    department: meta.department || null,
    role: meta.role || null,
    manager,
    approval: requireApproval ? { state: 'Pending', by: null, at: null, note: null } : null,
    assignee,
    urgency,
    duration: meta.duration || null,
    expiresAt,
    status: requireApproval ? 'Pending Approval' : 'Open',
    created: now,
    sla: slaForUrgency(urgency),
    fields: data,
    activity,
  }
}

export function applyTransition(t, to, opts = {}) {
  const actor = opts.actor || 'Unknown'
  const note =
    to === 'Waiting' && opts.pendingReason
      ? 'Status changed to Waiting — ' + opts.pendingReason + '.'
      : 'Status changed to ' + to + '.'
  const activity = [...(t.activity || []), { who: actor, tm: Date.now(), tx: note }]
  let rejectReason = t.rejectReason
  if (to === 'Rejected' && !rejectReason) rejectReason = 'Manually rejected'
  if (to !== 'Rejected') rejectReason = null
  const pendingReason = to === 'Waiting' ? opts.pendingReason || t.pendingReason || null : null
  return { ...t, status: to, activity, rejectReason, pendingReason }
}

export function applyApproval(t, decision, by, note, channel) {
  const at = Date.now()
  const via = channel && channel !== 'Portal' ? ' via ' + channel : ''
  const approval = { state: decision, by, at, note: note || null, channel: channel || 'Portal' }
  const activity = [...(t.activity || [])]
  let status = t.status
  let rejectReason = t.rejectReason
  if (decision === 'Approved') {
    status = 'Open'
    activity.push({ who: by, tm: at, tx: 'Approved by line manager' + via + (note ? ' — ' + note : '') + '. Moved to Open.' })
  } else {
    status = 'Rejected'
    rejectReason = 'Declined by line manager' + (note ? ': ' + note : '')
    activity.push({ who: by, tm: at, tx: 'Declined by line manager' + via + (note ? ' — ' + note : '') + '.' })
  }
  return { ...t, approval, status, rejectReason, activity }
}

export function applyAssign(t, assignee, actor) {
  return {
    ...t,
    assignee: assignee || null,
    activity: [
      ...(t.activity || []),
      { who: actor, tm: Date.now(), tx: assignee ? 'Assigned to ' + assignee + '.' : 'Unassigned.' },
    ],
  }
}

export function applyComment(t, who, text, internal = false) {
  const body = (text || '').trim()
  if (!body) return t
  return {
    ...t,
    activity: [...(t.activity || []), { who, tm: Date.now(), tx: body, comment: true, internal: !!internal }],
  }
}

export const nextNum = (tickets) => Math.max(140, ...tickets.map((t) => t.num || 0)) + 1

// ---- First response ----
// Every new request gets a fast, personal acknowledgement from the handling
// team so the requester hears back quickly (first-response SLA). It's posted a
// short, slightly-varied moment after the ticket is raised (see the store hooks)
// and always within the 2-minute target — never instant — so it reads as a real
// agent picking the ticket up, not a canned reply.
// Window is configurable so ops can tune it without a code change; defaults to
// 25s–100s (always under the 2-minute first-response target).
export const FIRST_RESPONSE = {
  enabled: (import.meta.env.VITE_FIRST_RESPONSE || 'on') !== 'off',
  minMs: Number(import.meta.env.VITE_FIRST_RESPONSE_MIN_MS) || 25000,
  maxMs: Number(import.meta.env.VITE_FIRST_RESPONSE_MAX_MS) || 100000,
}

// A slightly-varied delay in the configured window so the reply feels human.
export const firstResponseDelayMs = () =>
  FIRST_RESPONSE.minMs + Math.floor(Math.random() * (FIRST_RESPONSE.maxMs - FIRST_RESPONSE.minMs))

const FIRST_RESPONSE_TEMPLATES = [
  'Thanks {name} — I’ve picked this up and I’m taking a look now. I’ll follow up shortly with an update or anything I need from you.',
  'Got it, thanks {name}. Your request is with me and I’m going through the details — I’ll be back in touch soon.',
  'Thanks for raising this, {name}. I’ve started looking into it and will update you as soon as I have more.',
  'Received, thanks {name}. I’m on this now and will let you know the next step shortly.',
]

// True once a first response has been posted, so it's only ever added once.
export const hasFirstResponse = (t) => !!(t && (t.activity || []).some((e) => e.firstResponse))

// The acknowledgement text: greets the requester by first name, picks a variant
// deterministically from the ticket number, and adapts to the approval path.
export function firstResponseText(t) {
  const first = (t.requester || '').trim().split(/\s+/)[0] || 'there'
  const base = FIRST_RESPONSE_TEMPLATES[(t.num || 0) % FIRST_RESPONSE_TEMPLATES.length].replace('{name}', first)
  if (t.status === 'Pending Approval') {
    return base + ' This one needs your line manager’s sign-off first — we’ll action it the moment that’s through.'
  }
  return base
}

// Append the first-response comment as a normal public comment from the handling
// team (the assignee, or the service desk). Idempotent. Attributed to a person /
// team — never surfaced to requesters as automation.
export function applyFirstResponse(t) {
  if (!t || hasFirstResponse(t)) return t
  const who = t.assignee ? displayName(t.assignee) : 'IT Service Desk'
  return {
    ...t,
    activity: [
      ...(t.activity || []),
      { who, tm: Date.now(), tx: firstResponseText(t), comment: true, internal: false, firstResponse: true },
    ],
  }
}
