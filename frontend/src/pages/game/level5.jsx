import { useEffect, useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
import SchemaZoomControls from './SchemaZoomControls'
import sub_level, { get_sql_query } from './common'

const API_BASE = import.meta.env.VITE_API_URL

const sublevels = [
  {
    id: 'l51',
    title: 'Agents Earning Above Average',
    briefing: 'Find agents paid above the network average salary.',
    mission: 'Use a subquery to compare salary > AVG(salary).',
    passCondition: 'APEX and GHOST appear.',
    reveal: 'High pay equals high trust — the inner ring is small.',
    skill: 'Subquery + AVG()',
  },
  {
    id: 'l52',
    title: 'Agents Who Issued Critical Orders',
    briefing: 'Find who issued CRITICAL priority orders.',
    mission: 'Subquery with IN() against orders.',
    passCondition: 'GHOST is the issuer.',
    reveal: 'Marcus Veil is the trigger man, keeping APEX insulated.',
    skill: 'IN (subquery)',
  },
  {
    id: 'l53',
    title: 'Who Reports to the Top?',
    briefing: 'Find agents who report directly to the highest-paid agent.',
    mission: 'Subquery to find top salary agent id.',
    passCondition: 'Only GHOST reports to APEX.',
    reveal: 'One clean line. One trusted operator.',
    skill: 'Subquery + ORDER BY + LIMIT',
  },
  {
    id: 'l54',
    title: 'Operations Ordered by High-Salary Agents',
    briefing: 'Show operations ordered by agents earning > 100,000.',
    mission: 'Subquery to filter issued_by.',
    passCondition: 'Dirty work ties back to the expensive agents.',
    reveal: 'Money buys silence and authority in this network.',
    skill: 'WHERE IN (subquery)',
  },
  {
    id: 'l55',
    title: 'Inactive Agents in the Network',
    briefing: 'Find inactive agents who never issued any order.',
    mission: 'Use NOT IN with a distinct subquery of orders.',
    passCondition: 'WRAITH is returned.',
    reveal: 'A burned asset. A ghost inside a ghost system.',
    skill: 'NOT IN (subquery)',
  },
  {
    id: 'l56',
    title: 'The Chain to the Top',
    briefing: 'Find agents whose chain of command leads to APEX.',
    mission: 'Nested subqueries on reports_to.',
    passCondition: 'The hierarchy under APEX is exposed.',
    reveal: 'Victor Crane (APEX) is the Puppet Master. Moving to Case File 06.',
    skill: 'Nested subqueries',
  },
]

const CASE_COMPLETE = '__case_complete__'

function initialMaxUnlocked() {
  return sublevels[0]?.id ?? 'l51'
}

const agentsFields = ['id (PK)', 'codename', 'real_name', 'reports_to (FK)', 'salary', 'active']
const ordersFields = ['id (PK)', 'issued_by (FK)', 'target', 'operation', 'priority', 'date']

function getStoredUserId() {
  return localStorage.getItem('user_id');
}

async function readJsonResponse(response) {
  const text = await response.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { _parseError: true, _raw: text.slice(0, 200) }
  }
}

