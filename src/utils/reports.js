// Pure analytics over the in-memory tickets array. No external libraries —
// everything here is plain reduction, rendered as inline SVG by Reports.jsx.
import { slaState, isOpen } from './sla'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Requests per calendar month (last `n` months up to now), oldest → newest.
export function monthlyVolume(tickets, now = Date.now(), n = 6) {
  const buckets = []
  const d = new Date(now)
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1)
    buckets.push({ key: dt.getFullYear() + '-' + dt.getMonth(), label: MONTHS[dt.getMonth()], count: 0 })
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]))
  for (const t of tickets) {
    const dt = new Date(t.created)
    const k = dt.getFullYear() + '-' + dt.getMonth()
    if (idx.has(k)) buckets[idx.get(k)].count++
  }
  return buckets
}

export function statusCounts(tickets) {
  const order = ['Pending Approval', 'Open', 'In Progress', 'Waiting', 'Done', 'Rejected', 'Cancelled']
  const c = {}
  for (const t of tickets) c[t.status] = (c[t.status] || 0) + 1
  return order.filter((s) => c[s]).map((s) => ({ label: s, count: c[s] }))
}

export function topApps(tickets, n = 8) {
  const c = {}
  for (const t of tickets) c[t.app] = (c[t.app] || 0) + 1
  return Object.entries(c)
    .map(([app, count]) => ({ app, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export function outcomes(tickets) {
  let done = 0, rejected = 0, cancelled = 0
  for (const t of tickets) {
    if (t.status === 'Done') done++
    else if (t.status === 'Rejected') rejected++
    else if (t.status === 'Cancelled') cancelled++
  }
  return { done, rejected, cancelled }
}

// Headline KPIs — all computed, never hardcoded.
export function kpis(tickets, now = Date.now()) {
  const total = tickets.length || 1
  const open = tickets.filter(isOpen).length
  const resolved = tickets.filter((t) => t.status === 'Done').length
  const rejected = tickets.filter((t) => t.status === 'Rejected').length
  const needApproval = tickets.filter((t) => t.approval || t.manager).length
  // SLA attainment: resolved tickets count as met; live open tickets are met
  // unless currently breaching. Rejected/Cancelled excluded.
  const breached = tickets.filter((t) => slaState(t, now).cls === 'breach').length
  const met = resolved + open - breached
  const slaBase = met + breached
  return {
    total: tickets.length,
    open,
    resolved,
    rejectedPct: Math.round((rejected / total) * 100),
    approvalPct: Math.round((needApproval / total) * 100),
    slaPct: slaBase > 0 ? Math.round((met / slaBase) * 100) : 100,
  }
}
