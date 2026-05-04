import './levels.css'
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Playmap from '../playmap'

const API_BASE = import.meta.env.VITE_API_URL 
const highest_level_completed = Number(localStorage.getItem('highest_level_completed')) || 0;
function Levels() {
  const location = useLocation()
  const [level, setLevel] = useState(highest_level_completed)

  useEffect(() => {
    if (location.pathname === '/levels') {
      setLevel(highest_level_completed)
    }
  }, [location.pathname])

  useEffect(() => {
    localStorage.setItem('level', String(level))
  }, [level])

  const [levels, setLevels] = useState([])
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadError(null)
      try {
        const res = await fetch(`${API_BASE}/api/getlevels`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || res.statusText)
        }
        const data = await res.json()
        if (cancelled) return
        const withRoutes = (Array.isArray(data) ? data : []).map((row) => ({
          ...row,
          page: `/levels/${row.id}`,
        }))
        setLevels(withRoutes)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load levels:', err)
          setLoadError(err.message || 'Failed to load levels')
          setLevels([])
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const currentLevel = Number(level) || 1
  const getStatus = (id) => {
    if (id < currentLevel) return 'completed'
    if (id === currentLevel) return 'current'
    return 'locked'
  }

  return (
    <main className="levels-page">
      <section className="levels-hero">
        <p className="levels-badge">Detective Progress Map</p>
        <h1>Choose Your SQL Mission</h1>
        <p>
          Follow the roadmap from beginner to pro. Complete each level to unlock the next
          mystery chapter.
        </p>
      </section>

      {loadError ? (
        <p className="levels-load-error" role="alert">
          Could not load levels: {loadError}
        </p>
      ) : null}

      {levels.length > 0 ? (
        <Playmap levels={levels} getStatus={getStatus} />
      ) : !loadError ? (
        <p className="levels-loading">Loading missions…</p>
      ) : null}
    </main>
  )
}

export default Levels
