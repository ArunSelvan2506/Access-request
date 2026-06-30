// Initial demo tickets, used the first time the app runs (before anything is
// saved to localStorage). `created` timestamps are relative to load time so the
// SLA timers always look realistic.
export function seedTickets() {
  const now = Date.now()
  const H = 36e5 // one hour in ms
  return [
    { num: 101, key: 'ACC-101', app: 'GitHub', summary: 'GitHub org access for new starter', requester: 'Priya Nair', status: 'In Progress', created: now - 5 * H, sla: 8, fields: { username: 'priya-nair-fuse', just: 'Need to push to the billing service repo.' }, activity: [] },
    { num: 102, key: 'ACC-102', app: 'AWS', summary: 'S3 read access — fuse-data-exports', requester: 'Tom Reilly', status: 'Open', created: now - 1.5 * H, sla: 8, fields: { resource: 'S3 bucket fuse-data-exports', issue: 'Access denied listing objects', region: 'eu-west-2', screenshot: 'Yes — attached', just: 'Pulling export files for the monthly recon.' }, activity: [] },
    { num: 103, key: 'ACC-103', app: 'Cursor', summary: 'Cursor licence for platform team', requester: 'Marco Bianchi', status: 'Rejected', created: now - 30 * H, sla: 8, fields: { just: 'Would be handy.' }, rejectReason: 'Missing Linear ticket reference', activity: [] },
    { num: 104, key: 'ACC-104', app: 'Claude', summary: 'Claude Code for quant research', requester: 'Sarah Chen', status: 'Waiting', created: now - 12 * H, sla: 8, fields: { linear: 'QUANT-882', type: 'Claude Code (devs/quants only)', just: 'Backtesting tooling.' }, activity: [] },
    { num: 105, key: 'ACC-105', app: 'JetBrains', summary: 'PyCharm Pro licence', requester: 'Dan Okafor', status: 'Done', created: now - 50 * H, sla: 24, fields: { finance: 'FIN-APP-451', licence: 'PyCharm Professional' }, activity: [] },
  ]
}
