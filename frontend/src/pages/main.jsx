import { useNavigate, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import { Outlet } from 'react-router-dom'

function Main() {
  const navigate = useNavigate()
  const location = useLocation()
  const activePage = location.pathname.startsWith('/levels') ? 'levels' : 'home'

  const handleLogout = () => {
    localStorage.removeItem('login_status')
    window.location.reload()
  }

  return (
    <div className="app-shell">
      <Topbar
        activePage={activePage}
        onHome={() => navigate('/')}
        onLevels={() => navigate('/levels')}
        onLogout={handleLogout}
      />
      <Outlet />
    </div>
  )
}

export default Main