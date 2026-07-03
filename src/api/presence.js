import { API_BASE, API_KEY } from '../config'

const headers = { 'Content-Type': 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) }

// Owner portal: who's online now + recent logins. Returns empty lists if the
// server isn't reachable (local build).
export function getPresence() {
  return fetch(API_BASE + '/api/presence', { headers })
    .then((r) => (r.ok ? r.json() : { online: [], logins: [] }))
    .catch(() => ({ online: [], logins: [] }))
}
