// Server-side copy of the access rules, mirroring src/data/catalog.js.
// SOURCE OF TRUTH: Notion — "Access Request — Field Validation Requirements by
// Application" (https://app.notion.com/p/349700034a5c81e4b551e80f0422ceba).
// Keep this in sync with the client catalog when policy changes.
const CATALOG = [
  { name: 'AWS', managed: true, sla: 8, required: ['Specific resource or permission', 'Issue description', 'AWS region', 'Screenshot attached', 'Business justification'], reject: 'Missing resource detail or screenshot', note: 'General AWS access is automatic via Google Groups; only raise a ticket for a specific resource.' },
  { name: 'Datadog', managed: true, sla: 8, required: ['Permission level required', 'Business justification', 'Linear ticket reference'], reject: 'Missing justification', note: 'Eng/Ops/Trading get read-only automatically via Google SSO; only raise for elevated permissions.' },
  { name: 'Metabase', managed: true, sla: 8, required: ['Table/dashboard/dataset name', 'Business justification'], reject: 'Missing table name', note: 'Role-based and automatic; only raise for a specific table, dashboard or dataset.' },
  { name: 'GitHub', managed: true, sla: 8, required: ['Valid GitHub username containing your name', 'Business justification'], reject: 'Invalid / unidentifiable username', note: 'Invalid, missing or unidentifiable usernames are auto-rejected. No exceptions.' },
  { name: 'ChatGPT', managed: true, sla: 8, required: ['Description of the issue'], reject: 'Raised without a real issue', note: 'Automatic via Google SSO; only raise for a genuine login issue (try typing email as username/password first).' },
  { name: 'Cursor', managed: true, sla: 8, required: ['Linear ticket reference', 'Business justification'], reject: 'Missing Linear ticket', note: 'Per-request only; requests without a Linear ticket are rejected.' },
  { name: 'Claude', managed: true, sla: 8, required: ['Linear ticket reference', 'Access type', 'Business justification'], reject: 'Missing Linear ticket', note: 'Per-request only. Claude Code is restricted to developers and quants only.' },
  { name: 'Microsoft', managed: true, sla: 16, required: ['Why Google Workspace is insufficient', 'Microsoft product & access level'], reject: 'Weak/missing justification', note: 'Granted only when Google Workspace cannot support the task.' },
  { name: 'Bitwarden', managed: true, sla: 8, required: ['Exact vault/collection name', 'Business justification'], reject: 'Missing vault name', note: 'General access is automatic via onboarding; only raise for a specific vault or if 24h have passed.' },
  { name: 'Google Shared Drive', managed: true, sla: 8, required: ['Exact Shared Drive name', 'Business justification'], reject: 'Missing drive name', note: 'Check the Shared Drive guidance page to find who manages the drive first.' },
  { name: 'Google Voice', managed: true, sla: 16, required: ['Business use case', 'Length of time required'], reject: 'Missing duration' },
  { name: 'Google Groups', managed: true, sla: 8, required: ['Group name', 'Confirmation not already a member'], reject: 'Already a member', note: 'Confirm you are not already a member at groups.google.com first.' },
  { name: 'Google Account Reset / 2FA', managed: true, sla: 4, required: ['Type of issue', 'Affected account email'], reject: 'Missing account details' },
  { name: 'JetBrains', managed: true, sla: 24, required: ['Finance approval reference', 'Licence type required'], reject: 'Missing Finance approval', note: 'Finance approval is mandatory before IT can act.' },
  { name: 'Social Media', managed: true, sla: 16, required: ['Business reason', 'Line manager approval'], reject: 'Missing manager approval', note: 'Line manager approval is mandatory and must be included.' },
  { name: 'Backoffice', managed: false, route: 'Post in #access-request and tag @ops-permission-managers.' },
  { name: 'Navan', managed: false, route: 'Contact Hongyi or Manuel (Finance) directly.' },
  { name: 'GES / ECOES', managed: false, route: 'Post in #access-request, include your email address (required for setup).' },
  { name: 'TMA', managed: false, route: 'Post in #access-request, tag @installs-third-liners. Background check required.' },
  { name: 'Figma', managed: false, route: 'Message Rory Keohane (Design) directly.' },
  { name: 'Adobe', managed: false, route: 'Email rory@fuseenergy.com (Design).' },
  { name: 'Docusign', managed: false, route: 'Contact Wei Sheng Neo or Deepu (Legal/Compliance).' },
  { name: 'LinkedIn Premium', managed: false, route: 'Contact Laura (People) directly.' },
  { name: 'Deliveroo', managed: false, route: 'Contact Labib (People) directly.' },
  { name: 'Devbox', managed: false, route: 'Post in #access-request, tag or contact Roman directly.' },
]

function buildCatalogKB() {
  return CATALOG.map((a) => {
    if (!a.managed)
      return `${a.name}: NOT IT-managed — do not raise a Jira ticket (auto-rejected). How to request: ${a.route}`
    return `${a.name}: IT-managed, raise a Jira ticket. SLA target ${a.sla}h. Required fields: ${a.required.join('; ')}. Auto-reject trigger: ${a.reject}.${a.note ? ' Note: ' + a.note : ''}`
  }).join('\n')
}

module.exports = { CATALOG, buildCatalogKB }
