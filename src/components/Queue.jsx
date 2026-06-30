import { useState, useMemo } from 'react'
import { AppCell, StatusPill, SlaCell } from './common/Badges'
import { CATALOG } from '../data/catalog'
import { isOpen, isBreaching } from '../utils/sla'
import { exportTicketsCsv } from '../utils/csv'

const STATUS_OPTIONS = ['Pending Approval', 'Open', 'In Progress', 'Waiting', 'Done', 'Rejected', 'Cancelled']
const APP_OPTIONS = CATALOG.filter((a) => a.group === 'green').map((a) => a.name)

const TITLES = { open: 'Open requests', breach: 'SLA at risk' }

export default function Queue({ tickets, queueFilter, now, onOpen, title: titleProp, subtitle }) {
  const [search, setSearch] = useState('')
  const [fStatus, setFStatus] = useState('')
  const [fApp, setFApp] = useState('')

  const list = useMemo(() => {
    let l = [...tickets].sort((a, b) => b.created - a.created)
    if (queueFilter === 'open') l = l.filter(isOpen)
    else if (queueFilter === 'breach') l = l.filter(isBreaching)

    const q = search.toLowerCase()
    return l.filter(
      (t) =>
        (!q || (t.key + t.app + t.summary + t.requester).toLowerCase().includes(q)) &&
        (!fStatus || t.status === fStatus) &&
        (!fApp || t.app === fApp)
    )
  }, [tickets, queueFilter, search, fStatus, fApp])

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
            <th>Key</th>
            <th>Application</th>
            <th>Summary</th>
            <th>Requester</th>
            <th>Status</th>
            <th>SLA</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--faint)' }}>
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
