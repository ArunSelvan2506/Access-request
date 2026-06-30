import { AppCell, StatusPill, SlaCell } from './common/Badges'
import { slaState, isOpen, isBreaching, expiryInfo } from '../utils/sla'
import { formatUK, formatUKShort } from '../utils/format'

function Stat({ n, label, onClick }) {
  const clickable = !!onClick
  return (
    <div
      className={'stat' + (clickable ? ' clickable' : '')}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } } : undefined}
      title={clickable ? 'View ' + label.toLowerCase() : undefined}
    >
      <div className="n">{n}</div>
      <div className="l">{label}</div>
    </div>
  )
}

export default function Dashboard({ tickets, now, onOpen, onNavigate }) {
  const go = (view, q) => () => onNavigate && onNavigate(view, q)
  const appr = tickets.filter((t) => t.status === 'Pending Approval').length
  const open = tickets.filter(isOpen).length
  const breach = tickets.filter(isBreaching).length
  const rej = tickets.filter((t) => t.status === 'Rejected').length
  const done = tickets.filter((t) => t.status === 'Done').length
  const expiring = tickets.filter((t) => {
    const e = expiryInfo(t, now)
    return e && (e.soon || e.expired)
  }).length

  const recent = [...tickets].sort((a, b) => b.created - a.created).slice(0, 6)

  return (
    <section className="view">
      <h1 className="title">Dashboard</h1>
      <p className="sub">
        Live overview of the Access Requests service desk. Tickets are validated on submission
        against the catalog rules and tracked against SLA targets.
      </p>
      <div className="stats">
        <Stat n={appr} label="Awaiting approval" onClick={go('approvals')} />
        <Stat n={open} label="Open requests" onClick={go('queue', 'open')} />
        <Stat n={breach} label="SLA at risk" onClick={go('queue', 'breach')} />
        <Stat n={expiring} label="Access expiring" onClick={go('queue', 'expiring')} />
        <Stat n={rej} label="Auto-rejected" onClick={go('queue', 'rejected')} />
        <Stat n={done} label="Resolved" onClick={go('queue', 'done')} />
      </div>
      <h1 className="title" style={{ fontSize: 16, marginBottom: 10 }}>
        Recent activity
      </h1>
      <table className="q">
        <thead>
          <tr>
            <th>Key</th>
            <th>Application</th>
            <th>Summary</th>
            <th>Status</th>
            <th>SLA</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {recent.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--faint)' }}>
                No requests found.
              </td>
            </tr>
          ) : (
            recent.map((t) => (
              <tr key={t.key} onClick={() => onOpen(t.key)}>
                <td className="keycell">{t.key}</td>
                <td>
                  <AppCell name={t.app} />
                </td>
                <td>{t.summary}</td>
                <td>
                  <StatusPill status={t.status} />
                </td>
                <td>
                  <SlaCell ticket={t} now={now} />
                </td>
                <td title={formatUK(t.created)} style={{ whiteSpace: 'nowrap' }}>{formatUKShort(t.created)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}
