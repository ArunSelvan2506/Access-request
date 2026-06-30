import { useState, useEffect } from 'react'
import { findApp } from '../data/catalog'
import { slaState } from '../utils/sla'
import { timeAgo, formatUK, TRANSITIONS } from '../utils/format'
import { PENDING_REASONS } from '../data/jira'
import { StatusPill } from './common/Badges'

export default function TicketDrawer({ ticket, now, canTransition, onClose, onTransition }) {
  const open = !!ticket
  const a = ticket ? findApp(ticket.app) : null
  const s = ticket ? slaState(ticket, now) : null

  // Local state for the "Waiting" pending-reason picker.
  const [waitingPick, setWaitingPick] = useState(false)
  const [reason, setReason] = useState(PENDING_REASONS[0])
  useEffect(() => {
    setWaitingPick(false)
    setReason(PENDING_REASONS[0])
  }, [ticket?.key])

  const labelFor = (k) => {
    const f = a && a.fields && a.fields.find((x) => x.k === k)
    return f ? f.label : k
  }

  const transitions = ticket ? TRANSITIONS[ticket.status] || [] : []
  const activity = ticket ? (ticket.activity || []).slice().reverse() : []

  const go = (to) => {
    if (to === 'Waiting') {
      setWaitingPick(true)
      return
    }
    onTransition(ticket.key, to)
  }

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
              {ticket.urgency && <span className="tag blue">Urgency: {ticket.urgency}</span>}
            </div>

            <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 18 }}>
              Created {formatUK(ticket.created)} · SLA due {formatUK(ticket.created + ticket.sla * 36e5)}{' '}
              <span style={{ fontWeight: 600 }}>(UK time)</span>
            </div>

            {ticket.rejectReason && (
              <div className="callout crit">
                🔴{' '}
                <div>
                  <b>Auto-rejected:</b> {ticket.rejectReason}
                </div>
              </div>
            )}
            {ticket.status === 'Waiting' && ticket.pendingReason && (
              <div className="callout warn">
                ⏳{' '}
                <div>
                  <b>Waiting:</b> {ticket.pendingReason}
                </div>
              </div>
            )}

            {/* Transitions — admins only. */}
            {canTransition ? (
              <>
                <div className="sec">Transition</div>
                <div className="wf">
                  {transitions.length ? (
                    transitions.map((to) => (
                      <button key={to} onClick={() => go(to)}>
                        → {to}
                      </button>
                    ))
                  ) : (
                    <span style={{ color: 'var(--faint)', fontSize: 13 }}>No further transitions.</span>
                  )}
                </div>
                {waitingPick && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '0 0 20px', flexWrap: 'wrap' }}>
                    <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ height: 32, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 10px', fontSize: 13 }}>
                      {PENDING_REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                    <button className="btn primary" onClick={() => { onTransition(ticket.key, 'Waiting', { pendingReason: reason }); setWaitingPick(false) }}>
                      Confirm wait
                    </button>
                    <button className="btn" onClick={() => setWaitingPick(false)}>
                      Cancel
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="callout warn" style={{ marginBottom: 20 }}>
                You can track this request here. Only administrators can change its status.
              </div>
            )}

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
                <div className="tm">{formatUK(ticket.created)} · {timeAgo(ticket.created, now)} · created request</div>
              </div>
              {activity.map((e, i) => (
                <div className="ev" key={i}>
                  <div className="who">{e.who}</div>
                  <div className="tm">{formatUK(e.tm)} · {timeAgo(e.tm, now)}</div>
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
