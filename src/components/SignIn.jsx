import { useState } from 'react'
import { ALLOWED_DOMAIN, OWNER_EMAIL, isCompanyEmail } from '../auth/session'

// Lightweight demo sign-in: identify yourself by work email. Role is derived
// from the email (owner / admin / user). No password — this is a project demo,
// not real authentication (that arrives with the Firebase backend).
export default function SignIn({ session }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(null)

  const submit = (e) => {
    e.preventDefault()
    const email = value.trim().toLowerCase()
    if (!isCompanyEmail(email)) {
      setError(`Please use your @${ALLOWED_DOMAIN} email address.`)
      return
    }
    session.signIn(email)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 24 }}>
      <form
        onSubmit={submit}
        style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '36px 40px',
          width: 420,
          maxWidth: '100%',
          boxShadow: 'var(--sh)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span className="mark" style={{ width: 34, height: 34, background: 'var(--nav)', borderRadius: 7, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>
            A
          </span>
          <h1 style={{ fontSize: 19, fontWeight: 600 }}>Access Service Desk</h1>
        </div>
        <p style={{ color: 'var(--soft)', marginBottom: 18, fontSize: 13.5 }}>
          Sign in with your Fuse Energy email to raise and track access requests.
        </p>
        <div className="field">
          <label>Work email</label>
          <input
            type="email"
            autoFocus
            placeholder={`you@${ALLOWED_DOMAIN}`}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError(null)
            }}
          />
        </div>
        {error && (
          <div className="validation" style={{ marginBottom: 14 }}>
            {error}
          </div>
        )}
        <button className="btn primary" type="submit" style={{ width: '100%', height: 40, justifyContent: 'center' }}>
          Continue
        </button>
        <p style={{ color: 'var(--faint)', marginTop: 16, fontSize: 12, lineHeight: 1.5 }}>
          Staff can submit requests and track their own tickets. Administrators manage and resolve
          all requests. The primary owner ({OWNER_EMAIL}) manages who is an administrator.
        </p>
      </form>
    </div>
  )
}
