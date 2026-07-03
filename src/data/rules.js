// Automation rules shown on the Automations screen. `on` is the default state;
// toggling is held in component state. Rule index 0 (auto-reject incomplete) is
// read by the validation engine to decide the message it shows.
export const RULES = [
  { ic: '🚫', bg: 'var(--red-bg)', on: true, name: 'Auto-reject incomplete tickets', desc: "On create — if any required field for the chosen application is empty or fails validation, transition the ticket straight to Rejected with the catalog's reject reason. No manual review.", log: 'Triggered on every create' },
  { ic: '🧭', bg: 'var(--blue-bg)', on: true, name: 'Route non-IT applications', desc: 'On create — applications not managed by IT (Figma, Adobe, Navan, Backoffice…) are blocked from the queue and the requester is shown the correct Slack/contact channel.', log: 'Blocks 10 applications' },
  { ic: '⏱️', bg: 'var(--yellow-bg)', on: true, name: 'SLA breach escalation', desc: 'When a ticket passes 75% of its SLA target, flag it as SLA at risk on the dashboard; on breach, raise priority and notify @ops-permission-managers.', log: 'Checks every open ticket live' },
  { ic: '🔗', bg: 'var(--purple-bg)', on: true, name: 'Require Linear ticket (AI tools)', desc: 'On create — Cursor and Claude requests without a valid Linear reference are auto-rejected. Claude Code additionally requires access type = developer/quant.', log: 'Applies to Cursor, Claude' },
  { ic: '💰', bg: 'var(--green-bg)', on: true, name: 'Finance gate — JetBrains', desc: 'On create — JetBrains tickets without a Finance approval reference are auto-rejected before reaching IT.', log: 'Applies to JetBrains' },
  { ic: '🧑‍💻', bg: 'var(--blue-bg)', on: true, name: 'Auto-assign AWS to David', desc: 'On create — AWS requests are automatically assigned to David so they land with the right owner.', log: 'Applies to AWS' },
  { ic: '📸', bg: 'var(--bg)', on: false, name: 'AWS screenshot reminder', desc: 'On create — if an AWS ticket is missing a screenshot, post a comment asking the requester to attach one before auto-rejecting.', log: 'Currently disabled' },
  { ic: '💬', bg: 'var(--blue-bg)', on: false, name: 'Slack notifications', desc: 'Posts to the #access-request Slack channel when a request is created or changes status (incl. rejected/resolved). Runs server-side via a Cloud Function + Slack incoming webhook.', log: 'Needs backend — inactive until Firebase + Slack webhook are configured' },
]

// Proactive automations we can switch on (not yet built). Shown to admins as
// suggestions on the Automations screen.
export const PROPOSED = [
  { ic: '🔁', bg: 'var(--blue-bg)', name: 'Auto-assign (on-call / round-robin)', desc: 'Route new requests to the on-call administrator automatically, instead of leaving them unassigned.', log: 'Would run on every new request' },
  { ic: '💤', bg: 'var(--yellow-bg)', name: 'Stale-ticket nudges', desc: 'Ping the owner when a request sits in Waiting or unassigned beyond a set number of days.', log: 'Would run daily' },
  { ic: '📅', bg: 'var(--green-bg)', name: 'Access-expiry reminders', desc: 'Email the requester and their manager a few days before time-bound access expires, to renew or revoke it.', log: 'Would run daily' },
  { ic: '🔐', bg: 'var(--purple-bg)', name: 'Periodic access reviews', desc: 'Schedule recurring re-certification of standing access so entitlements don’t drift over time.', log: 'Would run on a schedule' },
  { ic: '🧹', bg: 'var(--bg)', name: 'Auto-archive resolved', desc: 'Move tickets that have been Done for N days into an archive to keep the queues and board clean.', log: 'Would run daily' },
]
