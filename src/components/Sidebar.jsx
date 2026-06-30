// Role-aware sidebar.
//  - users see only their own requests + the catalog reference
//  - admins see the full operational set (dashboard, queues, board)
//  - the owner additionally sees Admin settings
function NavLink({ item, active, counts, onSelect }) {
  const isActive = active.view === item.view && (active.q || null) === (item.q || null)
  return (
    <a
      className={'nav-item' + (isActive ? ' active' : '')}
      onClick={() => onSelect(item.view, item.q || null)}
    >
      {item.label}
      {item.countKey != null && <span className="count">{counts[item.countKey]}</span>}
    </a>
  )
}

export default function Sidebar({ active, counts, onSelect, isAdmin, isOwner }) {
  if (!isAdmin) {
    // Regular user: minimal portal view. Show Approvals only if they have any
    // requests awaiting their decision as a line manager.
    const items = [{ view: 'queue', label: '🎫 My requests', countKey: 'mine' }]
    if (counts.approvals > 0) items.push({ view: 'approvals', label: '✅ My approvals', countKey: 'approvals' })
    items.push({ view: 'catalog', label: '📚 Service catalog' })
    return (
      <aside className="sidebar">
        <h3>Requests</h3>
        {items.map((it, i) => (
          <NavLink key={i} item={it} active={active} counts={counts} onSelect={onSelect} />
        ))}
      </aside>
    )
  }

  const queues = [
    { view: 'dashboard', label: '📊 Dashboard' },
    { view: 'queue', label: '🎫 All requests', countKey: 'all' },
    { view: 'approvals', label: '✅ Approvals', countKey: 'approvals' },
    { view: 'queue', q: 'open', label: '📥 Open', countKey: 'open' },
    { view: 'queue', q: 'breach', label: '⏰ SLA at risk', countKey: 'breach' },
    { view: 'board', label: '🗂️ Board' },
    { view: 'reports', label: '📈 Reports' },
  ]
  const configure = [
    { view: 'autos', label: '⚡ Automations' },
    { view: 'catalog', label: '📚 Catalog & rules' },
  ]
  if (isOwner) configure.push({ view: 'admins', label: '🔑 Admin settings' })

  return (
    <aside className="sidebar">
      <h3>Queues</h3>
      {queues.map((it, i) => (
        <NavLink key={i} item={it} active={active} counts={counts} onSelect={onSelect} />
      ))}
      <h3>Configure</h3>
      {configure.map((it, i) => (
        <NavLink key={i} item={it} active={active} counts={counts} onSelect={onSelect} />
      ))}
    </aside>
  )
}
