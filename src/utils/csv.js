const esc = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

// Export a list of tickets to a CSV file download (pure client-side).
export function exportTicketsCsv(tickets, filename = 'access-requests.csv') {
  const cols = ['Key', 'Application', 'Summary', 'Requester', 'Department', 'Role', 'Status', 'Urgency', 'Assignee', 'SLA (h)', 'Submitted']
  const rows = tickets.map((t) => [
    t.key,
    t.app,
    t.summary,
    t.requester,
    t.department || '',
    t.role || '',
    t.status,
    t.urgency || '',
    t.assignee || '',
    t.sla,
    new Date(t.created).toISOString(),
  ])
  const csv = [cols, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
