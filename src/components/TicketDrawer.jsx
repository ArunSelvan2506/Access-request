import { findApp } from '../data/catalog'
import { slaState } from '../utils/sla'
import { timeAgo, TRANSITIONS } from '../utils/format'
import { StatusPill } from './common/Badges'

export default function TicketDrawer({ ticket, now, onClose, onTransition }) {
  const open = !!ticket
  const a = ticket ? findApp(ticket.app) : null
  const s = ticket ? slaState(ticket, now) : null

  // Map a field key back to its catalog label for display.
  const labelFor = (k) => {
    const f = a && a.fields && a.fields.find((x) => x.k === k)
    return f ? f.label : k
  }

  const transitions = ticket ? TRANSITIONS[ticket.status] || [] : []
  const activity = ticket ? (ticket.activity || []).slice().reverse() : []

  return (
    <div className={'drawer' + (open ? ' show' : '')}>
      {ticket && (
        <>
          <div className="dh">
            <div>
              <div className="key">{ticket.key + ' · ' + ticket.requester}</div>
              <h2>{ticket.summary}</h2>
            </div>
            <button className="close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="db">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
              <StatusPill status={ticket.status} />
              <span className="tag green">{ticket.app}</span>
              <span className={'sla ' + s.cls}>
                <span className="dotc" />
                {s.txt}
              </span>
              <span className="tag grey">SLA target {ticket.sla}h</span>
            </div>

            {ticket.rejectReason && (
              <div className="callout crit">
                🔴{' '}
                <div>
                  <b>Auto-rejected:</b> {ticket.rejectReason}
                </div>
              </div>
            )}

            <div className="sec">Transition</div>
            <div className="wf">
              {transitions.length ? (
                transitions.map((to) => (
                  <button key={to} onClick={() => onTransition(ticket.key, to)}>
                    → {to}
                  </button>
                ))
              ) : (
                <span style={{ color: 'var(--faint)', fontSize: 13 }}>No further transitions.</span>
              )}
            </div>

            <div className="sec">Request details</div>
            <dl className="field-grid">
              {Object.entries(ticket.fields).map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{labelFor(k)}</dt>
                  <dd>{v || '—'}</dd>
                </div>
              ))}
            </dl>

            <div className="sec">Activity</div>
            <div className="activity">
              <div className="ev">
                <div className="who">{ticket.requester}</div>
                <div className="tm">{timeAgo(ticket.created, now)} · created request</div>
              </div>
              {activity.map((e, i) => (
                <div className="ev" key={i}>
                  <div className="who">{e.who}</div>
                  <div className="tm">{timeAgo(e.tm, now)}</div>
                  <div className="tx">{e.tx}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
