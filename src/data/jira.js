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

// Requester context captured on every request so reviewers can see who's
// asking and judge appropriateness before acting.
export const DEPARTMENTS = [
  'Engineering', 'Data', 'Trading', 'Operations', 'Finance', 'People (HR)',
  'Design', 'Support', 'Compliance / Legal', 'Marketing', 'Other',
]

// Time-bound (expiring) access options.
export const DURATION_OPTIONS = ['Permanent', '30 days', '60 days', '90 days', '6 months', '1 year']
export const DEFAULT_DURATION = 'Permanent'
const DURATION_DAYS = { '30 days': 30, '60 days': 60, '90 days': 90, '6 months': 182, '1 year': 365 }
export const durationDays = (d) => DURATION_DAYS[d] || null

