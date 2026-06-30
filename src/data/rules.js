// Automation rules shown on the Automations screen. `on` is the default state;
// toggling is held in component state. Rule index 0 (auto-reject incomplete) is
// read by the validation engine to decide the message it shows.
export const RULES = [
  { ic: '🚫', bg: 'var(--red-bg)', on: true, name: 'Auto-reject incomplete tickets', desc: "On create — if any required field for the chosen application is empty or fails validation, transition the ticket straight to Rejected with the catalog's reject reason. No manual review.", log: 'Triggered on every create' },
  { ic: '🧭', bg: 'var(--blue-bg)', on: true, name: 'Route non-IT applications', desc: 'On create — applications not managed by IT (Figma, Adobe, Navan, Backoffice…) are blocked from the queue and the requester is shown the correct Slack/contact channel.', log: 'Blocks 10 applications' },
  { ic: '⏱️', bg: 'var(--yellow-bg)', on: true, name: 'SLA breach escalation', desc: 'When a ticket passes 75% of its SLA target, flag it as SLA at risk on the dashboard; on breach, raise priority and notify @ops-permission-managers.', log: 'Checks every open ticket live' },
  { ic: '🔗', bg: 'var(--purple-bg)', on: true, name: 'Require Linear ticket (AI tools)', desc: 'On create — Cursor and Claude requests without a valid Linear reference are auto-rejected. Claude Code additionally requires access type = developer/quant.', log: 'Applies to Cursor, Claude' },
  { ic: '💰', bg: 'var(--green-bg)', on: true, name: 'Finance gate — JetBrains', desc: 'On create — JetBrains tickets without a Finance approval reference are auto-rejected before reaching IT.', log: 'Applies to JetBrains' },
  { ic: '📸', bg: 'var(--bg)', on: false, name: 'AWS screenshot reminder', desc: 'On create — if an AWS ticket is missing a screenshot, post a comment asking the requester to attach one before auto-rejecting.', log: 'Currently disabled' },
  { ic: '💬', bg: 'var(--blue-bg)', on: false, name: 'Slack notifications', desc: 'Posts to the #access-request Slack channel when a request is created or changes status (incl. rejected/resolved). Runs server-side via a Cloud Function + Slack incoming webhook.', log: 'Needs backend — inactive until Firebase + Slack webhook are configured' },
]
