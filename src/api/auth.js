import { API_BASE, API_KEY } from '../config'

const headers = { 'Content-Type': 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) }

// Send Google's ID token to the server, which verifies it and enforces the
// company domain. Returns the verified { email, name } or throws.
export async function verifyGoogle(credential) {
  const res = await fetch(API_BASE + '/api/auth/google', {
    method: 'POST',
    headers,
    body: JSON.stringify({ credential }),
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 403) throw new Error(data.message || 'That account is not allowed.')
  if (res.status === 503) throw new Error('Google sign-in is not configured on the server.')
  if (!res.ok) throw new Error('Sign-in failed. Please try again.')
  return data
}
