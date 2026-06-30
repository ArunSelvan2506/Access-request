// Values mirrored from the real Fuse Energy "Access Management" (IAM) Jira
// service desk so the tool behaves like the actual portal.

// Jira "Pending reason" select — captured when a ticket moves to Waiting.
export const PENDING_REASONS = [
  'More info required',
  'Awaiting approval',
  'Waiting on vendor',
  'Pending on change request',
]

// Jira "Urgency" select — optional triage field on a request.
export const URGENCY_OPTIONS = ['Critical', 'High', 'Medium', 'Low']
export const DEFAULT_URGENCY = 'Medium'
