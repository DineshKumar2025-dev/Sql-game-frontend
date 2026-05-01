import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Main from './pages/main'
import Home from './pages/home/home'
import Levels from './pages/levels/levels'
import Level1 from './pages/game/level1'
import Authanticate from './authenticate/Authanticate'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => Boolean(localStorage.getItem('login_status')),
  )

  if (!isLoggedIn) {
    return <Authanticate onLoginSuccess={() => setIsLoggedIn(true)} />
  }

  return (
    <Routes>
      <Route path="/" element={<Main />}>
        <Route index element={<Home />} />
        <Route path="levels" element={<Levels />} />
        <Route path="levels/1" element={<Level1 />} />
      </Route>
    </Routes>
  )
}

export default App