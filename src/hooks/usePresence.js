import { useEffect } from 'react'
import { API_BASE, API_KEY, isApi } from '../config'

const headers = { 'Content-Type': 'application/json', ...(API_KEY ? { 'x-api-key': API_KEY } : {}) }

// While signed in (api mode), record a login and heartbeat every 60s so the
// owner portal can show who's active. No-op on the static/local build.
export function usePresence(email) {
  useEffect(() => {
    if (!isApi || !email) return
    let stopped = false
    const ping = (event) =>
      fetch(API_BASE + '/api/presence/ping', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email, event }),
      }).catch(() => {})
    ping('login')
    const id = setInterval(() => { if (!stopped) ping() }, 60000)
    const onVisible = () => { if (document.visibilityState === 'visible') ping() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { stopped = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [email])
}
