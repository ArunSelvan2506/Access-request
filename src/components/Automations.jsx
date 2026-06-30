import { useState } from 'react'
import { RULES } from '../data/rules'
import { useToast } from './common/Toast'

export default function Automations() {
  // Local copy of the rule on/off states. Lift this into shared state/storage
  // when wiring the toggles to real automation behavior.
  const [states, setStates] = useState(() => RULES.map((r) => r.on))
  const toast = useToast()

  const toggle = (i) => {
    setStates((prev) => {
      const next = [...prev]
      next[i] = !next[i]
      toast((next[i] ? 'Enabled: ' : 'Disabled: ') + RULES[i].name, 'good')
      return next
    })
  }

  return (
    <section className="view">
      <h1 className="title">Automation rules</h1>
      <p className="sub">
        Rules run automatically when tickets are created or transitioned. Built from the
        access-request policy.
      </p>
      <div>
        {RULES.map((r, i) => (
          <div className="rule" key={r.name}>
            <div className="ric" style={{ background: r.bg }}>
              {r.ic}
            </div>
            <div>
              <h4>{r.name}</h4>
              <p>{r.desc}</p>
              <div className="runlog">{r.log}</div>
            </div>
            <div className="toggle">
              <button
                className={'switch' + (states[i] ? '' : ' off')}
                onClick={() => toggle(i)}
                aria-label={'Toggle ' + r.name}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
