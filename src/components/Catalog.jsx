import { AppCell } from './common/Badges'
import { CATALOG } from '../data/catalog'

export default function Catalog() {
  return (
    <section className="view">
      <h1 className="title">Service catalog & validation rules</h1>
      <p className="sub">
        The applications IT manages, their required fields, and SLA targets. The validation engine
        and AI assistant both read from this catalog.
      </p>
      <table className="q">
        <thead>
          <tr>
            <th>Application</th>
            <th>Routing</th>
            <th>Required fields</th>
            <th>SLA target</th>
            <th>Auto-reject trigger</th>
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
                    <span className="tag red">Don't raise ticket</span>
                  </td>
                  <td colSpan={3} style={{ color: 'var(--soft)' }}>
                    {a.route}
                  </td>
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
                  <span className="tag green">Jira</span>
                </td>
                <td style={{ color: 'var(--soft)' }}>{required}</td>
                <td>{a.sla}h</td>
                <td style={{ color: 'var(--red-tx)' }}>{a.reject}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
