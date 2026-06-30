import { AppCell } from './common/Badges'
import { CATALOG } from '../data/catalog'
import { PRIORITY_SLA, URGENCY_OPTIONS } from '../data/jira'

export default function Catalog() {
  return (
    <section className="view">
      <h1 className="title">Service catalog</h1>
      <p className="sub">
        The applications you can request and what information to have ready. Turnaround
        is set by the priority you choose, not the application.
      </p>

      <div className="sla-legend">
        <span className="sla-legend-l">Target response time by priority</span>
        {URGENCY_OPTIONS.map((u) => (
          <span key={u} className={'sla-chip p-' + u.toLowerCase()}>
            <strong>{u}</strong> {PRIORITY_SLA[u]}h
          </span>
        ))}
      </div>

      <table className="q">
        <thead>
          <tr>
            <th>Application</th>
            <th>How to request</th>
            <th>Information needed</th>
          </tr>
        </thead>
        <tbody>
          {CATALOG.map((a) => {
            if (a.group === 'red') {
              return (
                <tr key={a.name}>
                  <td>
                    <AppCell name={a.name} />
                  </td>
                  <td>
                    <span className="tag red">Not via this desk</span>
                  </td>
                  <td style={{ color: 'var(--soft)' }}>{a.route}</td>
                </tr>
              )
            }
            const required = a.fields
              .filter((x) => x.req)
              .map((x) => x.label)
              .join(', ')
            return (
              <tr key={a.name}>
                <td>
                  <AppCell name={a.name} />
                </td>
                <td>
                  <span className="tag green">Raise a request</span>
                </td>
                <td style={{ color: 'var(--soft)' }}>{required}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
