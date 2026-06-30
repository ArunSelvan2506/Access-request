import { findApp } from '../../data/catalog'
import { slaState } from '../../utils/sla'
import { statusClass } from '../../utils/format'

// Application icon + name, used in tables and cards.
export function AppCell({ name }) {
  const a = findApp(name)
  if (!a) return name
  return (
    <>
      <span className="app-ic" style={{ background: a.ic.bg, color: a.ic.tx }}>
        {a.ic.l}
      </span>
      {name}
    </>
  )
}

export function StatusPill({ status }) {
  return <span className={'status ' + statusClass(status)}>{status}</span>
}

export function SlaCell({ ticket, now }) {
  const s = slaState(ticket, now)
  return (
    <span className={'sla ' + s.cls}>
      <span className="dotc" />
      {s.txt}
    </span>
  )
}
