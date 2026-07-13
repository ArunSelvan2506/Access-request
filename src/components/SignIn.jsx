import { useState, useEffect, useRef } from 'react'
import { ALLOWED_DOMAIN, SITE_PASSWORD, isCompanyEmail } from '../auth/session'
import { GOOGLE_CLIENT_ID } from '../config'
import { verifyGoogle } from '../api/auth'

// Sign-in. When a Google client ID is configured, everyone signs in with their
// own Google account (verified server-side, restricted to the company domain).
// Otherwise it falls back to a shared site-password gate (static-site demo).
export default function SignIn({ session }) {
  const [value, setValue] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState(null)
  const gbtn = useRef(null)
  const sso = !!GOOGLE_CLIENT_ID

  // Load Google Identity Services and render the button.
  useEffect(() => {
    if (!sso) return
    const onCredential = async (resp) => {
      try {
        const { email } = await verifyGoogle(resp.credential)
        session.signIn(email)
      } catch (e) {
        setError(e.message || 'Sign-in failed.')
      }
    }
    const init = () => {
      if (!window.google?.accounts?.id || !gbtn.current) return
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential })
      window.google.accounts.id.renderButton(gbtn.current, { theme: 'outline', size: 'large', width: 320, text: 'signin_with' })
    }
    if (window.google?.accounts?.id) return init()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = init
    document.head.appendChild(s)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sso])

  const submit = (e) => {
    e.preventDefault()
    const email = value.trim().toLowerCase()
    if (!isCompanyEmail(email)) {
      setError(`Please use your @${ALLOWED_DOMAIN} email address.`)
      return
    }
    if (password !== SITE_PASSWORD) {
      setError('Incorrect site password.')
      return
    }
    session.signIn(email)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 24 }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '36px 40px',
          width: 420,
          maxWidth: '100%',
          boxShadow: 'var(--sh)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <img className="brand-logo" src={import.meta.env.BASE_URL + 'Fuse_Energy_logo.png'} alt="Fuse" style={{ height: 30, width: 'auto', display: 'block' }} />
          <h1 style={{ fontSize: 19, fontWeight: 600 }}>Access Service Desk</h1>
        </div>
        <p style={{ color: 'var(--soft)', marginBottom: 18, fontSize: 13.5 }}>
          Sign in with your Fuse Energy account to raise and track access requests.
        </p>

        {sso && (
          <>
            <div ref={gbtn} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />
            <div className="or-sep">or sign in with the site password</div>
          </>
        )}

        <form onSubmit={submit}>
          <div className="field">
            <label>Work email</label>
            <input
              type="email"
              placeholder={`you@${ALLOWED_DOMAIN}`}
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(null) }}
            />
          </div>
          <div className="field">
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span>Site password <span style={{ color: 'var(--faint)', fontWeight: 400 }}>(case-sensitive)</span></span>
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                style={{ background: 'none', border: 'none', color: 'var(--nav)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}
              >
                {showPwd ? 'Hide' : 'Show'}
              </button>
            </label>
            <input
              type={showPwd ? 'text' : 'password'}
              placeholder="Shared access password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null) }}
            />
          </div>
          {error && <div className="validation" style={{ marginBottom: 14 }}>{error}</div>}
          <button className="btn primary" type="submit" style={{ width: '100%', height: 40, justifyContent: 'center' }}>
            Continue
          </button>
        </form>

        <p style={{ color: 'var(--faint)', marginTop: 16, fontSize: 12, lineHeight: 1.5 }}>
          Staff can submit requests and track their own tickets. Administrators manage and resolve
          all requests. The primary owners manage who is an administrator.
        </p>
      </div>
    </div>
  )
}
