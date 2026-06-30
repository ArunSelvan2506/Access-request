import { API_BASE, API_KEY } from '../config'

// Talks to the server-side AI triage endpoint. The Anthropic key never reaches
// the browser — the server holds it and proxies the request.
const headers = { 'Content-Type': 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) }

// Is AI triage configured on the server? Cached after the first check.
let _statusPromise
export function aiStatus() {
  if (!_statusPromise) {
    _statusPromise = fetch(API_BASE + '/api/ai/status', { headers })
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .catch(() => ({ enabled: false }))
  }
  return _statusPromise
}

// Ask the server to triage one ticket. `rule` is the catalog entry for the app
// (required fields + policy note) so the model is grounded, not guessing.
export async function aiTriage(ticket, rule) {
  const res = await fetch(API_BASE + '/api/ai/triage', {
    method: 'POST',
    headers,
    body: JSON.stringify({ ticket, rule }),
  })
  if (res.status === 503) throw new Error('AI triage is not configured on the server.')
  if (res.status === 429) throw new Error('AI is rate-limited right now — try again shortly.')
  if (!res.ok) throw new Error('AI triage failed (' + res.status + ').')
  return res.json()
}
