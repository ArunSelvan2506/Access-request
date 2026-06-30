import { useState, useMemo } from 'react'
import { AppCell, StatusPill, SlaCell } from './common/Badges'
import { CATALOG } from '../data/catalog'
import { isOpen, isBreaching, expiryInfo } from '../utils/sla'
import { formatUK, formatUKShort } from '../utils/format'
import { exportTicketsCsv } from '../utils/csv'

const STATUS_OPTIONS = ['Pending Approval', 'Open', 'In Progress', 'Waiting', 'Done', 'Rejected', 'Cancelled']
const APP_OPTIONS = CATALOG.filter((a) => a.group === 'green').map((a) => a.name)

const TITLES = {
  open: 'Open requests',
  breach: 'SLA at risk',
  expiring: 'Access expiring',
  rejected: 'Auto-rejected',
  done: 'Resolved',
}

// Sortable columns (in table order). `key` maps a header to how it sorts.
const COLUMNS = [
  { key: 'num', label: 'Key' },
  { key: 'app', label: 'Application' },
  { key: 'summary', label: 'Summary' },
  { key: 'requester', label: 'Requester' },
  { key: 'status', label: 'Status' },
  { key: 'created', label: 'Submitted' },
  { key: 'sla', label: 'SLA' },
]
// Sensible default direction the first time a column is clicked.
const DEFAULT_DIR = { num: 'asc', app: 'asc', summary: 'asc', requester: 'asc', status: 'asc', created: 'desc', sla: 'asc' }

// Time left against the SLA target (ms). Closed tickets have no live timer, so
// they sort to the end of an ascending (most-urgent-first) SLA sort.
const slaRemaining = (t, now) =>
  ['Done', 'Rejected', 'Cancelled'].includes(t.status) ? Infinity : t.created + (t.sla || 0) * 36e5 - now

function compareBy(a, b, key, now) {
  switch (key) {
    case 'num': return (a.num || 0) - (b.num || 0)
    case 'created': return a.created - b.created
    case 'sla': return slaRemaining(a, now) - slaRemaining(b, now)
    case 'status': return STATUS_OPTIONS.indexOf(a.status) - STATUS_OPTIONS.indexOf(b.status)
    default: return String(a[key] || '').localeCompare(String(b[key] || ''))
  }
}

export default function Queue({ tickets, queueFilter, now, onOpen, title: titleProp, subtitle }) {
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fApp, setFApp] = useState('')
  const [sort, setSort] = useState({ key: 'created', dir: 'desc' })

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: DEFAULT_DIR[key] || 'asc' }))

  const list = useMemo(() => {
    let l = [...tickets]
    if (queueFilter === 'open') l = l.filter(isOpen)
    else if (queueFilter === 'breach') l = l.filter(isBreaching)
    else if (queueFilter === 'expiring') l = l.filter((t) => { const e = expiryInfo(t, now); return e && (e.soon || e.expired) })
    else if (queueFilter === 'rejected') l = l.filter((t) => t.status === 'Rejected')
    else if (queueFilter === 'done') l = l.filter((t) => t.status === 'Done')

    const q = search.toLowerCase()
    l = l.filter(
      (t) =>
        (!q || (t.key + t.app + t.summary + t.requester).toLowerCase().includes(q)) &&
        (!fStatus || t.status === fStatus) &&
        (!fApp || t.app === fApp)
    )

    const mult = sort.dir === 'asc' ? 1 : -1
    return l.sort((a, b) => mult * compareBy(a, b, sort.key, now))
  }, [tickets, queueFilter, search, fStatus, fApp, sort, now])

  const title = titleProp || TITLES[queueFilter] || 'All requests'

  return (
    <section className="view">
      <h1 className="title">{title}</h1>
      <p className="sub">{subtitle || 'Every access request, with live SLA timers. Click a row to open the ticket.'}</p>
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search key, application, requester…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select value={fApp} onChange={(e) => setFApp(e.target.value)}>
          <option value="">All applications</option>
          {APP_OPTIONS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <button
          className="btn"
          onClick={() => exportTicketsCsv(list, (title || 'requests').toLowerCase().replace(/\s+/g, '-') + '.csv')}
          disabled={list.length === 0}
          title="Export this list to CSV"
        >
          ⬇ Export CSV
        </button>
        <span className="spacer">
          {list.length} request{list.length === 1 ? '' : 's'}
        </span>
      </div>
      <table className="q">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className="sortable"
                onClick={() => toggleSort(c.key)}
                aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                title={'Sort by ' + c.label.toLowerCase()}
              >
                {c.label}
                <span className="sort-ind">{sort.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--faint)' }}>
                No requests found.
              </td>
            </tr>
          ) : (
            list.map((t) => (
              <tr key={t.key} onClick={() => onOpen(t.key)}>
                <td className="keycell">{t.key}</td>
                <td>
                  <AppCell name={t.app} />
                </td>
                <td>{t.summary}</td>
                <td>{t.requester}</td>
                <td>
                  <StatusPill status={t.status} />
                </td>
                <td title={formatUK(t.created)} style={{ whiteSpace: 'nowrap' }}>{formatUKShort(t.created)}</td>
                <td>
                  <SlaCell ticket={t} now={now} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
