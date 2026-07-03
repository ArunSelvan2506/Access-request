import { useState, useMemo, useEffect } from 'react'
import { formatUK, formatUKShort, timeAgo } from '../utils/format'
import { isOpen, isBreaching } from '../utils/sla'
import { BACKEND, isApi, GOOGLE_CLIENT_ID } from '../config'
import { OWNER_EMAIL, displayName } from '../auth/session'
import { getPresence } from '../api/presence'
import { BASE_ROUTING, loadRouting, saveRouting, resetRouting } from '../data/catalog'
import { useToast } from './common/Toast'

const TYPE_LABEL = {
  created: 'Created', update: 'Status', comment: 'Comment', internal: 'Internal',
  approval: 'Approval', assign: 'Assignment', auto: 'Automation',
}
const TYPE_TAG = {
  created: 'blue', update: 'grey', comment: 'green', internal: 'yellow',
  approval: 'purple', assign: 'blue', auto: 'grey',
}

// Flatten every ticket's history into one audit trail, newest first.
function buildLog(tickets) {
  const events = []
  for (const t of tickets) {
    events.push({ key: t.key, tm: t.created, who: t.requester, tx: 'Created request — ' + t.summary, type: 'created' })
    for (const e of t.activity || []) {
      let type = 'update'
      if (e.comment && e.internal) type = 'internal'
      else if (e.comment) type = 'comment'
      else if (/approv|declin/i.test(e.tx)) type = 'approval'
      else if (/assign/i.test(e.tx)) type = 'assign'
      else if (e.who === 'Automation') type = 'auto'
      events.push({ key: t.key, tm: e.tm, who: e.who, tx: e.tx, type })
    }
  }
  return events.sort((a, b) => b.tm - a.tm)
}

function exportLogCsv(rows) {
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'
  const head = ['Time (UK)', 'Ticket', 'Actor', 'Type', 'Detail']
  const body = rows.map((r) => [formatUK(r.tm), r.key, r.who, TYPE_LABEL[r.type], r.tx].map(esc).join(','))
  const csv = [head.join(','), ...body].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'access-desk-audit-log.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function Stat({ n, label }) {
  return (
    <div className="stat">
      <div className="n">{n}</div>
      <div className="l">{label}</div>
    </div>
  )
}

