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

// Central ticket store: holds the list, persists to localStorage on change,
// and exposes the mutations the UI needs. The `seq` counter mirrors the
// original app (new tickets start at ACC-106).
export function useTickets() {
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
  const createTicket = useCallback((app, summary, data, requester = 'Sarah Chen') => {
    const num = Math.max(seqRef.current, 105) + 1
    seqRef.current = num
    const ticket = {
      num,
      key: 'ACC-' + num,
      app: app.name,
      summary,
      requester,
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
  const transitionTicket = useCallback((key, to, actor = 'Sarah Chen') => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.key !== key) return t
        const activity = [...(t.activity || []), { who: actor, tm: Date.now(), tx: 'Status changed to ' + to + '.' }]
        let rejectReason = t.rejectReason
        if (to === 'Rejected' && !rejectReason) rejectReason = 'Manually rejected'
        if (to !== 'Rejected') rejectReason = null
        return { ...t, status: to, activity, rejectReason }
      })
    )
  }, [])

  return { tickets, createTicket, transitionTicket }
}
