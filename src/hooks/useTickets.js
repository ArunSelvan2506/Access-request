import { useState, useEffect, useCallback, useRef } from 'react'
import { seedTickets } from '../data/seed'

const STORE = 'acc_sd_tickets_v1'

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
// exposes the mutations the UI needs. The `seq` counter mirrors the original
// app (new tickets start at ACC-106). Used when VITE_BACKEND is not "firebase".
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

  // Create a new ticket from a validated catalog app + form data.
  // `user` is { email, name } of the requester; `meta` may carry { urgency }.
  const createTicket = useCallback((app, summary, data, user = {}, meta = {}) => {
    const num = Math.max(seqRef.current, 105) + 1
    seqRef.current = num
    const ticket = {
      num,
      key: 'ACC-' + num,
      app: app.name,
      summary,
      requester: user.name || user.email || 'Unknown',
      requesterEmail: user.email || null,
      urgency: meta.urgency || 'Medium',
      status: 'Open',
      created: Date.now(),
      sla: app.sla,
      fields: data,
      activity: [
        {
          who: 'Automation',
          tm: Date.now(),
          tx: 'Passed validation — all required fields present. Ticket opened and SLA timer started (' + app.sla + 'h target).',
        },
      ],
    }
    setTickets((prev) => [ticket, ...prev])
    return ticket
  }, [])

  // Move a ticket to a new status and log the activity.
  // `opts` may carry { actor, pendingReason } (pendingReason used for Waiting).
  const transitionTicket = useCallback((key, to, opts = {}) => {
    const actor = opts.actor || 'Unknown'
    setTickets((prev) =>
      prev.map((t) => {
        if (t.key !== key) return t
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
    )
  }, [])

  return { tickets, createTicket, transitionTicket }
}
