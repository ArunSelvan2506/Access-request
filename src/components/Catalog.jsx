import { AppCell } from './common/Badges'
import { CATALOG } from '../data/catalog'

export default function Catalog() {
  return (
    <section className="view">
      <h1 className="title">Service catalog</h1>
      <p className="sub">
        The applications you can request, what information to have ready, and the target turnaround.
      </p>
      <table className="q">
        <thead>
          <tr>
            <th>Application</th>
            <th>How to request</th>
            <th>Information needed</th>
            <th>Target SLA</th>
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
                  <td colSpan={2} style={{ color: 'var(--soft)' }}>
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
                  <span className="tag green">Raise a request</span>
                </td>
                <td style={{ color: 'var(--soft)' }}>{required}</td>
                <td>{a.sla}h</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </section>
  )
}
