import { useState, useEffect, useCallback, useRef } from 'react'
import { seedTickets } from '../data/seed'
import { needsApproval } from '../data/catalog'
import { durationDays } from '../data/jira'

const STORE = 'acc_sd_tickets_v3'

function loadTickets() {
  try {
    const r = localStorage.getItem(STORE)
    if (r) return JSON.parse(r)
  } catch (e) {
    /* ignore corrupt/unavailable storage */
  }
  return seedTickets()
}

// Local (localStorage) ticket store: holds the list, persists on change, and
// exposes the mutations the UI needs. Used when VITE_BACKEND is not "firebase".
export function useLocalTickets() {
  const [tickets, setTickets] = useState(loadTickets)
  const seqRef = useRef(tickets.reduce((m, t) => Math.max(m, t.num), 0))

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(tickets))
    } catch (e) {
      /* ignore */
    }
  }, [tickets])

  // Helper to update a single ticket immutably.
  const patch = useCallback((key, fn) => {
    setTickets((prev) => prev.map((t) => (t.key === key ? fn(t) : t)))
  }, [])

  // Create a new ticket. `user` = { email, name }; `meta` may carry
  // { urgency, manager }. If a line manager is given, the ticket starts in
  // "Pending Approval" awaiting that manager's decision.
  const createTicket = useCallback((app, summary, data, user = {}, meta = {}) => {
    const num = Math.max(seqRef.current, 140) + 1
    seqRef.current = num
    const now = Date.now()
    const requireApproval = needsApproval(app.name)
    const manager = requireApproval ? (meta.manager || '').trim().toLowerCase() || null : null
    // Time-bound access: compute an expiry date if a finite duration was chosen.
    const duration = meta.duration || null
    const days = durationDays(duration)
    const expiresAt = days ? now + days * 864e5 : null
    const ticket = {
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
      urgency: meta.urgency || 'Medium',
      duration,
      expiresAt,
      status: requireApproval ? 'Pending Approval' : 'Open',
      created: now,
      sla: app.sla,
      fields: data,
      activity: [
        {
          who: 'Automation',
          tm: now,
          tx: requireApproval
            ? 'Passed validation. Awaiting line-manager approval from ' + manager + '.'
            : 'Passed validation — all required fields present. Ticket opened and SLA timer started (' + app.sla + 'h target).',
        },
      ],
    }
    setTickets((prev) => [ticket, ...prev])
    return ticket
  }, [])

  // Workflow transition (admins). `opts` may carry { actor, pendingReason }.
  const transitionTicket = useCallback((key, to, opts = {}) => {
    const actor = opts.actor || 'Unknown'
    patch(key, (t) => {
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
    })
  }, [patch])

  // Line-manager (or admin) approval decision: 'Approved' | 'Rejected'.
  const decideApproval = useCallback((key, decision, by, note) => {
    patch(key, (t) => {
      const at = Date.now()
      const approval = { state: decision, by, at, note: note || null }
      const activity = [...(t.activity || [])]
      let status = t.status
      let rejectReason = t.rejectReason
      if (decision === 'Approved') {
        status = 'Open'
        activity.push({ who: by, tm: at, tx: 'Approved by line manager' + (note ? ' — ' + note : '') + '. Moved to Open.' })
      } else {
        status = 'Rejected'
        rejectReason = 'Declined by line manager' + (note ? ': ' + note : '')
        activity.push({ who: by, tm: at, tx: 'Declined by line manager' + (note ? ' — ' + note : '') + '.' })
      }
      return { ...t, approval, status, rejectReason, activity }
    })
  }, [patch])

  // Assign / unassign an agent.
  const assignTicket = useCallback((key, assignee, actor) => {
    patch(key, (t) => ({
      ...t,
      assignee: assignee || null,
      activity: [
        ...(t.activity || []),
        { who: actor, tm: Date.now(), tx: assignee ? 'Assigned to ' + assignee + '.' : 'Unassigned.' },
      ],
    }))
  }, [patch])

  // Add a comment to a ticket. `internal: true` makes it an admin-only note
  // (hidden from the requester); otherwise it's a public comment.
  const addComment = useCallback((key, who, text, internal = false) => {
    const body = (text || '').trim()
    if (!body) return
    patch(key, (t) => ({
      ...t,
      activity: [...(t.activity || []), { who, tm: Date.now(), tx: body, comment: true, internal: !!internal }],
    }))
  }, [patch])

  return { tickets, createTicket, transitionTicket, decideApproval, assignTicket, addComment }
}
