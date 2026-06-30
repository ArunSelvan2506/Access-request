import { AppCell } from './common/Badges'

const COLUMNS = ['Pending Approval', 'Open', 'In Progress', 'Waiting', 'Done', 'Rejected']

export default function Board({ tickets, onOpen }) {
  return (
    <section className="view">
      <h1 className="title">Board</h1>
      <p className="sub">
        Drag-free Kanban. Use the workflow buttons inside a ticket to move it between columns.
      </p>
      <div className="board">
        {COLUMNS.map((col) => {
          const list = tickets
            .filter((t) => t.status === col)
            .sort((a, b) => b.created - a.created)
          return (
            <div className="bcol" key={col}>
              <h4>
                {col}
                <span>{list.length}</span>
              </h4>
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
          )
        })}
      </div>
    </section>
  )
}
