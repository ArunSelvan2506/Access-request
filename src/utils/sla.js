// Computes the live SLA state for a ticket.
// Returns { cls, txt } where cls is one of "ok" | "warn" | "breach".
// Closed tickets (Done/Rejected) stop their timer.
export function slaState(t, now = Date.now()) {
  if (t.status === 'Done' || t.status === 'Rejected') {
    return { cls: 'ok', txt: t.status === 'Done' ? 'Met' : 'Closed', pct: 0 }
  }
  const target = t.sla * 36e5
  const elapsed = now - t.created
  const rem = target - elapsed
  const h = Math.floor(Math.abs(rem) / 36e5)
  const m = Math.floor((Math.abs(rem) % 36e5) / 6e4)
  if (rem < 0) return { cls: 'breach', txt: `Breached ${h}h ${m}m ago` }
  const cls = rem < target * 0.25 ? 'warn' : 'ok'
  return { cls, txt: `${h}h ${m}m left` }
}

export const isBreaching = (t) =>
  slaState(t).cls === 'breach' && !['Done', 'Rejected'].includes(t.status)

export const isOpen = (t) => ['Open', 'In Progress', 'Waiting'].includes(t.status)

// Access-expiry state for time-bound grants. Returns null if the ticket has no
// expiry. Otherwise { days, expired, soon } where soon = within 14 days.
export function expiryInfo(t, now = Date.now()) {
  if (!t || !t.expiresAt) return null
  const ms = t.expiresAt - now
  const days = Math.ceil(ms / 864e5)
  return { days, expired: ms < 0, soon: ms >= 0 && days <= 14 }
}
