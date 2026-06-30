// Sidebar navigation. Each item identifies a view, and queue items can carry a
// queue filter `q` ("open" | "breach"). `active` is the current selection.
const ITEMS = [
  { view: 'dashboard', label: '📊 Dashboard' },
  { view: 'queue', label: '🎫 All requests', countKey: 'all' },
  { view: 'queue', q: 'open', label: '📥 Open', countKey: 'open' },
  { view: 'queue', q: 'breach', label: '⏰ SLA at risk', countKey: 'breach' },
  { view: 'board', label: '🗂️ Board' },
]

const CONFIG_ITEMS = [
  { view: 'autos', label: '⚡ Automations' },
  { view: 'catalog', label: '📚 Catalog & rules' },
]

export default function Sidebar({ active, counts, onSelect }) {
  const renderItem = (item, i) => {
    const isActive = active.view === item.view && (active.q || null) === (item.q || null)
    return (
      <a
        key={item.view + (item.q || '') + i}
        className={'nav-item' + (isActive ? ' active' : '')}
        onClick={() => onSelect(item.view, item.q || null)}
      >
        {item.label}
        {item.countKey != null && <span className="count">{counts[item.countKey]}</span>}
      </a>
    )
  }

  return (
    <aside className="sidebar">
      <h3>Queues</h3>
      {ITEMS.map(renderItem)}
      <h3>Configure</h3>
      {CONFIG_ITEMS.map(renderItem)}
    </aside>
  )
}
