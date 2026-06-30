import { useState } from 'react'
import { CATALOG, APP_EMOJI } from '../data/catalog'

// Slide-over knowledge base built from the catalog: what each app needs before
// you request, why requests get auto-rejected, and where to go for non-IT apps.
export default function HelpPanel({ open, onClose }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()
  const match = (a) =>
    !query ||
    a.name.toLowerCase().includes(query) ||
    (a.reject || '').toLowerCase().includes(query) ||
    (a.callout && a.callout.x.toLowerCase().includes(query)) ||
    (a.route || '').toLowerCase().includes(query)

  const green = CATALOG.filter((a) => a.group === 'green' && match(a))
  const red = CATALOG.filter((a) => a.group === 'red' && match(a))

  return (
    <>
      <div className={'scrim' + (open ? ' show' : '')} onClick={onClose} />
      <div className={'drawer' + (open ? ' show' : '')} style={{ width: 520 }}>
        <div className="dh">
          <div>
            <div className="key">Knowledge base</div>
            <h2>How to request access</h2>
          </div>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="db">
          <input
            placeholder="Search applications, rules…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 10px', fontSize: 13, marginBottom: 16 }}
          />

          <div className="sec">IT-managed — raise a request</div>
          {green.map((a) => (
            <div key={a.name} style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
                <span style={{ marginRight: 6 }}>{APP_EMOJI[a.name] || ''}</span>{a.name}
              </div>
              {a.callout && <div style={{ fontSize: 12.5, color: 'var(--soft)' }}>{a.callout.x}</div>}
            </div>
          ))}

          <div className="sec" style={{ marginTop: 18 }}>Not IT-managed — use these channels</div>
          {red.map((a) => (
            <div key={a.name} style={{ marginBottom: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{APP_EMOJI[a.name] || ''} {a.name}</span>
              <div style={{ fontSize: 12.5, color: 'var(--soft)' }}>{a.route}</div>
            </div>
          ))}
          {green.length === 0 && red.length === 0 && (
            <div style={{ color: 'var(--faint)', fontSize: 13 }}>No matches.</div>
          )}
        </div>
      </div>
    </>
  )
}
