import { useState, useEffect } from 'react'
import { findApp } from '../data/catalog'
import { slaState, expiryInfo } from '../utils/sla'
import { timeAgo, formatUK, TRANSITIONS } from '../utils/format'
import { PENDING_REASONS } from '../data/jira'
import { displayName } from '../auth/session'
import { isApi } from '../config'
import { aiStatus, aiTriage } from '../api/ai'
import { StatusPill } from './common/Badges'
import { MentionInput, renderMentions } from './common/MentionInput'

const PRIORITY_TAG = { Critical: 'red', High: 'yellow', Medium: 'blue', Low: 'green' }
const CHECK_ICON = { ok: '✅', missing: '🔴', unclear: '⚠️' }

export default function TicketDrawer({
  ticket,
  now,
  canTransition,
  canApprove,
  canAssign,
  isAdmin,
  currentEmail,
  people = [],
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
  const [channel, setChannel] = useState('Portal')
  const [comment, setComment] = useState('')
  const [aiOn, setAiOn] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState('')
  useEffect(() => {
    setWaitingPick(false)
    setReason(PENDING_REASONS[0])
    setNote('')
    setChannel('Portal')
    setComment('')
    setAiResult(null)
    setAiError('')
    setAiBusy(false)
  }, [ticket?.key])

  // AI triage is only available when the API backend is in use and the server
  // has an Anthropic key configured. Check once.
  useEffect(() => {
    if (isApi && isAdmin) aiStatus().then((s) => setAiOn(!!s.enabled))
  }, [isAdmin])

  const runTriage = async () => {
    if (!ticket || !a) return
    setAiBusy(true)
    setAiError('')
    setAiResult(null)
    const rule = {
      requiredFields: (a.fields || []).filter((f) => f.req).map((f) => f.label),
      policyNote: a.callout ? a.callout.x : null,
      autoRejectTrigger: a.reject || null,
    }
    try {
      setAiResult(await aiTriage(ticket, rule))
    } catch (e) {
      setAiError(e.message || 'AI triage failed.')
    } finally {
      setAiBusy(false)
    }
  }

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
              {ticket.duration && ticket.duration !== 'Permanent' && (
                <span className="tag purple">Access: {ticket.duration}</span>
              )}
              {(() => {
                const e = expiryInfo(ticket, now)
                if (!e) return null
                return (
                  <span className={'tag ' + (e.expired ? 'red' : e.soon ? 'yellow' : 'grey')}>
                    {e.expired ? `Expired ${-e.days}d ago` : `Expires in ${e.days}d`}
                  </span>
                )
              })()}
            </div>

            <div style={{ fontSize: 12, color: 'var(--faint)', marginBottom: 18 }}>
              Submitted {formatUK(ticket.created)} · SLA due {formatUK(ticket.created + ticket.sla * 36e5)}{' '}
              <span style={{ fontWeight: 600 }}>(UK time)</span>
            </div>

            {/* ---- AI triage (admin-only, advisory) ---- */}
            {aiOn && isAdmin && (
              <div className="ai-triage">
                <div className="sec" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>AI triage</span>
                  <span className="tag purple">beta</span>
                </div>
                {!aiResult && (
                  <div style={{ marginBottom: 18 }}>
                    <button className="btn primary" onClick={runTriage} disabled={aiBusy}>
                      {aiBusy ? 'Analysing…' : '✨ Run AI triage'}
                    </button>
                    <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>
                      A suggested priority, a check of the required fields, and a draft reply. Advisory only —
                      you decide.
                    </div>
                    {aiError && <div className="callout crit" style={{ marginTop: 10 }}>🔴 <div>{aiError}</div></div>}
                  </div>
                )}
                {aiResult && (
                  <div className="ai-card" style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                      <span className={'tag ' + (PRIORITY_TAG[aiResult.suggestedPriority] || 'grey')}>
                        Suggested: {aiResult.suggestedPriority}
                      </span>
                      <span className="tag grey">{aiResult.recommendation}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--soft)', marginBottom: 10 }}>
                      {aiResult.recommendationRationale}
                    </div>
                    {aiResult.fieldChecks && aiResult.fieldChecks.length > 0 && (
                      <ul className="ai-checks">
                        {aiResult.fieldChecks.map((c, i) => (
                          <li key={i}>
                            <span>{CHECK_ICON[c.status] || '•'}</span>
                            <span>
                              <b>{c.field}</b>
                              {c.note ? ' — ' + c.note : ''}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--faint)', margin: '12px 0 4px' }}>
                      Draft reply
                    </div>
                    <div className="ai-draft">{aiResult.draftReply}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                      <button className="btn" onClick={() => onComment(ticket.key, aiResult.draftReply, false)}>
                        Post draft as comment
                      </button>
                      <button className="btn" onClick={() => setComment(aiResult.draftReply)}>
                        Edit before sending
                      </button>
                      <button className="btn" onClick={runTriage} disabled={aiBusy}>
                        {aiBusy ? 'Analysing…' : 'Re-run'}
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>
                      AI-generated suggestion — review before acting.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---- Line-manager approval ---- */}
            {ticket.approval && (
              <>
                <div className="sec">Line-manager approval</div>
                {pendingApproval ? (
                  <div className="callout warn" style={{ marginBottom: 14, flexDirection: 'column', alignItems: 'stretch' }}>
                    <div>⏳ Awaiting approval from <b>{ticket.manager}</b>.</div>
                    {canApprove && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)' }}>Approved via</label>
                          <select
                            value={channel}
                            onChange={(e) => setChannel(e.target.value)}
                            style={{ height: 30, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '0 8px', fontSize: 13, background: 'var(--surface)', color: 'var(--ink)' }}
                          >
                            <option>Portal</option>
                            <option>Slack</option>
                            <option>Email</option>
                          </select>
                        </div>
                        <input
                          placeholder="Short note — e.g. 'Manager confirmed on Slack'"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', marginBottom: 8 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn primary" onClick={() => onApprove(ticket.key, 'Approved', note, channel)}>
                            Approve
                          </button>
                          <button className="btn" onClick={() => onApprove(ticket.key, 'Rejected', note, channel)}>
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
                    {ticket.approval.channel && ticket.approval.channel !== 'Portal' ? ' via ' + ticket.approval.channel : ''}
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
              <div style={{ display: 'contents' }}>
                <dt>Requested by</dt>
                <dd>{ticket.requester}{ticket.requesterEmail ? ` (${ticket.requesterEmail})` : ''}</dd>
              </div>
              {ticket.department && (
                <div style={{ display: 'contents' }}>
                  <dt>Department</dt>
                  <dd>{ticket.department}</dd>
                </div>
              )}
              {ticket.role && (
                <div style={{ display: 'contents' }}>
                  <dt>Role</dt>
                  <dd>{ticket.role}</dd>
                </div>
              )}
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
              <MentionInput
                placeholder="Add a comment…  (type @ to mention someone)"
                value={comment}
                onChange={setComment}
                people={people}
                onEnter={() => {
                  if (comment.trim()) {
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
                <div className="ev" key={i}>
                  <div
                    style={
                      e.internal
                        ? { background: 'var(--yellow-bg)', borderRadius: 'var(--r)', margin: '-2px -10px', padding: '2px 10px' }
                        : undefined
                    }
                  >
                    <div className="who">
                      {e.who}
                      {e.internal ? (
                        <span className="tag yellow" style={{ marginLeft: 6 }}>🔒 Internal</span>
                      ) : e.comment ? (
                        <span style={{ marginLeft: 4 }}>💬</span>
                      ) : null}
                    </div>
                    <div className="tm">{formatUK(e.tm)} · {timeAgo(e.tm, now)}</div>
                    <div className="tx">{e.comment ? renderMentions(e.tx, displayName) : e.tx}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
