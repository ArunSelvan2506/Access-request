import { slaForUrgency } from './jira'
import { assigneeFor } from './catalog'

// Realistic demo dataset reflecting the real IT/Security desk mix (no personal
// names — role-based requesters). Generated from a compact table so it stays
// readable. Timestamps are relative to load time so SLA timers look live.
const ROLES = [
  ['Platform Engineer', 'eng1@fuseenergy.com', 'Engineering'],
  ['Data Analyst', 'analyst2@fuseenergy.com', 'Data'],
  ['Quant Researcher', 'quant3@fuseenergy.com', 'Trading'],
  ['Ops Engineer', 'ops4@fuseenergy.com', 'Operations'],
  ['Support Agent', 'support5@fuseenergy.com', 'Support'],
  ['New Starter', 'new.starter@fuseenergy.com', 'Engineering'],
  ['Trading Analyst', 'trading6@fuseenergy.com', 'Trading'],
  ['Backend Engineer', 'eng7@fuseenergy.com', 'Engineering'],
]

// Minimal-but-valid fields per app (keys match the catalog so the drawer labels them).
const FIELDS = {
  GitHub: { username: 'eng-user-fuse', just: 'Push access to the billing service repo' },
  AWS: { resource: 'S3 bucket fuse-data-exports', issue: 'Access denied listing objects', region: 'eu-west-2', screenshot: 'Yes — attached', just: 'Monthly reconciliation exports' },
  Claude: { linear: 'ENG-1201', type: 'Claude Code (devs/quants only)', just: 'AI-assisted development' },
  Cursor: { linear: 'ENG-1188', just: 'Primary IDE for the platform project' },
  Metabase: { table: 'finance.revenue_daily', just: 'Revenue reporting' },
  Datadog: { perm: 'Write/admin on dashboards', just: 'On-call monitor maintenance', linear: 'OPS-3310' },
  Bitwarden: { vault: 'Payments service vault', just: 'Service credentials' },
  Microsoft: { why: 'Excel macros unsupported in Google Sheets', product: 'Excel desktop' },
  'Google Shared Drive': { drive: 'Finance Shared Drive', just: 'Month-end close' },
  GeminiAI: { just: 'Evaluating models for a project' },
  ChatGPT: { issue: 'SSO login loop after password change' },
  JetBrains: { finance: 'FIN-APP-77', licence: 'PyCharm Professional' },
  'Hardware / Device': { device: 'MacBook Pro 14"', reason: 'New starter kit', location: 'London HQ' },
  'Account Onboarding / Offboarding': { type: 'Onboarding (new starter)', role: 'Data Analyst, Trading', date: '2026-07-14' },
  'Password / MFA Reset': { system: 'Google Workspace', issue: 'MFA / 2FA reset' },
  'Software Installation': { software: 'Docker Desktop', device: 'LAP-204', just: 'Local development' },
  'Email / Distribution List': { type: 'Distribution list', name: 'trading-alerts@fuseenergy.com', just: 'Team alerting' },
  'Phone / Mobile / SIM': { type: 'New SIM', just: 'Replacement SIM for work mobile' },
  'Network / VPN': { issue: 'VPN disconnects every few minutes', location: 'London HQ' },
}

