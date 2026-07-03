import { useState, useEffect, useRef } from 'react'
import { displayName, OWNER_EMAIL } from '../auth/session'

const ROLE_LABEL = { owner: 'Owner', admin: 'Administrator', user: 'Requester' }
const ROLE_TAG = { owner: 'purple', admin: 'green', user: 'grey' }

function initials(email) {
  const name = displayName(email)
  const parts = name.split(' ').filter(Boolean)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'U'
}

export default function TopNav({ onCreate, email, role, onSignOut, onHelp, search, onToggleSidebar, theme, onToggleTheme }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const roleLabel = role === 'owner' && email === OWNER_EMAIL ? 'Primary owner' : ROLE_LABEL[role]

  // Close the account menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  return (
    <nav className="topnav">
      {onToggleSidebar && (
        <button className="iconbtn" onClick={onToggleSidebar} title="Show/hide menu" aria-label="Toggle menu">
          ☰
        </button>
      )}
      <div className="logo">
        <img className="brand-logo" src={import.meta.env.BASE_URL + 'Fuse_Energy_logo.png'} alt="Fuse" />
        <span className="brand-title">Access Service Desk</span>
      </div>
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
        {role && <span className={'tag ' + (ROLE_TAG[role] || 'grey')}>{roleLabel}</span>}
        <div className="profile" ref={menuRef}>
          <button
            className="avatar"
            title="Account"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {initials(email)}
          </button>
          {menuOpen && (
            <div className="profile-menu" role="menu">
              <div className="pm-head">
                <div className="pm-name">{displayName(email)}</div>
                <div className="pm-email">{email}</div>
                {role && <span className={'tag ' + (ROLE_TAG[role] || 'grey')} style={{ marginTop: 8 }}>{roleLabel}</span>}
              </div>
              <button className="pm-item" role="menuitem" onClick={() => { setMenuOpen(false); onSignOut() }}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
