// Human-friendly "time ago" for a timestamp.
export function timeAgo(ts, now = Date.now()) {
  const d = now - ts
  const h = Math.floor(d / 36e5)
  const m = Math.floor(d / 6e4)
  if (h >= 24) return Math.floor(h / 24) + 'd ago'
  if (h >= 1) return h + 'h ago'
  if (m >= 1) return m + 'm ago'
  return 'just now'
}

// CSS class for a status pill.
export const statusClass = (s) =>
  ({ Open: 's-open', 'In Progress': 's-prog', Waiting: 's-wait', Done: 's-done', Rejected: 's-rej' }[s])

// Allowed workflow transitions out of each status.
export const TRANSITIONS = {
  Open: ['In Progress', 'Rejected'],
  'In Progress': ['Waiting', 'Done', 'Rejected'],
  Waiting: ['In Progress', 'Done'],
  Done: ['In Progress'],
  Rejected: ['Open'],
}
