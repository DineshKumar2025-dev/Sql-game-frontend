import { useEffect, useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
import sub_level, { get_sql_query } from './common'

const API_BASE = import.meta.env.VITE_API_URL

const sublevels = [
  { id: 'l91', title: 'Find the Slow Queries', briefing: 'Pull slow, index-free queries from the log.', mission: 'Filter query_log by exec_time_ms and used_index.', passCondition: '4 slow queries appear.', reveal: 'Every critical query is scanning full tables.', skill: 'WHERE + ORDER BY' },
  { id: 'l92', title: 'Diagnose With EXPLAIN', briefing: 'See the plan and spot the full scan.', mission: "EXPLAIN SELECT * FROM incidents WHERE district = 'Central'.", passCondition: 'Plan output is returned.', reveal: 'No index: sequential scan.', skill: 'EXPLAIN' },
  { id: 'l93', title: 'Create a District Index', briefing: 'Index incidents.district.', mission: 'CREATE INDEX idx_incidents_district ON incidents(district).', passCondition: 'Index exists in sqlite_master.', reveal: 'District filters can now use an index.', skill: 'CREATE INDEX' },
  { id: 'l94', title: 'Index on Threat Flag', briefing: 'Index citizens.threat_flag, then EXPLAIN the threat query.', mission: 'CREATE INDEX ...; EXPLAIN ...', passCondition: 'Index exists.', reveal: 'Threat lookups drop to milliseconds.', skill: 'Index + EXPLAIN' },
  { id: 'l95', title: 'Composite Index for Severity + District', briefing: 'Create composite index on incidents(severity, district).', mission: 'CREATE INDEX ...; EXPLAIN ...', passCondition: 'Composite index exists.', reveal: 'CRITICAL incidents in Central can be flagged instantly.', skill: 'Composite index' },
  { id: 'l96', title: 'Final System Check', briefing: 'Pull unresolved CRITICAL incidents involving flagged citizens.', mission: 'JOIN incidents + citizens with filters.', passCondition: 'Victor Crane appears twice.', reveal: 'Arrest list complete.', skill: 'JOIN + filters' },
  { id: 'l97', title: 'Log the Fixed Queries', briefing: 'Insert a new log row showing the optimized query uses an index.', mission: 'INSERT into query_log, then SELECT last 2 rows.', passCondition: 'Latest row shows 12ms and used_index true.', reveal: 'Surveillance restored. All 9 case files: CLOSED.', skill: 'INSERT + LIMIT' },
]

const CASE_COMPLETE = '__case_complete__'

function initialMaxUnlocked() {
  const chapter = Number(localStorage.getItem('level') ?? '1')
  return !Number.isNaN(chapter) && chapter >= 12 ? CASE_COMPLETE : 'l91'
}

const citizensFields = ['id (PK)', 'name', 'district', 'threat_flag', 'last_seen']
const incidentsFields = ['id (PK)', 'citizen_id (FK)', 'type', 'district', 'severity', 'timestamp', 'resolved']
const queryLogFields = ['id (PK)', 'query_text', 'exec_time_ms', 'ran_at', 'used_index']

function getStoredUserId() {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const user = JSON.parse(raw)
    const id = user?.user_id ?? user?.id
    return id != null ? Number(id) : null
  } catch {
    return null
  }
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

function Level9() {
  const [currentSublevel, setCurrentSublevel] = useState('l91')

  const resolveSublevelId = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (sublevels.some((sub) => sub.id === normalized)) return normalized
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const mapped = `l9${value}`
      if (sublevels.some((sub) => sub.id === mapped)) return mapped
    }
    return null
  }

  const [maxUnlocked, setMaxUnlocked] = useState(initialMaxUnlocked)

  useEffect(() => {
    const fetchSublevel = async () => {
      try {
        const backendSublevel = await sub_level(9)
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
  useEffect(() => {
    if (!selected?.id) return
    get_sql_query(selected.id)
      .then((query) => setSqlInput(query ?? ''))
      .catch((err) => console.error('Failed to load query:', err))
  }, [selected?.id])

  const [message, setMessage] = useState('')
  const [queryOutput, setQueryOutput] = useState([])
  const [tablePositions, setTablePositions] = useState({
    citizens: { x: 40, y: 60 },
    incidents: { x: 520, y: 60 },
    queryLog: { x: 280, y: 310 },
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

  const normalize = (text) => text.replace(/\\s+/g, ' ').trim()

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
    const level = 9
    const sublevel = currentSublevel
    if (!query) {
      setMessage('Write a SQL query before running the check.')
      return
    }

    try {
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
          const unlockedLevel = Number(localStorage.getItem('level') ?? '1')
          localStorage.setItem(
            'level',
            String(Number.isNaN(unlockedLevel) ? 10 : Math.max(unlockedLevel, 10)),
          )
        }
        return
      }

      setMessage(data.error ?? 'Not quite. Compare your result with mission goal.')
    } catch (error) {
      console.error('Error:', error)
      setMessage(`Something went wrong: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const w = tableSize.width
  const h = tableSize.height
  const ct = tablePositions.citizens
  const ic = tablePositions.incidents

  return (
    <main className="level-page">
      <section className="level-hero">
        <p className="case-badge">Case File 09</p>
        <h1>The Slow Burn</h1>
        <p className="meta">Neo Lumina, 2051 — Indexes &amp; Optimization</p>
        <p>Restore CityWatch query speed, then generate the final arrest list.</p>
      </section>

      <section className="schema-board-wrap">
        <div className="schema-board" ref={schemaBoardRef}>
          <svg className="schema-links" aria-hidden="true">
            <line x1={ct.x + w} y1={ct.y + h / 2} x2={ic.x} y2={ic.y + h / 2} />
            <text x={(ct.x + w + ic.x) / 2 - 66} y={(ct.y + h / 2 + ic.y + h / 2) / 2 - 8}>
              citizen_id -&gt; citizens.id
            </text>
          </svg>

          <DraggableNode
            id="citizens"
            title="citizens"
            fields={citizensFields}
            position={tablePositions.citizens}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
          <DraggableNode
            id="incidents"
            title="incidents"
            fields={incidentsFields}
            position={tablePositions.incidents}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
          <DraggableNode
            id="queryLog"
            title="query_log"
            fields={queryLogFields}
            position={tablePositions.queryLog}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
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
            <button type="button" className="check-btn my-2" onClick={handleCheckAnswer}>
              Run Query Check
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
    </main>
  )
}

export default Level9
