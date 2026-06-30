import { API_BASE, API_KEY } from '../config'

// Mention email notifications go through the server (it holds SES creds).
const headers = { 'Content-Type': 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) }

let _statusPromise
export function notifyStatus() {
  if (!_statusPromise) {
    _statusPromise = fetch(API_BASE + '/api/notify/status', { headers })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .catch(() => ({ enabled: false }))
  }
  return _statusPromise
}

// Fire-and-forget: email everyone tagged in a comment. Never throws to the
// caller — a notification failure must not break posting the comment.
export function notifyMention({ ticketKey, summary, actor, text, recipients }) {
  return fetch(API_BASE + '/api/notify/mention', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ticketKey, summary, actor, text, recipients }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
}
