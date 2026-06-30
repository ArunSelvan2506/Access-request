import { useState, useEffect, useCallback, useRef } from 'react'
import { buildTicket, applyTransition, applyApproval, applyAssign, applyComment } from '../data/ticketOps'
import { listTickets, createTicketApi, saveTicketApi } from '../api/client'

// API-backed store (Node + libSQL/SQLite, e.g. Turso). Same interface as the
// local store, so the app is unchanged. Tickets are shared across everyone;
// the list is polled so other people's changes show up.
export function useApiTickets() {
  const [tickets, setTickets] = useState([])
  const seqRef = useRef(140)

  const refresh = useCallback(async () => {
    try {
      const list = await listTickets()
      if (Array.isArray(list)) {
        setTickets(list)
        seqRef.current = list.reduce((m, t) => Math.max(m, t.num || 0), 140)
      }
    } catch (e) {
      /* keep last good state on transient errors */
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 15000) // shared feel: poll for others' changes
    return () => clearInterval(id)
  }, [refresh])

  // Apply a pure op locally (optimistic) and persist the result to the server.
  const mutate = useCallback(
    (key, fn) => {
      setTickets((prev) => {
        const cur = prev.find((t) => t.key === key)
        if (cur) saveTicketApi(key, fn(cur)).catch(() => refresh())
        return prev.map((t) => (t.key === key ? fn(t) : t))
      })
    },
    [refresh]
  )

  const createTicket = useCallback(async (app, summary, data, user = {}, meta = {}) => {
    const num = Math.max(seqRef.current, 140) + 1
    seqRef.current = num
    const ticket = buildTicket({ num, app, summary, data, user, meta })
    setTickets((prev) => [ticket, ...prev])
    try {
      await createTicketApi(ticket)
    } catch (e) {
      refresh()
    }
    return ticket
  }, [refresh])

  const transitionTicket = useCallback((key, to, opts = {}) => mutate(key, (t) => applyTransition(t, to, opts)), [mutate])
  const decideApproval = useCallback((key, decision, by, note, channel) => mutate(key, (t) => applyApproval(t, decision, by, note, channel)), [mutate])
  const assignTicket = useCallback((key, assignee, actor) => mutate(key, (t) => applyAssign(t, assignee, actor)), [mutate])
  const addComment = useCallback((key, who, text, internal) => mutate(key, (t) => applyComment(t, who, text, internal)), [mutate])

  return { tickets, createTicket, transitionTicket, decideApproval, assignTicket, addComment }
}
