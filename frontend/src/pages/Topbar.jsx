import './Topbar.css'

function Topbar({
  gameName = 'SQL Game',
  activePage = 'home',
  onHome = () => {},
  onLevels = () => {},
  onLogout = () => {},
}) {
  return (
    <header className="topbar">
      <h1 className="topbar-brand">{gameName}</h1>

      <nav className="topbar-nav" aria-label="Main navigation">
        <button
          type="button"
          onClick={onHome}
          className={`topbar-nav-btn ${activePage === 'home' ? 'is-active' : ''}`}
        >
          Home
        </button>

        <button
          type="button"
          onClick={onLevels}
          className={`topbar-nav-btn ${activePage === 'levels' ? 'is-active' : ''}`}
        >
          Levels
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="topbar-logout-btn"
          aria-label="Logout"
          title="Logout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10 17l5-5-5-5M15 12H4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </nav>
    </header>
  )
}

export default Topbar
