import { displayName } from '../auth/session'

const ROLE_LABEL = { owner: 'Primary owner', admin: 'Administrator', user: 'Requester' }
const ROLE_TAG = { owner: 'purple', admin: 'green', user: 'grey' }

function initials(email) {
  const name = displayName(email)
  const parts = name.split(' ').filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U'
}

export default function TopNav({ onCreate, email, role, onSignOut }) {
  return (
    <nav className="topnav">
      <div className="logo">
        <span className="mark">A</span> Access Service Desk
      </div>
      <span className="crumb">
        Projects / <b>Access Requests (ACC)</b>
      </span>
      <div className="nav-r">
        <button className="btn primary" onClick={onCreate}>
          + Create
        </button>
        {role && <span className={'tag ' + (ROLE_TAG[role] || 'grey')}>{ROLE_LABEL[role]}</span>}
        <button
          className="avatar"
          title={`${email} — sign out`}
          onClick={onSignOut}
          style={{ border: 'none', cursor: 'pointer' }}
        >
          {initials(email)}
        </button>
      </div>
    </nav>
  )
}