// [num, app, summary, status, urgency, hoursAgo, extra?]
const ROWS = [
  // ---- Resolved / historical (with a couple of expiring grants) ----
  [101, 'GitHub', 'GitHub org access for new starter', 'Done', 'Medium', 2],
  [102, 'AWS', 'S3 read access — fuse-data-exports', 'Done', 'High', 4],
  [105, 'Metabase', 'Access to revenue dashboard', 'Done', 'Medium', 50],
  [107, 'GitHub', 'Write access to billing-service repo', 'Done', 'Medium', 70],
  [113, 'Hardware / Device', 'New laptop for joiner', 'Done', 'High', 5],
  [142, 'AWS', 'Redshift cluster access', 'Done', 'High', 9],
  [143, 'Google Shared Drive', 'Legal shared drive access', 'Done', 'Low', 430, { expiresIn: 9, duration: '90 days' }],
  [144, 'Bitwarden', 'SRE secrets collection', 'Done', 'Medium', 450, { expiresIn: -3, duration: '90 days' }],
  [154, 'Metabase', 'Marketing dashboard access', 'Done', 'Low', 510, { expiresIn: 25, duration: '90 days' }],
  // ---- Rejected / cancelled ----
  [104, 'Cursor', 'Cursor licence — platform team', 'Rejected', 'Low', 30, { rejectReason: 'Missing Linear ticket reference' }],
  [118, 'GitHub', 'Fork access for vendor repo', 'Rejected', 'Low', 40, { rejectReason: 'Invalid / unidentifiable username' }],
  [139, 'Microsoft', 'Power BI desktop', 'Rejected', 'Low', 55, { rejectReason: 'Weak/missing justification' }],
  [124, 'GitHub', 'Org access — contractor', 'Cancelled', 'Low', 60],
  // ---- Awaiting line-manager approval ----
  [103, 'Claude', 'Claude Code for quant research', 'Pending Approval', 'High', 3, { manager: 'line-manager@fuseenergy.com' }],
  [110, 'Bitwarden', 'Payments vault access', 'Pending Approval', 'High', 8, { manager: 'eng-lead@fuseenergy.com' }],
  [117, 'JetBrains', 'PyCharm Pro licence', 'Pending Approval', 'Medium', 10, { manager: 'finance-approver@fuseenergy.com' }],
  [155, 'AWS', 'Athena workgroup access', 'Pending Approval', 'High', 7, { manager: 'line-manager@fuseenergy.com' }],
  // ---- Waiting on more info / vendor ----
  [108, 'Microsoft', 'Excel desktop licence', 'Waiting', 'Low', 12, { pendingReason: 'Awaiting approval' }],
  // ---- In progress ----
  [149, 'Account Onboarding / Offboarding', 'Offboard leaver — last day Friday', 'In Progress', 'Critical', 6],
  // ---- Open (a few older, plus this week's fresh queue) ----
  [137, 'GitHub', 'Org access for new grad', 'Open', 'Medium', 1],
  [148, 'Hardware / Device', 'External monitor request', 'Open', 'Low', 2],
  // ---- This week — fresh requests awaiting review ----
  [156, 'Password / MFA Reset', 'Locked out after password change', 'Open', 'Critical', 1],
  [157, 'AWS', 'S3 write access — fuse-data-exports', 'Open', 'High', 3],
  [158, 'Claude', 'Claude Code for new quant hire', 'Pending Approval', 'High', 4, { manager: 'line-manager@fuseenergy.com' }],
  [159, 'Datadog', 'Elevated Datadog access for incident', 'Pending Approval', 'High', 8, { manager: 'eng-lead@fuseenergy.com' }],
  [160, 'Metabase', 'Finance close dashboard access', 'Waiting', 'Medium', 12, { pendingReason: 'More info required' }],
  [161, 'Hardware / Device', 'Replacement laptop — cracked screen', 'In Progress', 'Medium', 20],
  [162, 'Account Onboarding / Offboarding', 'Onboard two support hires — start Monday', 'Open', 'High', 26],
  [163, 'GitHub', 'Write access to payments-service repo', 'Open', 'Medium', 30],
  [164, 'Network / VPN', 'VPN keeps disconnecting', 'Open', 'High', 5],
]

export function seedTickets() {
  const now = Date.now()
  const H = 36e5
  return ROWS.map((r, i) => {
    const [num, app, summary, status, urgency, hoursAgo, extra = {}] = r
    const [requester, requesterEmail, department] = ROLES[i % ROLES.length]
    const created = now - hoursAgo * H
    const ticket = {
      num,
      key: 'ACC-' + num,
      app,
      summary,
      requester,
      requesterEmail,
      department,
      role: requester,
      urgency,
      status,
      created,
      sla: slaForUrgency(urgency),
      fields: FIELDS[app] || { just: 'Business need' },
      assignee: assigneeFor(app),
      activity: [],
      ...extra,
    }
    if (status === 'Pending Approval' && extra.manager) {
      ticket.approval = { state: 'Pending', by: null, at: null, note: null }
    }
    if (extra.expiresIn != null) {
      ticket.expiresAt = now + extra.expiresIn * 864e5
      ticket.duration = extra.duration || '90 days'
      delete ticket.expiresIn
    }
    return ticket
  })
}
