import { useState, useEffect } from 'react'
import { findApp } from '../data/catalog'
import { slaState } from '../utils/sla'
import { timeAgo, formatUK, TRANSITIONS } from '../utils/format'
import { PENDING_REASONS } from '../data/jira'
import { displayName } from '../auth/session'
import { StatusPill } from './common/Badges'

export default function TicketDrawer({
  ticket,
  now,
  canTransition,
  canApprove,
  canAssign,
  isAdmin,
  currentEmail,
  onClose,
  onTransition,
  onApprove,
  onAssign,
  onComment,
}) {
  const open = !!ticket
  const a = ticket ? findApp(ticket.app) : null
  const s = ticket ? slaState(ticket, now) : null

  const [waitingPick, setWaitingPick] = useState(false)
  const [reason, setReason] = useState(PENDING_REASONS[0])
  const [note, setNote] = useState('')
  const [comment, setComment] = useState('')
  useEffect(() => {
    setWaitingPick(false)
    setReason(PENDING_REASONS[0])
    setNote('')
    setComment('')
  }, [ticket?.key])

  const labelFor = (k) => {
    const f = a && a.fields && a.fields.find((x) => x.k === k)
    return f ? f.label : k
  }

  const transitions = ticket ? TRANSITIONS[ticket.status] || [] : []
  // Requesters never see internal (admin-only) notes.
  const activity = ticket
    ? (ticket.activity || []).filter((e) => isAdmin || !e.internal).slice().reverse()
    : []
  const pendingApproval = ticket && ticket.status === 'Pending Approval'

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

            {/* ---- Line-manager approval ---- */}
            {ticket.approval && (
              <>
                <div className="sec">Line-manager approval</div>
                {pendingApproval ? (
                  <div className="callout warn" style={{ marginBottom: 14, flexDirection: 'column', alignItems: 'stretch' }}>
                    <div>⏳ Awaiting approval from <b>{ticket.manager}</b>.</div>
                    {canApprove && (
                      <div style={{ marginTop: 10 }}>
                        <textarea
                          placeholder="Optional note to the requester…"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          style={{ width: '100%', minHeight: 54, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn primary" onClick={() => onApprove(ticket.key, 'Approved', note)}>
                            Approve
                          </button>
                          <button className="btn" onClick={() => onApprove(ticket.key, 'Rejected', note)}>
                            Decline
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="db" style={{ padding: 0, marginBottom: 18, fontSize: 13, color: 'var(--soft)' }}>
                    {ticket.approval.state === 'Approved' ? '✅ Approved' : '🔴 Declined'} by{' '}
                    {ticket.approval.by || ticket.manager}
                    {ticket.approval.at ? ' · ' + formatUK(ticket.approval.at) : ''}
                    {ticket.approval.note ? ' — ' + ticket.approval.note : ''}
                  </div>
                )}
              </>
            )}

            {ticket.rejectReason && (
              <div className="callout crit">
                🔴{' '}
                <div>
                  <b>Rejected:</b> {ticket.rejectReason}
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

            {/* ---- Assignment ---- */}
            <div className="sec">Assignee</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13 }}>{ticket.assignee ? displayName(ticket.assignee) + ' (' + ticket.assignee + ')' : 'Unassigned'}</span>
              {canAssign && ticket.assignee !== currentEmail && (
                <button className="btn" onClick={() => onAssign(ticket.key, currentEmail)}>
                  Assign to me
                </button>
              )}
              {canAssign && ticket.assignee && (
                <button className="btn" onClick={() => onAssign(ticket.key, null)}>
                  Unassign
                </button>
              )}
            </div>

            {/* ---- Workflow transitions (admins, once approved) ---- */}
            {canTransition && !pendingApproval && (
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
            )}
            {!canTransition && !pendingApproval && (
              <div className="callout warn" style={{ marginBottom: 20 }}>
                You can track this request and comment here. Only administrators can change its status.
              </div>
            )}

            {/* ---- Details ---- */}
            <div className="sec">Request details</div>
            <dl className="field-grid">
              {ticket.manager && (
                <div style={{ display: 'contents' }}>
                  <dt>Line manager</dt>
                  <dd>{ticket.manager}</dd>
                </div>
              )}
              {Object.entries(ticket.fields).map(([k, v]) => (
                <div key={k} style={{ display: 'contents' }}>
                  <dt>{labelFor(k)}</dt>
                  <dd>{v || '—'}</dd>
                </div>
              ))}
            </dl>

            {/* ---- Comments / activity ---- */}
            <div className="sec">Activity & comments</div>
            <div style={{ marginBottom: 16 }}>
              <input
                placeholder="Add a comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && comment.trim()) {
                    onComment(ticket.key, comment, false)
                    setComment('')
                  }
                }}
                style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 10px', fontSize: 13, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn primary"
                  disabled={!comment.trim()}
                  onClick={() => {
                    onComment(ticket.key, comment, false)
                    setComment('')
                  }}
                >
                  Comment
                </button>
                {isAdmin && (
                  <button
                    className="btn"
                    disabled={!comment.trim()}
                    title="Visible to administrators only — hidden from the requester"
                    onClick={() => {
                      onComment(ticket.key, comment, true)
                      setComment('')
                    }}
                  >
                    🔒 Add internal note
                  </button>
                )}
              </div>
            </div>
            <div className="activity">
              <div className="ev">
                <div className="who">{ticket.requester}</div>
                <div className="tm">{formatUK(ticket.created)} · {timeAgo(ticket.created, now)} · created request</div>
              </div>
              {activity.map((e, i) => (
                <div
                  className="ev"
                  key={i}
                  style={e.internal ? { background: 'var(--yellow-bg)', borderRadius: 'var(--r)', padding: '6px 10px', marginLeft: -10 } : undefined}
                >
                  <div className="who">
                    {e.who}
                    {e.internal ? <span className="tag yellow" style={{ marginLeft: 6 }}>🔒 Internal</span> : e.comment ? ' 💬' : ''}
                  </div>
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
