import { useState } from 'react'
import { AppCell } from './common/Badges'

const COLUMNS = ['Pending Approval', 'Open', 'In Progress', 'Waiting', 'Done', 'Rejected']
const CLOSED = ['Done', 'Rejected'] // the ones that pile up

export default function Board({ tickets, onOpen }) {
  const [hideDone, setHideDone] = useState(false)
  const cols = hideDone ? COLUMNS.filter((c) => !CLOSED.includes(c)) : COLUMNS

  return (
    <section className="view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h1 className="title" style={{ marginBottom: 0 }}>Board</h1>
        <button className="btn" onClick={() => setHideDone((v) => !v)}>
          {hideDone ? '＋ Show done & rejected' : '－ Hide done & rejected'}
        </button>
      </div>
      <p className="sub">
        Drag-free Kanban. Use the workflow buttons inside a ticket to move it between columns.
      </p>
      <div className="board" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
        {cols.map((col) => {
          const list = tickets
            .filter((t) => t.status === col)
            .sort((a, b) => b.created - a.created)
          return (
            <div className="bcol" key={col}>
              <h4>
                {col}
                <span>{list.length}</span>
              </h4>
              <div className="bcards">
                {list.map((t) => (
                  <div className="bcard" key={t.key} onClick={() => onOpen(t.key)}>
                    <div className="bt">{t.summary}</div>
                    <div className="bm">
                      <span>
                        <AppCell name={t.app} />
                      </span>
                      <span>{t.key}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
