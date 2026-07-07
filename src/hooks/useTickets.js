import { useState, useEffect, useCallback, useRef } from 'react'
import { seedTickets } from '../data/seed'
import { buildTicket, applyTransition, applyApproval, applyAssign, applyComment, applyFirstResponse, firstResponseDelayMs, FIRST_RESPONSE } from '../data/ticketOps'

// Bumped to v10 so returning visitors re-seed (fewer SLA breaches; ~10).
const STORE = 'acc_sd_tickets_v10'

function loadTickets() {
  try {
    const r = localStorage.getItem(STORE)
    if (r) return JSON.parse(r)
  } catch (e) {
    /* ignore corrupt/unavailable storage */
  }
  return seedTickets()
}

// Local (localStorage) ticket store. Used when VITE_BACKEND is not set.
export function useLocalTickets() {
  const [tickets, setTickets] = useState(loadTickets)
  const seqRef = useRef(tickets.reduce((m, t) => Math.max(m, t.num), 140))

  useEffect(() => {
    try {
      localStorage.setItem(STORE, JSON.stringify(tickets))
    } catch (e) {
      /* ignore */
    }
  }, [tickets])

  const patch = useCallback((key, fn) => {
    setTickets((prev) => prev.map((t) => (t.key === key ? fn(t) : t)))
  }, [])

  // Pending first-response timers, cleared on unmount so they never leak.
  const frTimers = useRef([])
  useEffect(() => () => frTimers.current.forEach(clearTimeout), [])
  const scheduleFirstResponse = useCallback((key) => {
    if (!FIRST_RESPONSE.enabled) return
    const id = setTimeout(() => patch(key, applyFirstResponse), firstResponseDelayMs())
    frTimers.current.push(id)
  }, [patch])

  const createTicket = useCallback((app, summary, data, user = {}, meta = {}) => {
    const num = Math.max(seqRef.current, 140) + 1
    seqRef.current = num
    const ticket = buildTicket({ num, app, summary, data, user, meta })
    setTickets((prev) => [ticket, ...prev])
    scheduleFirstResponse(ticket.key)
    return ticket
  }, [scheduleFirstResponse])

  const transitionTicket = useCallback((key, to, opts = {}) => patch(key, (t) => applyTransition(t, to, opts)), [patch])
  const decideApproval = useCallback((key, decision, by, note, channel) => patch(key, (t) => applyApproval(t, decision, by, note, channel)), [patch])
  const assignTicket = useCallback((key, assignee, actor) => patch(key, (t) => applyAssign(t, assignee, actor)), [patch])
  const addComment = useCallback((key, who, text, internal) => patch(key, (t) => applyComment(t, who, text, internal)), [patch])

  return { tickets, createTicket, transitionTicket, decideApproval, assignTicket, addComment }
}
