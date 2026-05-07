import './levels.css'
import { useState, useEffect } from 'react'
import Playmap from '../playmap'

const API_BASE = import.meta.env.VITE_API_URL 
const highest_level_completed = Number(localStorage.getItem('highest_level_completed')) || 0;
function Levels() {
  const [level] = useState(highest_level_completed)

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

  const currentLevel = Number(level)
  const getStatus = (id) => {
    if (id <= currentLevel) return 'completed'
    if (id === currentLevel+1) return 'current'
    return 'locked'
  }

  return (
    <main className="levels-page">
      <section className="levels-hero">
        <p className="levels-badge">Case Terminal // Investigation Grid</p>
        <h1>Select a Confidential Case File</h1>
        <p>
          Every query brings you closer to the truth... or deeper into the lie. Clear each case
          file to unlock restricted evidence in the next one.
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
