import { useState, useMemo, useEffect } from 'react'
import { CATALOG, findApp, needsApproval, isTimed } from '../data/catalog'
import { RULES } from '../data/rules'
import { URGENCY_OPTIONS, DEFAULT_URGENCY, DURATION_OPTIONS, DEFAULT_DURATION, DEPARTMENTS } from '../data/jira'
import { validateRequest } from '../utils/validation'
import { isOpen } from '../utils/sla'
import { useToast } from './common/Toast'

// Build the initial form values for an app (applies any field defaults).
function initialValues(app) {
  const v = {}
  if (app && app.fields) app.fields.forEach((f) => (v[f.k] = f.def || ''))
  return v
}

export default function CreateModal({ open, presetApp, onClose, onCreate, existing = [] }) {
  const [appName, setAppName] = useState(presetApp || '')
  const [summary, setSummary] = useState('')
  const [values, setValues] = useState({})
  const [urgency, setUrgency] = useState(DEFAULT_URGENCY)
  const [duration, setDuration] = useState(DEFAULT_DURATION)
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('')
  const [reqBad, setReqBad] = useState(false)
  const [manager, setManager] = useState('')
  const [managerBad, setManagerBad] = useState(false)
  const [dupeAck, setDupeAck] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [validation, setValidation] = useState(null) // { reject, errors } or null
  const toast = useToast()

  const app = useMemo(() => findApp(appName), [appName])
  const requireApproval = !!app && app.group === 'green' && needsApproval(app.name)
  const timed = !!app && app.group === 'green' && isTimed(app.name)

  // Duplicate / existing-access detection: same app already open or resolved
  // in the last 90 days for this requester.
  const dupe = useMemo(() => {
    if (!app || app.group !== 'green') return null
    const now = Date.now()
    return (
      existing.find(
        (t) => t.app === app.name && (isOpen(t) || (t.status === 'Done' && now - t.created < 90 * 864e5))
      ) || null
    )
  }, [app, existing])

  // Reset the form whenever the modal opens (and apply any preset application).
  useEffect(() => {
    if (open) {
      const a = findApp(presetApp || '')
      setAppName(presetApp || '')
      setSummary('')
      setValues(initialValues(a))
      setUrgency(DEFAULT_URGENCY)
      setDuration(DEFAULT_DURATION)
      setDepartment('')
      setRole('')
      setReqBad(false)
      setManager('')
      setManagerBad(false)
      setDupeAck(false)
      setFieldErrors({})
      setValidation(null)
    }
  }, [open, presetApp])

  const onAppChange = (name) => {
    setAppName(name)
    setValues(initialValues(findApp(name)))
    setSummary('')
    setDuration(DEFAULT_DURATION)
    setManager('')
    setManagerBad(false)
    setDupeAck(false)
    setFieldErrors({})
    setValidation(null)
  }

  const setField = (k, v) => setValues((prev) => ({ ...prev, [k]: v }))

  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (submitting) return
    if (!app) {
      toast('Select an application first', 'bad')
      return
    }
    if (app.group === 'red') {
      toast(app.name + ' is not IT-managed — use the channel shown', 'bad')
      return
    }
    const { data, errors, fieldErrors: fe } = validateRequest(app, summary, values)
    const mgr = manager.trim().toLowerCase()
    const mgrValid = /^[^@\s]+@fuseenergy\.com$/.test(mgr)
    const allErrors = [...errors]
    const reqOk = !!department && !!role.trim()
    setReqBad(!reqOk)
    if (!reqOk) allErrors.push('Department and role are required')
    if (requireApproval) {
      setManagerBad(!mgrValid)
      if (!mgrValid) allErrors.push('Line manager email (@fuseenergy.com) is required — this application needs approval')
    }
    if (allErrors.length) {
      // AUTOMATION: auto-reject incomplete (rule index 0)
      const auto = RULES[0].on
      setFieldErrors(fe)
      setValidation({ auto, reject: app.reject, errors: allErrors })
      toast('Validation failed — ' + allErrors.length + ' issue' + (allErrors.length > 1 ? 's' : ''), 'bad')
      return
    }
    setSubmitting(true)
    try {
      const ticket = await onCreate(app, summary.trim(), data, {
        urgency,
        manager: requireApproval ? mgr : null,
        duration: timed ? duration : null,
        department,
        role: role.trim(),
      })
      toast('Created ' + ticket.key, 'good')
      onClose()
    } catch (e) {
      toast('Could not create the request — please try again', 'bad')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <>
      <div className="scrim show" onClick={onClose} />
      <div className="modal show">
        <div className="mh">
          <h2>Create access request</h2>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="mb">
          <div className="field">
            <label>
              Application <span className="req">*</span>
            </label>
            <select value={appName} onChange={(e) => onAppChange(e.target.value)}>
              <option value="">Select an application…</option>
              {CATALOG.map((a) => (
                <option key={a.name} value={a.name}>
                  {(a.group === 'red' ? '🔴 ' : '') + a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Application callout / routing note */}
          {app && app.group === 'red' && (
            <div className="callout crit">
              🔴{' '}
              <div>
                <b>{app.name} is not managed by IT.</b> A Jira ticket here will be auto-rejected.
                <br />
                {app.route}
              </div>
            </div>
          )}
          {app && app.group === 'green' && app.callout && (
            <div className={'callout ' + (app.callout.t === 'crit' ? 'crit' : 'warn')}>
              {app.callout.x}
            </div>
          )}

          {/* Validation summary */}
          {validation && (
            <div className="validation">
              <b>
                {(validation.auto
                  ? '⚡ Automation: ticket would be auto-rejected'
                  : 'Validation failed') + ' — ' + validation.reject}
              </b>
              <ul>
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Duplicate / existing-access detection */}
          {app && app.group === 'green' && dupe && !dupeAck && (
            <div className="callout warn" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div>
                ♻️ You already have a {dupe.status === 'Done' ? 'recent' : 'live'} request for <b>{app.name}</b>
                {' '}({dupe.key}, {dupe.status}). Check that before raising a duplicate.
              </div>
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => setDupeAck(true)}>Request anyway</button>
              </div>
            </div>
          )}

          {/* Dynamic fields */}
          {app && app.group === 'green' && (
            <div>
              <div className="field">
                <label>
                  Summary <span className="req">*</span>
                </label>
                <input
                  placeholder="Short summary of your request"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </div>
              <div className={'field' + (reqBad && !department ? ' bad' : '')}>
                <label>
                  Your department <span className="req">*</span>
                </label>
                <select value={department} onChange={(e) => { setDepartment(e.target.value); setReqBad(false) }}>
                  <option value="">Select your department…</option>
                  {DEPARTMENTS.map((dpt) => (
                    <option key={dpt}>{dpt}</option>
                  ))}
                </select>
                <div className="err">Department is required.</div>
              </div>
              <div className={'field' + (reqBad && !role.trim() ? ' bad' : '')}>
                <label>
                  Your role / job title <span className="req">*</span>
                </label>
                <input
                  placeholder="e.g. Senior Backend Engineer"
                  value={role}
                  onChange={(e) => { setRole(e.target.value); setReqBad(false) }}
                />
                <div className="hint">Helps the reviewer confirm the access is appropriate for your role.</div>
                <div className="err">Role is required.</div>
              </div>
              <div className="field">
                <label>Urgency</label>
                <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                  {URGENCY_OPTIONS.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
              {timed && (
                <div className="field">
                  <label>Access duration</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                  <div className="hint">Time-bound access auto-flags for review when it nears expiry.</div>
                </div>
              )}
              {requireApproval && (
                <div className={'field' + (managerBad ? ' bad' : '')}>
                  <label>
                    Line manager email <span className="req">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="manager@fuseenergy.com"
                    value={manager}
                    onChange={(e) => {
                      setManager(e.target.value)
                      setManagerBad(false)
                    }}
                  />
                  <div className="hint">{app.name} needs approval — your request goes to this manager before IT actions it.</div>
                  <div className="err">A valid @fuseenergy.com manager email is required.</div>
                </div>
              )}
              {app.fields.map((f) => (
                <Field
                  key={f.k}
                  field={f}
                  value={values[f.k] || ''}
                  error={fieldErrors[f.k]}
                  onChange={(v) => setField(f.k, v)}
                />
              ))}
            </div>
          )}
        </div>
        <div className="mf">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={submit} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </div>
    </>
  )
}

// Renders a single dynamic field (text / textarea / select) with inline error.
function Field({ field, value, error, onChange }) {
  let control
  if (field.type === 'textarea') {
    control = <textarea value={value} onChange={(e) => onChange(e.target.value)} />
  } else if (field.type === 'select') {
    control = (
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select…</option>
        {field.opts.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    )
  } else {
    control = <input value={value} onChange={(e) => onChange(e.target.value)} />
  }

  return (
    <div className={'field' + (error ? ' bad' : '')}>
      <label>
        {field.label} {field.req && <span className="req">*</span>}
      </label>
      {control}
      {field.hint && <div className="hint">{field.hint}</div>}
      <div className="err">{error}</div>
    </div>
  )
}
