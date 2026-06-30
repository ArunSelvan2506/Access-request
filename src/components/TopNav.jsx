export default function TopNav({ onCreate }) {
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
        <div className="avatar">SC</div>
      </div>
    </nav>
  )
}
