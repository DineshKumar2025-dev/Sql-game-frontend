import { useNavigate, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import { Outlet } from 'react-router-dom'

function Main() {
  const navigate = useNavigate()
  const location = useLocation()
  const activePage = location.pathname.startsWith('/levels') ? 'levels' : 'home'

  const handleLogout = () => {
    const keysToClear = [
      'login_status',
      'auth_token',
      'auth_user',
      'highest_level_completed',
    ]
    keysToClear.forEach((key) => localStorage.removeItem(key))
    sessionStorage.clear()
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