// Absolute date/time in UK time zone (Europe/London — handles GMT/BST).
// e.g. "30 Jun 2026, 14:32"
export function formatUK(ts) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

// Shorter UK date/time without the year, e.g. "30 Jun, 14:32".
export function formatUKShort(ts) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(ts))
}

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
  ({
    'Pending Approval': 's-appr',
    Open: 's-open',
    'In Progress': 's-prog',
    Waiting: 's-wait',
    Done: 's-done',
    Rejected: 's-rej',
  }[s])

// Allowed workflow transitions out of each status. "Pending Approval" has no
// manual transitions — it's resolved by the line-manager Approve/Decline action.
export const TRANSITIONS = {
  'Pending Approval': [],
  Open: ['In Progress', 'Rejected'],
  'In Progress': ['Waiting', 'Done', 'Rejected'],
  Waiting: ['In Progress', 'Done'],
  Done: ['In Progress'],
  Rejected: ['Open'],
}
