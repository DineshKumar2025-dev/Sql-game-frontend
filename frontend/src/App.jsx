import { useState } from 'react'
import { Routes, Route, useParams } from 'react-router-dom'
import Main from './pages/main'
import Home from './pages/home/home'
import Levels from './pages/levels/levels'
import Level1 from './pages/game/level1'
import Authanticate from './authenticate/Authanticate'
import 'bootstrap/dist/css/bootstrap.min.css'

function LevelRoute() {
  const { levelId } = useParams()
  if (levelId === '1') return <Level1 />
  return (
    <main className="p-4 text-light" style={{ minHeight: '50vh' }}>
      <h1>Level {levelId}</h1>
      <p className="text-secondary">This mission is not available in the app yet.</p>
    </main>
  )
}
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
        <Route path="levels/:levelId" element={<LevelRoute />} />
      </Route>
    </Routes>
  )
}

export default App