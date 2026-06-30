// Pure ticket operations shared by every backend (localStorage, API/SQLite,
// Firebase). Keeping the business logic here means a ticket behaves identically
// no matter where it's stored.
import { needsApproval } from './catalog'
import { durationDays, slaForUrgency } from './jira'

// Build a brand-new ticket. `app` is a catalog entry (needs .name).
// SLA is driven by priority (urgency), not the application.
export function buildTicket({ num, app, summary, data, user = {}, meta = {} }) {
  const now = Date.now()
  const requireApproval = needsApproval(app.name)
  const manager = requireApproval ? (meta.manager || '').trim().toLowerCase() || null : null
  const days = durationDays(meta.duration)
  const expiresAt = days ? now + days * 864e5 : null
  const urgency = meta.urgency || 'Medium'
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
    assignee: null,
    urgency,
    duration: meta.duration || null,
    expiresAt,
    status: requireApproval ? 'Pending Approval' : 'Open',
    created: now,
    sla: slaForUrgency(urgency),
    fields: data,
    activity: [
      {
        who: 'Automation',
        tm: now,
        tx: requireApproval
          ? 'Passed validation. Awaiting line-manager approval from ' + manager + '.'
          : 'Passed validation — all required fields present. Ticket opened and SLA timer started (' + slaForUrgency(urgency) + 'h target).',
      },
    ],
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
