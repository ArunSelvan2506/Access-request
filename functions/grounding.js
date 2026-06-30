// Builds the AI grounding document from live ticket data. This is the core of
// the "grounding auto-populates from ticket create/close state" requirement:
// every time a ticket is created or transitions to Done/Rejected, the trigger
// in index.js calls buildGrounding(tickets) and stores the result. The chat
// function then feeds it to the model, so the assistant always answers from
// current reality without anyone editing code.
const OPEN = ['Open', 'In Progress', 'Waiting']

function buildGrounding(tickets) {
  const total = tickets.length
  const byStatus = {}
  const byApp = {}
  for (const t of tickets) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1
    byApp[t.app] = byApp[t.app] || { open: 0, done: 0, rejected: 0 }
    if (OPEN.includes(t.status)) byApp[t.app].open++
    else if (t.status === 'Done') byApp[t.app].done++
    else if (t.status === 'Rejected') byApp[t.app].rejected++
  }

  const openCount = OPEN.reduce((n, s) => n + (byStatus[s] || 0), 0)

  // Most common rejection reasons (learns what trips people up).
  const rejReasons = {}
  for (const t of tickets) {
    if (t.status === 'Rejected') {
      const r = (t.rejectReason || 'Unspecified').trim()
      rejReasons[r] = (rejReasons[r] || 0) + 1
    }
  }
  const topRejections = Object.entries(rejReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([r, n]) => `${r} (${n}×)`)

  // Average resolution time for Done tickets (created → last activity).
  const doneTimes = tickets
    .filter((t) => t.status === 'Done' && Array.isArray(t.activity) && t.activity.length)
    .map((t) => t.activity[t.activity.length - 1].tm - t.created)
    .filter((ms) => ms > 0)
  const avgHrs = doneTimes.length
    ? (doneTimes.reduce((a, b) => a + b, 0) / doneTimes.length / 36e5).toFixed(1)
    : null

  const appLines = Object.entries(byApp)
    .filter(([, c]) => c.open + c.done + c.rejected > 0)
    .sort((a, b) => b[1].open - a[1].open)
    .map(([app, c]) => `- ${app}: ${c.open} open, ${c.done} resolved, ${c.rejected} rejected`)

  return [
    'LIVE TICKET ACTIVITY (auto-generated — reflects the current state of the service desk):',
    `- Total requests on record: ${total}`,
    `- Currently open (Open/In Progress/Waiting): ${openCount}`,
    `- Resolved (Done): ${byStatus['Done'] || 0}; Rejected: ${byStatus['Rejected'] || 0}`,
    avgHrs ? `- Average resolution time for resolved tickets: ~${avgHrs}h` : null,
    topRejections.length ? `- Most common rejection reasons: ${topRejections.join(', ')}` : null,
    appLines.length ? 'Per-application breakdown:' : null,
    ...appLines,
  ]
    .filter(Boolean)
    .join('\n')
}

module.exports = { buildGrounding }
