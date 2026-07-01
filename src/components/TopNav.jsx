import { displayName } from '../auth/session'

const ROLE_LABEL = { owner: 'Primary owner', admin: 'Administrator', user: 'Requester' }
const ROLE_TAG = { owner: 'purple', admin: 'green', user: 'grey' }

function initials(email) {
  const name = displayName(email)
  const parts = name.split(' ').filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U'
}

export default function TopNav({ onCreate, email, role, onSignOut, onHelp, search, onToggleSidebar, theme, onToggleTheme }) {
  return (
    <nav className="topnav">
      {onToggleSidebar && (
        <button className="iconbtn" onClick={onToggleSidebar} title="Show/hide menu" aria-label="Toggle menu">
          ☰
        </button>
      )}
      <div className="logo">
        <img className="brand-mark" src={import.meta.env.BASE_URL + 'logo.svg'} alt="Fuse" width="26" height="26" /> Access Service Desk
      </div>
      <span className="crumb">
        <b>Fuse Energy</b>
      </span>
      <div className="nav-r">
        {search}
        {onToggleTheme && (
          <button className="iconbtn" onClick={onToggleTheme} title="Toggle dark / light mode" aria-label="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        )}
        {onHelp && (
          <button className="btn" onClick={onHelp} title="Help & knowledge base">
            ? Help
          </button>
        )}
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
