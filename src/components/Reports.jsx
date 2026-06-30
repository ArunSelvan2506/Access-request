import { useMemo } from 'react'
import { AppCell } from './common/Badges'
import { statusClass } from '../utils/format'
import { monthlyVolume, statusCounts, topApps, outcomes, kpis } from '../utils/reports'

// Self-contained analytics screen. All charts are inline SVG / CSS — no libs.
export default function Reports({ tickets, now }) {
  const k = useMemo(() => kpis(tickets, now), [tickets, now])
  const vol = useMemo(() => monthlyVolume(tickets, now), [tickets, now])
  const apps = useMemo(() => topApps(tickets), [tickets])
  const statuses = useMemo(() => statusCounts(tickets), [tickets])
  const out = useMemo(() => outcomes(tickets), [tickets])

  return (
    <section className="view">
      <h1 className="title">Reports & analytics</h1>
      <p className="sub">Live metrics across all access requests. Everything here is computed from the current ticket data.</p>

      <div className="stats">
        <Kpi n={k.total} label="Total requests" />
        <Kpi n={k.open} label="Currently open" />
        <Kpi n={k.resolved} label="Resolved" />
        <Kpi n={k.slaPct + '%'} label="SLA attainment" />
        <Kpi n={k.approvalPct + '%'} label="Needed approval" />
        <Kpi n={k.rejectedPct + '%'} label="Auto-rejected" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
        <Card title="Requests per month">
          <TrendChart data={vol} />
        </Card>
        <Card title="Top applications">
          <BarList data={apps.map((a) => ({ label: a.app, count: a.count }))} renderLabel={(l) => <AppCell name={l} />} />
        </Card>
        <Card title="Status mix">
          <StatusBars data={statuses} />
        </Card>
        <Card title="Outcomes">
          <BarList
            data={[
              { label: 'Resolved', count: out.done, color: '#22a06b' },
              { label: 'Rejected', count: out.rejected, color: '#e2483d' },
              { label: 'Cancelled', count: out.cancelled, color: '#8590a2' },
            ]}
          />
        </Card>
      </div>
    </section>
  )
}

function Kpi({ n, label }) {
  return (
    <div className="stat">
      <div className="n">{n}</div>
      <div className="l">{label}</div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="stat" style={{ padding: 18 }}>
      <div className="l" style={{ marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  )
}

// Area + line trend chart (inline SVG).
function TrendChart({ data }) {
  const W = 320, H = 120, P = 8
  const max = Math.max(1, ...data.map((d) => d.count))
  const n = data.length
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, n - 1)
  const y = (v) => H - P - (v / max) * (H - 2 * P - 14)
  const pts = data.map((d, i) => `${x(i)},${y(d.count)}`)
  const area = `${P},${H - P} ${pts.join(' ')} ${W - P},${H - P}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="140" role="img" aria-label="Requests per month">
      <polygon points={area} fill="rgba(24,104,219,.12)" />
      <polyline points={pts.join(' ')} fill="none" stroke="var(--nav)" strokeWidth="2" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.count)} r="3" fill="var(--nav)" />
          <text x={x(i)} y={H - 2} textAnchor="middle" fontSize="9" fill="var(--faint)">{d.label}</text>
          <text x={x(i)} y={y(d.count) - 6} textAnchor="middle" fontSize="9" fill="var(--soft)" fontWeight="700">{d.count}</text>
        </g>
      ))}
    </svg>
  )
}

// Horizontal bar list. Optional per-row color or custom label renderer.
function BarList({ data, renderLabel }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ width: 130, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {renderLabel ? renderLabel(d.label) : d.label}
          </div>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 4, height: 16, position: 'relative' }}>
            <div style={{ width: (d.count / max) * 100 + '%', background: d.color || 'var(--nav)', height: '100%', borderRadius: 4 }} />
          </div>
          <div style={{ width: 28, textAlign: 'right', fontWeight: 700, color: 'var(--soft)' }}>{d.count}</div>
        </div>
      ))}
    </div>
  )
}

function StatusBars({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <div style={{ width: 130, flexShrink: 0 }}>
            <span className={'status ' + statusClass(d.label)}>{d.label}</span>
          </div>
          <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 4, height: 16 }}>
            <div style={{ width: (d.count / max) * 100 + '%', background: 'var(--nav)', height: '100%', borderRadius: 4 }} />
          </div>
          <div style={{ width: 28, textAlign: 'right', fontWeight: 700, color: 'var(--soft)' }}>{d.count}</div>
        </div>
      ))}
    </div>
  )
}
