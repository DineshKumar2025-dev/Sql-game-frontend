import { useState } from 'react'
import { Routes, Route, useParams } from 'react-router-dom'
import Main from './pages/main'
import Home from './pages/home/home'
import Levels from './pages/levels/levels'
import Level1 from './pages/game/level1'
import Level2 from './pages/game/level2'
import Level3 from './pages/game/level3'
import Level4 from './pages/game/level4'
import Level5 from './pages/game/level5'
import Level6 from './pages/game/level6'
import Level7 from './pages/game/level7'
import Level8 from './pages/game/level8'
import Level9 from './pages/game/level9'
import Authanticate from './authenticate/Authanticate'
import 'bootstrap/dist/css/bootstrap.min.css'

function LevelRoute() {
  const { levelId } = useParams()
  if (levelId === '1') return <Level1 />
  if (levelId === '2') return <Level2 />
  if (levelId === '3') return <Level3 />
  if (levelId === '4') return <Level4 />
  if (levelId === '5') return <Level5 />
  if (levelId === '6') return <Level6 />
  if (levelId === '7') return <Level7 />
  if (levelId === '8') return <Level8 />
  if (levelId === '9') return <Level9 />
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