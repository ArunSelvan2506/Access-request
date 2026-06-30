import { findApp, APP_EMOJI } from '../../data/catalog'
import { APP_LOGO } from '../../data/logos'
import { slaState } from '../../utils/sla'
import { statusClass } from '../../utils/format'

// Application icon + name, used in tables and cards. Prefers the real brand
// logo, then the app's emoji, then the 2-letter code — all inside the tile.
export function AppCell({ name }) {
  const a = findApp(name)
  if (!a) return name
  const logo = APP_LOGO[name]
  if (logo) {
    return (
      <>
        <span className="app-ic logo" title={name}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill={logo.hex} aria-hidden="true">
            <path d={logo.d} />
          </svg>
        </span>
        {name}
      </>
    )
  }
  const emoji = APP_EMOJI[name]
  return (
    <>
      <span className="app-ic" style={{ background: a.ic.bg, color: a.ic.tx }}>
        {emoji || a.ic.l}
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
