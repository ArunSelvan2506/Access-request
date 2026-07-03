import { useState } from 'react'
import { RULES, PROPOSED } from '../data/rules'
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
      <h1 className="title">Automations</h1>
      <p className="sub">
        Rules the service desk runs automatically when tickets are created or transitioned, plus
        proactive automations we can switch on. Visible to administrators only.
      </p>

      <div className="auto-sec">Active rules</div>
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

      <div className="auto-sec" style={{ marginTop: 24 }}>Proactive — available to add</div>
      <div>
        {PROPOSED.map((r) => (
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
              <span className="tag grey">Proposed</span>
            </div>
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--faint)', fontSize: 12.5, marginTop: 10 }}>
        Notification and scheduled automations (Slack, email alerts, reminders, reviews) run
        server-side and activate once the AWS server is deployed. Ask to enable any proposed
        automation and it’ll be wired up.
      </p>
    </section>
  )
}
