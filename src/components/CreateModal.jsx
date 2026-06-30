import { useState, useMemo, useEffect } from 'react'
import { CATALOG, findApp } from '../data/catalog'
import { RULES } from '../data/rules'
import { validateRequest } from '../utils/validation'
import { useToast } from './common/Toast'

// Build the initial form values for an app (applies any field defaults).
function initialValues(app) {
  const v = {}
  if (app && app.fields) app.fields.forEach((f) => (v[f.k] = f.def || ''))
  return v
}

export default function CreateModal({ open, presetApp, onClose, onCreate }) {
  const [appName, setAppName] = useState(presetApp || '')
  const [summary, setSummary] = useState('')
  const [values, setValues] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [validation, setValidation] = useState(null) // { reject, errors } or null
  const toast = useToast()

  const app = useMemo(() => findApp(appName), [appName])

  // Reset the form whenever the modal opens (and apply any preset application).
  useEffect(() => {
    if (open) {
      const a = findApp(presetApp || '')
      setAppName(presetApp || '')
      setSummary('')
      setValues(initialValues(a))
      setFieldErrors({})
      setValidation(null)
    }
  }, [open, presetApp])

  const onAppChange = (name) => {
    setAppName(name)
    setValues(initialValues(findApp(name)))
    setSummary('')
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
    if (errors.length) {
      // AUTOMATION: auto-reject incomplete (rule index 0)
      const auto = RULES[0].on
      setFieldErrors(fe)
      setValidation({ auto, reject: app.reject, errors })
      toast('Validation failed — ' + errors.length + ' issue' + (errors.length > 1 ? 's' : ''), 'bad')
      return
    }
    setSubmitting(true)
    try {
      const ticket = await onCreate(app, summary.trim(), data)
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
