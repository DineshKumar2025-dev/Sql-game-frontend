import { useEffect, useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
import SchemaZoomControls from './SchemaZoomControls'
import sub_level, { get_sql_query } from './common'

const API_BASE = import.meta.env.VITE_API_URL

const sublevels = [
  {
    id: 'l61',
    title: 'Find Encrypted Files',
    briefing: 'Use a CTE to isolate encrypted files, then select from that set.',
    mission: 'WITH encrypted_files AS (...) SELECT * FROM encrypted_files.',
    passCondition: '3 encrypted files on NODE-7 appear.',
    reveal: 'All three scientist backups are encrypted with the same key_id.',
    skill: 'WITH (CTE)',
  },
  {
    id: 'l62',
    title: 'Who Holds the Key?',
    briefing: 'Find who holds key 3, then join to the agent roster.',
    mission: 'CTE for key holder, then JOIN to agents.',
    passCondition: 'KEY-GAMMA-003 maps to APEX.',
    reveal: 'Crane holds the only key to the stolen memories.',
    skill: 'CTE + JOIN',
  },
  {
    id: 'l63',
    title: 'Full Session Timeline',
    briefing: 'CTE all sessions on NODE-7, then order them chronologically.',
    mission: 'WITH node7_sessions AS (...) SELECT * ORDER BY timestamp.',
    passCondition: 'READ → ENCRYPT → COPY phases show up.',
    reveal: 'A methodical three-phase operation.',
    skill: 'CTE + ORDER BY',
  },
  {
    id: 'l64',
    title: 'Files That Were Copied',
    briefing: 'Chain two CTEs: copy sessions, then join to memory files.',
    mission: 'WITH copy_sessions AS (...), copied_files AS (...) SELECT *.',
    passCondition: 'All 3 encrypted files were copied out.',
    reveal: '1,160 MB stolen in two minutes.',
    skill: 'Multiple CTEs',
  },
  {
    id: 'l65',
    title: 'Total Data Stolen Per Node',
    briefing: 'CTE stolen files then GROUP BY archive_node.',
    mission: 'WITH stolen AS (...) SELECT archive_node, COUNT, SUM GROUP BY.',
    passCondition: 'NODE-7 totals 1160 MB.',
    reveal: 'Surgical exfiltration — only scientist memories.',
    skill: 'CTE + GROUP BY',
  },
  {
    id: 'l66',
    title: 'Full Crime Report',
    briefing: 'Build the complete CTE chain and output the evidence rowset.',
    mission: 'CTEs for sessions, stolen files, key info; final SELECT ordered.',
    passCondition: 'Three rows with key_code and timestamps appear.',
    reveal: 'The neural memories are in Crane’s possession. Moving to Case File 07.',
    skill: 'CTE chain',
  },
]

const CASE_COMPLETE = '__case_complete__'

function initialMaxUnlocked() {
  return sublevels[0]?.id ?? 'l61'
}

const agentsFields = ['id (PK)', 'codename', 'real_name', 'reports_to', 'salary', 'active']
const memoryFilesFields = ['id (PK)', 'owner_id', 'file_name', 'size_mb', 'encrypted', 'key_id', 'archive_node']
const keysFields = ['id (PK)', 'key_code', 'issued_to', 'valid', 'created_at']
const sessionsFields = ['id (PK)', 'agent_id', 'node', 'action', 'file_id', 'timestamp']

function getStoredUserId() {
  try {
    const raw = localStorage.getItem('auth_user')
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

function Level6() {
  const [currentSublevel, setCurrentSublevel] = useState('l61')

  const resolveSublevelId = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (sublevels.some((sub) => sub.id === normalized)) return normalized
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const mapped = `l6${value}`
      if (sublevels.some((sub) => sub.id === mapped)) return mapped
    }
    return null
  }

  const [maxUnlocked, setMaxUnlocked] = useState(initialMaxUnlocked)

  useEffect(() => {
    const fetchSublevel = async () => {
      try {
        const backendSublevel = await sub_level(6)
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
    agents: { x: 40, y: 60 },
    encryptionKeys: { x: 520, y: 40 },
    memoryFiles: { x: 60, y: 290 },
    archiveSessions: { x: 520, y: 290 },
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
    const level = 6
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
          localStorage.setItem('highest_level_completed', String(Math.max(prev, 6)))
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
  const ky = tablePositions.encryptionKeys
  const mf = tablePositions.memoryFiles
  const ss = tablePositions.archiveSessions
  const w = tableSize.width
  const h = tableSize.height

  return (
    <main className="level-page">
      <section className="level-hero">
        <p className="case-badge">Case File 06</p>
        <h1>The Memory Leak</h1>
        <p className="meta">Neo Lumina, 2051 — CTEs (WITH)</p>
        <p>
          Crane stole neural memory backups and encrypted them as leverage. Follow the trail through
          named CTE steps until you can prove what was taken and when.
        </p>
      </section>

      <section className="schema-board-wrap">
        <SchemaZoomControls boardRef={schemaBoardRef} />
        <div className="schema-board" ref={schemaBoardRef}>
          <div className="schema-board-canvas">
          <svg className="schema-links" aria-hidden="true">
            <line x1={mf.x + w} y1={mf.y + h / 2} x2={ss.x} y2={ss.y + h / 2} />
            <text x={(mf.x + w + ss.x) / 2 - 52} y={(mf.y + h / 2 + ss.y + h / 2) / 2 - 8}>
              file_id -&gt; id
            </text>
            <line x1={ag.x + w} y1={ag.y + h / 2} x2={ss.x} y2={ss.y + h / 2} />
            <text x={(ag.x + w + ss.x) / 2 - 58} y={(ag.y + h / 2 + ss.y + h / 2) / 2 - 8}>
              agent_id -&gt; agents.id
            </text>
            <line x1={ky.x} y1={ky.y + h / 2} x2={mf.x + w} y2={mf.y + h / 2} />
            <text x={(ky.x + mf.x + w) / 2 - 46} y={(ky.y + h / 2 + mf.y + h / 2) / 2 - 8}>
              key_id -&gt; keys.id
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
            id="encryptionKeys"
            title="encryption_keys"
            fields={keysFields}
            position={tablePositions.encryptionKeys}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
          <DraggableNode
            id="memoryFiles"
            title="memory_files"
            fields={memoryFilesFields}
            position={tablePositions.memoryFiles}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
          <DraggableNode
            id="archiveSessions"
            title="archive_sessions"
            fields={sessionsFields}
            position={tablePositions.archiveSessions}
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
        <h2>SQL Skills Covered in Case File 06</h2>
        <ul>
          <li>CTEs (WITH) to build named steps</li>
          <li>Chaining multiple CTEs</li>
          <li>Combining CTEs with JOIN/GROUP BY/ORDER BY</li>
        </ul>
      </section>
    </main>
  )
}

export default Level6
