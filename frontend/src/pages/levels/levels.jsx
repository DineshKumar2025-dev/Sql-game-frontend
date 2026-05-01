import './levels.css'
import { useState, useEffect } from 'react'
import Playmap from '../playmap'

function Levels() {
  const [level, setLevel] = useState(
    localStorage.getItem('level') ? parseInt(localStorage.getItem('level'), 10) : 1,
  )

  useEffect(() => {
    localStorage.setItem('level', level)
  }, [level])

  const levels = [
    { id: 1, title: 'Case File 01', topic: 'The Vanishing Employee', page: '/levels/1' },
    { id: 2, title: 'Case File 02', topic: 'ORDER BY and LIMIT', page: '/levels/2' },
    { id: 3, title: 'Case File 03', topic: 'JOINS Basics', page: '/levels/3' },
    { id: 4, title: 'Case File 04', topic: 'GROUP BY and HAVING', page: '/levels/4' },
    { id: 5, title: 'Case File 05', topic: 'Subqueries', page: '/levels/5' },
    { id: 6, title: 'Case File 06', topic: 'CTEs', page: '/levels/6' },
    { id: 7, title: 'Case File 07', topic: 'CRUD Missions', page: '/levels/7' },
    { id: 8, title: 'Case File 08', topic: 'Transactions and ACID', page: '/levels/8' },
    { id: 9, title: 'Case File 09', topic: 'Indexes and Optimization', page: '/levels/9' },
  ]

  const getStatus = (id) => {
    if (id < level) return 'completed'
    if (id === level) return 'current'
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

      <Playmap levels={levels} getStatus={getStatus} setLevel={setLevel} />
    </main>
  )
}

export default Levels