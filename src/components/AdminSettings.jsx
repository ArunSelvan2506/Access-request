import { useState } from 'react'
import { OWNER_EMAIL, isCompanyEmail, displayName } from '../auth/session'
import { useToast } from './common/Toast'

// Owner-only screen to manage administrators — mirrors Jira's project people
// management. The primary owner is fixed and cannot be removed.
export default function AdminSettings({ session }) {
  const { admins, addAdmin, removeAdmin } = session
  const [value, setValue] = useState('')
  const toast = useToast()

  const add = (e) => {
    e.preventDefault()
    const email = value.trim().toLowerCase()
    if (!isCompanyEmail(email)) {
      toast('Enter a valid @fuseenergy.com email', 'bad')
      return
    }
    if (email === OWNER_EMAIL) {
      toast('That is the primary owner', 'bad')
      return
    }
    if (admins.includes(email)) {
      toast('Already an administrator', 'bad')
      return
    }
    addAdmin(email)
    setValue('')
    toast('Added administrator: ' + email, 'good')
  }

  const Row = ({ email, role, removable }) => (
    <div className="rule" style={{ alignItems: 'center' }}>
      <div className="ric" style={{ background: 'var(--blue-bg)', color: 'var(--blue-tx)', fontWeight: 700 }}>
        {displayName(email).split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div>
        <h4>{displayName(email)}</h4>
        <p>{email}</p>
      </div>
      <div className="toggle" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className={'tag ' + (role === 'Primary owner' ? 'purple' : 'green')}>{role}</span>
        {removable && (
          <button
            className="btn"
            onClick={() => {
              removeAdmin(email)
              toast('Removed administrator: ' + email, 'good')
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  )

  return (
    <section className="view">
      <h1 className="title">Admin settings</h1>
      <p className="sub">
        Manage who can see and resolve all requests. Administrators can change ticket status; the
        primary owner can add or remove administrators. Everyone else can only submit and track
        their own requests.
      </p>

      <div className="callout warn" style={{ marginBottom: 18 }}>
        🔒 Roles are enforced in the browser for this demo. Real, server-enforced access control
        (Google sign-in restricted to your company) comes with the backend.
      </div>

      <div className="sec" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--faint)', margin: '0 0 8px' }}>
        People with full access
      </div>
      <Row email={OWNER_EMAIL} role="Primary owner" removable={false} />
      {admins.map((a) => (
        <Row key={a} email={a} role="Administrator" removable />
      ))}

      <form onSubmit={add} style={{ marginTop: 18, display: 'flex', gap: 8, maxWidth: 460 }}>
        <input
          className="field"
          style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 10px', fontSize: 13 }}
          type="email"
          placeholder="new-admin@fuseenergy.com"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button className="btn primary" type="submit">
          Add administrator
        </button>
      </form>
    </section>
  )
}
