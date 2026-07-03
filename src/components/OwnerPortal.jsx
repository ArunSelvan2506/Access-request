import { useState, useMemo } from 'react'
import { formatUK, formatUKShort, timeAgo } from '../utils/format'
import { isOpen, isBreaching } from '../utils/sla'
import { BACKEND, isApi, GOOGLE_CLIENT_ID } from '../config'
import { OWNER_EMAIL } from '../auth/session'

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

export default function OwnerPortal({ tickets, now, admins = [], onOpen }) {
  const [q, setQ] = useState('')
  const [fType, setFType] = useState('')

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
