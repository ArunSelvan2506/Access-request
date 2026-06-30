import { useState, useEffect } from 'react'

// Re-renders consumers on an interval so live SLA timers stay current.
// Returns the current timestamp; default tick is 30s (matches the original).
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
