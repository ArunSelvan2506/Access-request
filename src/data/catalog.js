// ================= SERVICE CATALOG =================
// SOURCE OF TRUTH: Notion — "✅ Access Request — Field Validation Requirements
// by Application". The required fields, auto-reject triggers and IT-managed vs.
// Slack/contact-only routing below are kept in sync with that page. When the
// Notion page changes, update this file to match (it is the one place the whole
// app reads its rules from).
export const NOTION_SOURCE =
  'https://app.notion.com/p/349700034a5c81e4b551e80f0422ceba'
//
// The applications IT manages (group "green") plus the ones that are NOT
// IT-managed (group "red"). The validation engine and the AI assistant both
// read from this catalog, so adding/editing an entry here is all that's needed
// to change required fields, SLA targets and routing. (SLA targets come from the
// service-desk policy, not the Notion validation page.)
//
// Field shape:
//   { k, label, req, type?, hint?, def?, opts?, validate? }
//     k        - key used in the ticket's `fields` object
//     type     - "textarea" | "select" | undefined (plain text input)
//     validate - (value) => string | null   (null = valid, string = error msg)

const ic = (l, bg, tx) => ({ l, bg, tx })

export const CATALOG = [
  {
    name: 'AWS', group: 'green', ic: ic('AW', '#fff4e5', '#974f0c'), sla: 8,
    callout: { t: 'warn', x: '⚠️ General AWS access is automatic via Google Groups. Only raise a ticket for a specific resource, role or service not already provisioned.' },
    reject: 'Missing resource detail or screenshot',
    fields: [
      { k: 'resource', label: 'Specific resource or permission', req: true, hint: 'Exact name — e.g. S3 bucket, IAM role, Lambda function' },
      { k: 'issue', label: 'Issue description', req: true, type: 'textarea', hint: 'e.g. permission denied, missing role, resource not visible' },
      { k: 'region', label: 'AWS region', req: true, hint: 'eu-west-2 unless otherwise justified', def: 'eu-west-2' },
      { k: 'screenshot', label: 'Screenshot attached?', req: true, type: 'select', opts: ['Yes — attached', 'No'], hint: 'A ticket without a screenshot is auto-rejected' },
      { k: 'just', label: 'Business justification', req: true, type: 'textarea' },
    ],
  },
  {
    name: 'Datadog', group: 'green', ic: ic('DD', '#f3f0ff', '#5e4db2'), sla: 8,
    callout: { t: 'warn', x: '⚠️ Eng, Ops & Trading get read-only automatically via Google SSO. Only raise a ticket for elevated permissions.' },
    reject: 'Missing justification',
    fields: [
      { k: 'perm', label: 'Permission level required', req: true, hint: 'What you need beyond read-only' },
      { k: 'just', label: 'Business justification', req: true, type: 'textarea', hint: 'Why your role requires elevated access' },
      { k: 'linear', label: 'Linear ticket reference', req: true, hint: 'e.g. ENG-1234' },
    ],
  },
  {
    name: 'Metabase', group: 'green', ic: ic('MB', '#e9f2ff', '#0055cc'), sla: 8,
    callout: { t: 'warn', x: '⚠️ Role-based and assigned automatically. Only raise a ticket for a specific table, dashboard or dataset.' },
    reject: 'Missing table name',
    fields: [
      { k: 'table', label: 'Table / dashboard / dataset name', req: true, hint: 'Exact name' },
      { k: 'just', label: 'Business justification', req: true, type: 'textarea' },
    ],
  },
  {
    name: 'GitHub', group: 'green', ic: ic('GH', '#172b4d', '#fff'), sla: 8,
    callout: { t: 'crit', x: '🔴 Tickets with an invalid, missing or unidentifiable GitHub username are auto-rejected. No exceptions.' },
    reject: 'Invalid / unidentifiable username',
    fields: [
      { k: 'username', label: 'GitHub username', req: true, hint: 'Must contain your name — e.g. sarah-chen-fuse, not coder99', validate: (v) => (/^[a-z0-9-]{3,}$/i.test(v) && !/^(coder|user|dev|test)\d*$/i.test(v) ? null : 'Username must be valid and identifiable as your account') },
      { k: 'just', label: 'Business justification', req: true, type: 'textarea', hint: 'Why you need the Fuse Energy GitHub org' },
    ],
  },
  {
    // Mirrored from the Jira "Application name" list (not in the Notion page).
    name: 'GeminiAI', group: 'green', ic: ic('GM', '#f3f0ff', '#5e4db2'), sla: 8,
    callout: { t: 'warn', x: '⚠️ Per-request access. Provide a clear business justification for Gemini AI.' },
    reject: 'Missing justification',
    fields: [
      { k: 'just', label: 'Business justification', req: true, type: 'textarea', hint: 'Why Gemini AI is required for your work' },
    ],
  },
  {
    name: 'ChatGPT', group: 'green', ic: ic('GP', '#dcfff1', '#216e4e'), sla: 8,
    callout: { t: 'warn', x: '⚠️ Automatic via Google SSO. Known fix: type your email as username/password first, then SSO completes. Only raise a ticket for a genuine login issue.' },
    reject: 'Raised without a real issue',
    fields: [
      { k: 'issue', label: 'Description of the issue', req: true, type: 'textarea', hint: 'Specific error or problem encountered' },
    ],
  },
  {
    name: 'Cursor', group: 'green', ic: ic('CU', '#172b4d', '#fff'), sla: 8,
    callout: { t: 'crit', x: '🔴 Per-request only. Requests without a Linear ticket are rejected.' },
    reject: 'Missing Linear ticket',
    fields: [
      { k: 'linear', label: 'Linear ticket reference', req: true, hint: 'Confirms Cursor is required for your project' },
      { k: 'just', label: 'Business justification', req: true, type: 'textarea', hint: 'Why Cursor is necessary — not just convenient' },
    ],
  },
  {
    name: 'Claude', group: 'green', ic: ic('CL', '#fff4e5', '#974f0c'), sla: 8,
    callout: { t: 'crit', x: '🔴 Per-request only. Claude Code is restricted to developers and quants. No Linear ticket = rejected.' },
    reject: 'Missing Linear ticket',
    fields: [
      { k: 'linear', label: 'Linear ticket reference', req: true },
      { k: 'type', label: 'Access type', req: true, type: 'select', opts: ['Standard Claude', 'Claude Code (devs/quants only)'] },
      { k: 'just', label: 'Business justification', req: true, type: 'textarea' },
    ],
  },
  {
    name: 'Microsoft', group: 'green', ic: ic('MS', '#e9f2ff', '#0055cc'), sla: 16,
    callout: { t: 'warn', x: '⚠️ Granted only when Google Workspace can\'t support the task. Weak justification = rejected.' },
    reject: 'Weak/missing justification',
    fields: [
      { k: 'why', label: 'Why Google Workspace is insufficient', req: true, type: 'textarea', hint: 'Specific reason — not preference' },
      { k: 'product', label: 'Microsoft product & access level', req: true },
    ],
  },
  {
    name: 'Bitwarden', group: 'green', ic: ic('BW', '#e9f2ff', '#0055cc'), sla: 8,
    callout: { t: 'warn', x: '⚠️ General access is automatic via onboarding invite. Only raise a ticket for a specific vault/collection or if 24h have passed.' },
    reject: 'Missing vault name',
    fields: [
      { k: 'vault', label: 'Exact vault / collection name', req: true, hint: 'Precise name — not a description' },
      { k: 'just', label: 'Business justification', req: true, type: 'textarea' },
    ],
  },
  {
    name: 'Google Shared Drive', group: 'green', ic: ic('GD', '#dcfff1', '#216e4e'), sla: 8,
    callout: { t: 'warn', x: '⚠️ Check the Shared Drive guidance page to find who manages the drive first.' },
    reject: 'Missing drive name',
    fields: [
      { k: 'drive', label: 'Exact Shared Drive name', req: true },
      { k: 'just', label: 'Business justification', req: true, type: 'textarea' },
    ],
  },
  {
    name: 'Google Voice', group: 'green', ic: ic('GV', '#dcfff1', '#216e4e'), sla: 16, reject: 'Missing duration',
    fields: [
      { k: 'usecase', label: 'Business use case', req: true, type: 'textarea' },
      { k: 'duration', label: 'Length of time required', req: true, hint: 'Permanent or a specific period' },
    ],
  },
  {
    name: 'Google Groups', group: 'green', ic: ic('GG', '#dcfff1', '#216e4e'), sla: 8,
    callout: { t: 'warn', x: '⚠️ Confirm you\'re not already a member at groups.google.com first.' },
    reject: 'Already a member',
    fields: [
      { k: 'group', label: 'Group name', req: true },
      { k: 'confirm', label: 'Confirmed not already a member?', req: true, type: 'select', opts: ['Yes — checked groups.google.com', 'No'] },
    ],
  },
  {
    name: 'Google Account Reset / 2FA', group: 'green', ic: ic('2F', '#dcfff1', '#216e4e'), sla: 4, reject: 'Missing account details',
    fields: [
      { k: 'type', label: 'Type of issue', req: true, type: 'select', opts: ['Account recovery', 'Password reset', '2FA reset / issue'] },
      { k: 'email', label: 'Affected account email', req: true, validate: (v) => (/.+@.+\..+/.test(v) ? null : 'Enter a valid email') },
    ],
  },
  {
    name: 'JetBrains', group: 'green', ic: ic('JB', '#f3f0ff', '#5e4db2'), sla: 24,
    callout: { t: 'crit', x: '🔴 Finance approval is mandatory before IT can act. No approval reference = auto-rejected.' },
    reject: 'Missing Finance approval',
    fields: [
      { k: 'finance', label: 'Finance approval reference', req: true, hint: 'Written confirmation from Finance' },
      { k: 'licence', label: 'Licence type required', req: true, hint: 'Which JetBrains product & tier' },
    ],
  },
  {
    name: 'Social Media', group: 'green', ic: ic('SM', '#fff4e5', '#974f0c'), sla: 16,
    callout: { t: 'warn', x: '⚠️ Line manager approval is mandatory and must be included — not just mentioned.' },
    reject: 'Missing manager approval',
    fields: [
      { k: 'reason', label: 'Business reason', req: true, type: 'textarea', hint: 'e.g. content posting, analytics, campaigns' },
      { k: 'approval', label: 'Line manager approval', req: true, hint: 'Name of approving manager + confirmation' },
    ],
  },
  // not IT-managed
  { name: 'Backoffice', group: 'red', ic: ic('BO', '#ffeceb', '#ae2a19'), route: 'Post in #access-request and tag @ops-permission-managers.' },
  { name: 'Navan', group: 'red', ic: ic('NV', '#ffeceb', '#ae2a19'), route: 'Contact Hongyi or Manuel (Finance) directly.' },
  { name: 'GES / ECOES', group: 'red', ic: ic('GE', '#ffeceb', '#ae2a19'), route: 'Post in #access-request, include your email address (required for setup).' },
  { name: 'TMA', group: 'red', ic: ic('TM', '#ffeceb', '#ae2a19'), route: 'Post in #access-request, tag @installs-third-liners. Background check required.' },
  { name: 'Figma', group: 'red', ic: ic('FG', '#ffeceb', '#ae2a19'), route: 'Message Rory Keohane (Design) directly.' },
  { name: 'Adobe', group: 'red', ic: ic('AD', '#ffeceb', '#ae2a19'), route: 'Email rory@fuseenergy.com (Design).' },
  { name: 'Docusign', group: 'red', ic: ic('DS', '#ffeceb', '#ae2a19'), route: 'Contact Wei Sheng Neo or Deepu (Legal/Compliance).' },
  { name: 'LinkedIn Premium', group: 'red', ic: ic('LI', '#ffeceb', '#ae2a19'), route: 'Contact Laura (People) directly.' },
  { name: 'Deliveroo', group: 'red', ic: ic('DL', '#ffeceb', '#ae2a19'), route: 'Contact Labib (People) directly.' },
  { name: 'Devbox', group: 'red', ic: ic('DV', '#ffeceb', '#ae2a19'), route: 'Post in #access-request, tag or contact Roman directly.' },
]

export const findApp = (n) => CATALOG.find((a) => a.name === n)

// Self-contained per-application icons (emoji, so no external assets / offline-safe).
// Rendered inside the coloured app tile; falls back to the 2-letter code if missing.
export const APP_EMOJI = {
  AWS: '☁️',
  Datadog: '🐕',
  Metabase: '📊',
  GitHub: '🐙',
  GeminiAI: '✨',
  ChatGPT: '💬',
  Cursor: '⌨️',
  Claude: '✴️',
  Microsoft: '🪟',
  Bitwarden: '🔐',
  'Google Shared Drive': '📁',
  'Google Voice': '☎️',
  'Google Groups': '👥',
  'Google Account Reset / 2FA': '🔑',
  JetBrains: '🛠️',
  'Social Media': '📣',
  Backoffice: '🏢',
  Navan: '✈️',
  'GES / ECOES': '⚡',
  TMA: '🔧',
  Figma: '🎨',
  Adobe: '🖌️',
  Docusign: '✍️',
  'LinkedIn Premium': '💼',
  Deliveroo: '🛵',
  Devbox: '📦',
}