export default function OwnerPortal({ tickets, now, admins = [], currentEmail, onOpen }) {
  const [q, setQ] = useState('')
  const [fType, setFType] = useState('')
  const [presence, setPresence] = useState({ online: [], logins: [] })
  const [routing, setRouting] = useState(loadRouting())
  const toast = useToast()

  const saveRoute = () => { saveRouting(routing); toast('Ticket routing saved', 'good') }
  const resetRoute = () => { resetRouting(); setRouting(loadRouting()); toast('Routing reset to defaults', 'good') }

  // Live presence + login history from the server (api mode). Poll every 30s.
  useEffect(() => {
    if (!isApi) return
    let stop = false
    const load = () => getPresence().then((d) => { if (!stop) setPresence(d) })
    load()
    const id = setInterval(load, 30000)
    return () => { stop = true; clearInterval(id) }
  }, [])

  // In local mode we can only see this browser's own session.
  const online = isApi ? presence.online : (currentEmail ? [{ email: currentEmail, lastSeen: now }] : [])
  const logins = presence.logins

  const log = useMemo(() => buildLog(tickets), [tickets])
  const filtered = useMemo(() => {
    const s = q.toLowerCase()
    return log.filter(
      (e) => (!fType || e.type === fType) && (!s || (e.key + e.who + e.tx).toLowerCase().includes(s))
    )
  }, [log, q, fType])
  const shown = filtered.slice(0, 300)

  const adminCount = new Set([OWNER_EMAIL, ...admins].map((e) => e.toLowerCase())).size
  const breaching = tickets.filter(isBreaching).length

  const feature = (on, offText = 'Off') => (
    <span className={'tag ' + (on ? 'green' : 'grey')}>{on ? 'On' : offText}</span>
  )

  return (
    <section className="view">
      <h1 className="title">Owner portal</h1>
      <p className="sub">
        Full audit trail and system status for the primary owner. Every action across every ticket
        is logged here — including internal notes.
      </p>

      <div className="stats" style={{ marginBottom: 18 }}>
        <Stat n={tickets.length} label="Total tickets" />
        <Stat n={tickets.filter(isOpen).length} label="Open" />
        <Stat n={breaching} label="SLA breaching" />
        <Stat n={adminCount} label="Admins (incl. owner)" />
        <Stat n={log.length} label="Log events" />
      </div>

      <div className="auto-sec">System</div>
      <div className="sysinfo">
        <div className="sysrow"><span className="sysk">Backend</span><span className="sysv">{BACKEND === 'api' ? 'Server (DynamoDB)' : BACKEND === 'firebase' ? 'Firebase' : 'Local (this browser)'}</span></div>
        <div className="sysrow"><span className="sysk">Shared data</span><span className="sysv">{isApi ? 'Connected to server' : 'Local only — data lives in each browser'}</span></div>
        <div className="sysrow"><span className="sysk">Google SSO</span><span className="sysv">{feature(!!GOOGLE_CLIENT_ID, 'Not configured')}</span></div>
        <div className="sysrow"><span className="sysk">Email &amp; AI</span><span className="sysv"><span className="tag grey">Server-side</span> <span style={{ color: 'var(--faint)', fontSize: 12 }}>activate when the server is deployed</span></span></div>
        <div className="sysrow"><span className="sysk">Primary owner</span><span className="sysv">{OWNER_EMAIL}</span></div>
      </div>

      <div className="auto-sec">Ticket routing — auto-assign</div>
      <div className="sysinfo">
        {Object.keys(BASE_ROUTING).map((app) => (
          <div className="sysrow" key={app}>
            <span className="sysk">{app}</span>
            <input
              className="routing-in"
              value={routing.map[app] || ''}
              placeholder="owner@fuseenergy.com"
              onChange={(e) => setRouting((r) => ({ ...r, map: { ...r.map, [app]: e.target.value.trim().toLowerCase() } }))}
            />
          </div>
        ))}
        <div className="sysrow">
          <span className="sysk">All other requests</span>
          <input
            className="routing-in"
            value={routing.fallback || ''}
            placeholder="owner@fuseenergy.com"
            onChange={(e) => setRouting((r) => ({ ...r, fallback: e.target.value.trim().toLowerCase() }))}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0 24px' }}>
        <button className="btn primary" onClick={saveRoute}>Save routing</button>
        <button className="btn" onClick={resetRoute}>Reset to defaults</button>
        <span style={{ color: 'var(--faint)', fontSize: 12 }}>Applies to new requests. Assignees should be admins to action tickets.</span>
      </div>

      <div className="auto-sec">
        Who’s online now <span className="tag green" style={{ marginLeft: 6 }}>{online.length}</span>
      </div>
      <div className="sysinfo" style={{ marginBottom: 22 }}>
        {online.length === 0 ? (
          <div className="sysrow" style={{ color: 'var(--faint)' }}>No one is active right now.</div>
        ) : (
          online.map((u) => (
            <div className="sysrow" key={u.email}>
              <span className="onlinedot" />
              <span className="sysv" style={{ flex: 1 }}>
                <b>{displayName(u.email)}</b> <span style={{ color: 'var(--faint)' }}>{u.email}{u.email === currentEmail ? ' · you' : ''}</span>
              </span>
              <span style={{ color: 'var(--faint)', fontSize: 12 }}>active {timeAgo(u.lastSeen, now)}</span>
            </div>
          ))
        )}
      </div>
      {!isApi && (
        <p style={{ color: 'var(--faint)', fontSize: 12.5, marginTop: -14, marginBottom: 22 }}>
          Only your own session shows on the local build. Org-wide presence and the full login
          history below populate once the server is deployed.
        </p>
      )}

      <div className="auto-sec">Login activity</div>
      {logins.length === 0 ? (
        <div className="sysinfo" style={{ marginBottom: 22 }}>
          <div className="sysrow" style={{ color: 'var(--faint)' }}>
            {isApi ? 'No logins recorded since the server last started.' : 'Login history is recorded on the server (deploy to enable).'}
          </div>
        </div>
      ) : (
        <table className="q" style={{ marginBottom: 22 }}>
          <thead>
            <tr><th>Who</th><th>Email</th><th>Signed in</th></tr>
          </thead>
          <tbody>
            {logins.map((l, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{displayName(l.email)}</td>
                <td style={{ color: 'var(--soft)' }}>{l.email}</td>
                <td title={formatUK(l.at)} style={{ whiteSpace: 'nowrap' }}>{formatUKShort(l.at)} · {timeAgo(l.at, now)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="auto-sec">Activity log</div>
      <div className="toolbar">
        <input placeholder="Search log — ticket, person, action…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">All activity</option>
          {Object.keys(TYPE_LABEL).map((k) => (
            <option key={k} value={k}>{TYPE_LABEL[k]}</option>
          ))}
        </select>
        <button className="btn" onClick={() => exportLogCsv(filtered)} disabled={filtered.length === 0}>
          ⬇ Export log (CSV)
        </button>
        <span className="spacer">{filtered.length} event{filtered.length === 1 ? '' : 's'}</span>
      </div>

      <table className="q">
        <thead>
          <tr>
            <th>When</th>
            <th>Ticket</th>
            <th>Who</th>
            <th>Type</th>
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 ? (
            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 30, color: 'var(--faint)' }}>No matching activity.</td></tr>
          ) : (
            shown.map((e, i) => (
              <tr key={i} onClick={() => onOpen(e.key)}>
                <td title={formatUK(e.tm)} style={{ whiteSpace: 'nowrap' }}>{formatUKShort(e.tm)}<div style={{ fontSize: 11, color: 'var(--faint)' }}>{timeAgo(e.tm, now)}</div></td>
                <td className="keycell">{e.key}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{e.who}</td>
                <td><span className={'tag ' + (TYPE_TAG[e.type] || 'grey')}>{TYPE_LABEL[e.type]}</span></td>
                <td style={{ color: 'var(--soft)' }}>{e.tx}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {filtered.length > shown.length && (
        <p style={{ color: 'var(--faint)', fontSize: 12, marginTop: 10 }}>
          Showing the latest {shown.length} of {filtered.length} events. Refine the search or export the full log.
        </p>
      )}
    </section>
  )
}