function Level5() {
  const [currentSublevel, setCurrentSublevel] = useState('l51')

  const resolveSublevelId = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (sublevels.some((sub) => sub.id === normalized)) return normalized
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const mapped = `l5${value}`
      if (sublevels.some((sub) => sub.id === mapped)) return mapped
    }
    return null
  }

  const [maxUnlocked, setMaxUnlocked] = useState(initialMaxUnlocked)

  useEffect(() => {
    const fetchSublevel = async () => {
      try {
        const backendSublevel = await sub_level(5)
        const resolved = resolveSublevelId(backendSublevel)
        if (resolved) {
          setCurrentSublevel(resolved)
          setMaxUnlocked(resolved)
        }
      } catch (error) {
        console.error('Failed to load saved sublevel:', error)
      }
    }
    fetchSublevel()
  }, [])

  const selected = useMemo(
    () => sublevels.find((sub) => sub.id === currentSublevel) ?? sublevels[0],
    [currentSublevel],
  )

  const [sqlInput, setSqlInput] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  useEffect(() => {
    if (!selected?.id) return
    get_sql_query(selected.id)
      .then((query) => setSqlInput(query ?? ''))
      .catch((err) => console.error('Failed to load query:', err))
  }, [selected?.id])

  const [message, setMessage] = useState('')
  const [queryOutput, setQueryOutput] = useState([])
  const [tablePositions, setTablePositions] = useState({
    agents: { x: 40, y: 120 },
    orders: { x: 520, y: 260 },
  })
  const schemaBoardRef = useRef(null)
  const tableSize = { width: 300, height: 190 }

  const getStatus = (id) => {
    if (maxUnlocked === CASE_COMPLETE) {
      const idx = sublevels.findIndex((s) => s.id === id)
      return idx >= 0 ? 'completed' : 'locked'
    }
    const maxIdx = sublevels.findIndex((s) => s.id === maxUnlocked)
    const idx = sublevels.findIndex((s) => s.id === id)
    if (idx < 0 || maxIdx < 0) return 'locked'
    if (idx < maxIdx) return 'completed'
    if (idx === maxIdx) return 'current'
    return 'locked'
  }

  const normalize = (text) => text.replace(/\s+/g, ' ').trim()

  const formatApiDetail = (detail) => {
    if (detail == null) return null
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail
        .map((entry) => (typeof entry === 'object' && entry?.msg ? entry.msg : String(entry)))
        .join(' ')
    }
    return String(detail)
  }

  const updateTablePosition = (tableId, position) => {
    setTablePositions((prev) => ({ ...prev, [tableId]: position }))
  }

  const handleCheckAnswer = async () => {
    const user_id = getStoredUserId()
    const query = normalize(sqlInput)
    const level = 5
    const sublevel = currentSublevel
    if (!query) {
      setMessage('Write a SQL query before running the check.')
      return
    }

    if (isChecking) return
    try {
      setIsChecking(true)
      setQueryOutput([])
      const response = await fetch(`${API_BASE}/api/verifycode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, level, sublevel, user_id: user_id }),
      })

      const data = await readJsonResponse(response)
      if (data._parseError) {
        setMessage(
          response.ok
            ? 'Server returned a non-JSON response.'
            : `Request failed (${response.status}). ${data._raw || ''}`.trim(),
        )
        return
      }
      if (!response.ok) {
        setMessage(formatApiDetail(data.detail) ?? 'Failed to verify query.')
        return
      }

      setQueryOutput(Array.isArray(data.output) ? data.output : [])

      if (data.is_correct) {
        setMessage(`Solved! ${selected.reveal}`)
        const idx = sublevels.findIndex((s) => s.id === selected.id)
        const finalSublevelId = sublevels[sublevels.length - 1]?.id
        const isFinal = selected.id === finalSublevelId

        if (idx >= 0) {
          if (isFinal) setMaxUnlocked(CASE_COMPLETE)
          else {
            const nextIdx = Math.min(idx + 1, sublevels.length - 1)
            const nextId = sublevels[nextIdx].id
            const maxIdx = sublevels.findIndex((s) => s.id === maxUnlocked)
            if (nextIdx > maxIdx) setMaxUnlocked(nextId)
          }
        }

        if (isFinal) {
          const prev = Number(localStorage.getItem('highest_level_completed') ?? '0')
          localStorage.setItem('highest_level_completed', String(Math.max(prev, 5)))
        }

        return
      }

      setMessage(data.error ?? 'Not quite. Compare your result with mission goal.')
    } catch (error) {
      console.error('Error:', error)
      setMessage(`Something went wrong: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsChecking(false)
    }
  }

  const ag = tablePositions.agents
  const or = tablePositions.orders
  const w = tableSize.width
  const h = tableSize.height

  return (
    <main className="level-page">
      <section className="level-hero">
        <p className="case-badge">Case File 05</p>
        <h1>The Puppet Master</h1>
        <p className="meta">Neo Lumina, 2051 — Subqueries</p>
        <p>
          NexusVoid runs through proxy layers. Peel them with queries inside queries until the chain
          points to the controller at the center.
        </p>
      </section>

      <section className="schema-board-wrap">
        <SchemaZoomControls boardRef={schemaBoardRef} />
        <div className="schema-board" ref={schemaBoardRef}>
          <div className="schema-board-canvas">
          <svg className="schema-links" aria-hidden="true">
            <line x1={ag.x + w} y1={ag.y + h / 2} x2={or.x} y2={or.y + h / 2} />
            <text x={(ag.x + w + or.x) / 2 - 56} y={(ag.y + h / 2 + or.y + h / 2) / 2 - 8}>
              issued_by -&gt; agents.id
            </text>
          </svg>

          <DraggableNode
            id="agents"
            title="agents"
            fields={agentsFields}
            position={tablePositions.agents}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
          <DraggableNode
            id="orders"
            title="orders"
            fields={ordersFields}
            position={tablePositions.orders}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
          </div>
        </div>
      </section>

      <section className="container">
        <div className="row ">
          <section className="sublevel-map col-lg-6" aria-label="Sublevel roadmap">
            {sublevels.map((sub, index) => {
              const status = getStatus(sub.id)
              const isLocked = status === 'locked'
              return (
                <div
                  key={String(sub.id)}
                  className={`sublevel-wrapper ${index % 2 === 0 ? 'left' : 'right'} ${status}`}
                >
                  <div className="sublevel-path" aria-hidden="true" />
                  <button
                    type="button"
                    className={`sublevel-node ${status}`}
                    disabled={isLocked}
                    onClick={() => {
                      if (!isLocked) {
                        setCurrentSublevel(sub.id)
                        setSqlInput('')
                        setMessage('')
                        setQueryOutput([])
                      }
                    }}
                  >
                    <span>{sub.id.slice(-1)}</span>
                  </button>
                  <article className={`sublevel-card ${status}`}>
                    <h3>{sub.title}</h3>
                    <p>{sub.skill}</p>
                  </article>
                </div>
              )
            })}
          </section>

          <section className="challenge-panel col-lg-6 h-100">
            <p className="sub-id">Sublevel {selected.id}</p>
            <h2>{selected.title}</h2>
            <p>
              <strong>Briefing:</strong> {selected.briefing}
            </p>
            <p>
              <strong>Mission:</strong> {selected.mission}
            </p>
            <p>
              <strong>Pass condition:</strong> {selected.passCondition}
            </p>
            <textarea
              className="sql-input"
              placeholder="Write your SQL query here..."
              value={sqlInput}
              onChange={(e) => setSqlInput(e.target.value)}
            />
            <button
              type="button"
              className={`check-btn my-2 ${isChecking ? 'is-loading' : ''}`}
              onClick={handleCheckAnswer}
              disabled={isChecking}
            >
              {isChecking ? <span className="btn-spinner" aria-hidden="true" /> : null}
              {isChecking ? 'Executing…' : 'Run Query Check'}
            </button>
            {message && <p className="feedback">{message}</p>}
            {queryOutput.length > 0 && (
              <div className="feedback" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {Object.keys(queryOutput[0]).map((column) => (
                        <th
                          key={column}
                          style={{
                            border: '1px solid #4a4a4a',
                            padding: '8px',
                            textAlign: 'left',
                          }}
                        >
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {queryOutput.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {Object.keys(queryOutput[0]).map((column) => (
                          <td
                            key={`${rowIndex}-${column}`}
                            style={{ border: '1px solid #4a4a4a', padding: '8px' }}
                          >
                            {String(row[column] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </section>

      <section className="skills-covered mt-2">
        <h2>SQL Skills Covered in Case File 05</h2>
        <ul>
          <li>Scalar subqueries (AVG, MAX)</li>
          <li>IN / NOT IN subqueries</li>
          <li>Nested subqueries to trace hierarchy</li>
        </ul>
      </section>
    </main>
  )
}

export default Level5
