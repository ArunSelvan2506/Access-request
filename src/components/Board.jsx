import { useState } from 'react'
import { AppCell } from './common/Badges'
import { slaState } from '../utils/sla'
import { displayName } from '../auth/session'

// Columns with a status accent colour for the header dot.
const COLUMNS = [
  { key: 'Pending Approval', dot: '#e2a200' },
  { key: 'Open', dot: '#3b82f6' },
  { key: 'In Progress', dot: '#8b5cf6' },
  { key: 'Waiting', dot: '#eab308' },
  { key: 'Done', dot: '#22a06b' },
  { key: 'Rejected', dot: '#e2483d' },
]
const CLOSED = ['Done', 'Rejected'] // hidden by default — keeps the board focused on live work
const PRIO = { Critical: 'crit', High: 'high', Medium: 'med', Low: 'low' }

const initials = (email) => {
  const n = displayName(email).split(' ').filter(Boolean)
  return ((n[0]?.[0] || '') + (n[1]?.[0] || '')).toUpperCase() || '?'
}

export default function Board({ tickets, now, onOpen }) {
  const [showClosed, setShowClosed] = useState(false)
  const cols = showClosed ? COLUMNS : COLUMNS.filter((c) => !CLOSED.includes(c.key))

  return (
    <section className="view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="title" style={{ marginBottom: 0 }}>Board</h1>
        <button className="btn" onClick={() => setShowClosed((v) => !v)}>
          {showClosed ? '－ Hide done & rejected' : '＋ Show done & rejected'}
        </button>
      </div>
      <p className="sub">
        Live work across the desk. Open a ticket to move it between stages. Cards are colour-coded by priority.
      </p>

      <div className="kboard">
        {cols.map((col) => {
          const list = tickets
            .filter((t) => t.status === col.key)
            .sort((a, b) => b.created - a.created)
          return (
            <div className="kcol" key={col.key}>
              <div className="kcol-h">
                <span className="kdot" style={{ background: col.dot }} />
                {col.key}
                <span className="kcount">{list.length}</span>
              </div>
              <div className="kcol-body">
                {list.length === 0 && <div className="kcol-empty">Nothing here</div>}
                {list.map((t) => {
                  const s = slaState(t, now)
                  return (
                    <article
                      className="kcard"
                      data-prio={PRIO[t.urgency] || 'med'}
                      key={t.key}
                      onClick={() => onOpen(t.key)}
                    >
                      <div className="kc-top">
                        <span className="kc-key">{t.key}</span>
                        <span className={'sla ' + s.cls}>
                          <span className="dotc" />
                          {s.txt}
                        </span>
                      </div>
                      <div className="kc-sum">{t.summary}</div>
                      <div className="kc-foot">
                        <span className="kc-app">
                          <AppCell name={t.app} />
                        </span>
                        {t.assignee ? (
                          <span className="kc-av" title={displayName(t.assignee) + ' (' + t.assignee + ')'}>
                            {initials(t.assignee)}
                          </span>
                        ) : (
                          <span className="kc-un">Unassigned</span>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
