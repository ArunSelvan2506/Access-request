// Derive up-to-two-letter initials from a display name or email.
function initials(user) {
  if (!user) return 'SC'
  const name = user.displayName || user.email || ''
  const parts = name.replace(/@.*/, '').split(/[.\s-]+/).filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U'
}

export default function TopNav({ onCreate, user, onSignOut }) {
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
        {onSignOut ? (
          <button
            className="avatar"
            title={`${user?.displayName || user?.email || ''} — sign out`}
            onClick={onSignOut}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {initials(user)}
          </button>
        ) : (
          <div className="avatar">{initials(user)}</div>
        )}
      </div>
    </nav>
  )
}
