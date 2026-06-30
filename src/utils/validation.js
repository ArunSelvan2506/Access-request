// ================= VALIDATION ENGINE =================
// Validates a create-request form against a catalog application's rules.
// Pure function — no DOM, no state — so it's easy to unit-test and to extend
// with your own logic.
//
//   app     - a "green" (IT-managed) catalog entry
//   summary - the trimmed summary string
//   values  - { [fieldKey]: value } map of the dynamic field inputs
//
// Returns { data, errors, fieldErrors }
//   data        - cleaned (trimmed) values keyed by field
//   errors      - flat list of human-readable error strings (order preserved)
//   fieldErrors - { [fieldKey]: errorString } for inline field highlighting
export function validateRequest(app, summary, values) {
  const data = {}
  const errors = []
  const fieldErrors = {}

  if (!summary || !summary.trim()) errors.push('Summary is required')

  app.fields.forEach((f) => {
    const v = (values[f.k] || '').trim()
    data[f.k] = v
    let err = null

    if (f.req && !v) {
      err = f.label + ' is required'
    } else if (v && f.validate) {
      err = f.validate(v)
    } else if (f.type === 'select' && /^No$/.test(v)) {
      err = f.label + ' — must be confirmed'
    }

    if (err) {
      errors.push(err)
      fieldErrors[f.k] = err
    }
  })

  return { data, errors, fieldErrors }
}
