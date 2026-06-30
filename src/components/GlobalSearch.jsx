import { useState, useMemo, useRef, useEffect } from 'react'
import { StatusPill } from './common/Badges'

// Omnibox search over the tickets the current user can see. In-memory, no libs.
export default function GlobalSearch({ tickets, onOpen }) {
  const [q, setQ] = useState('')
  const [focused, setFocused] = useState(false)
  const boxRef = useRef(null)

  // Press "/" anywhere to focus search.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        boxRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return tickets
      .filter((t) => {
        const hay = [t.key, t.app, t.summary, t.requester, t.requesterEmail, t.assignee, t.status, ...Object.values(t.fields || {})]
          .join(' ')
          .toLowerCase()
        return hay.includes(s)
      })
      .slice(0, 8)
  }, [q, tickets])

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={boxRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder="Search tickets…  ( / )"
        style={{ height: 32, width: 230, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 10px', fontSize: 13, background: '#fff' }}
      />
      {focused && q.trim() && (
        <div
          style={{
            position: 'absolute', top: 36, left: 0, width: 340, maxHeight: 360, overflowY: 'auto',
            background: '#fff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--sh)', zIndex: 60,
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: 12, fontSize: 13, color: 'var(--faint)' }}>No matches.</div>
          ) : (
            results.map((t) => (
              <div
                key={t.key}
                onMouseDown={() => { onOpen(t.key); setQ('') }}
                style={{ padding: '9px 12px', borderBottom: '1px solid #f1f2f4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span className="keycell" style={{ fontSize: 12 }}>{t.key}</span>
                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.summary}</span>
                <StatusPill status={t.status} />
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
