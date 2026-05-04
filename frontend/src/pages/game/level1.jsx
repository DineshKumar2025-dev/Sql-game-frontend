import { useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
const API_BASE = import.meta.env.VITE_API_URL 
const sublevels = [
  {
    id: 'l11',
    title: 'Who is Missing?',
    briefing:
      'Pull the full employee roster before narrowing down suspects. Start with the complete view.',
    mission: 'Retrieve the name, department, role, and status of every employee.',
    passCondition: 'Result includes Dr. Riya Sharma with status "missing".',
    reveal:
      'There she is. Dr. Riya Sharma is marked MISSING. Clearance level: CLASSIFIED. She was working on something major.',
    skill: 'SELECT columns',
    checks: ['select', 'name', 'department', 'role', 'status', 'from', 'employees'],
  },
  {
    id: 'l12',
    title: 'Isolate the Missing',
    briefing:
      'Now filter out active staff. Focus only on suspicious statuses to identify who is off-pattern.',
    mission: 'Find all employees whose status is NOT active.',
    passCondition: 'Returns Dr. Riya Sharma (missing) and Ethan Cross (suspended).',
    reveal:
      'Ethan Cross is suspended but linked to the same floor as Riya. This is no coincidence.',
    skill: 'WHERE with !=',
    checks: ['from', 'employees', 'where', 'status', '!=', 'active'],
  },
  {
    id: 'l13',
    title: 'High Clearance Suspects',
    briefing:
      'Only high-clearance Engineering staff could access ORACLE. Narrow suspects by role and clearance.',
    mission: 'Find all Engineering employees with HIGH or CLASSIFIED clearance.',
    passCondition: 'Returns Riya Sharma and Ethan Cross at that clearance level.',
    reveal:
      'Only a tiny group could reach ORACLE. One missing, one suspended. The trail tightens.',
    skill: 'WHERE with AND + IN()',
    checks: ['from', 'employees', 'where', 'department', 'engineering', 'clearance', 'in'],
  },
  {
    id: 'l14',
    title: 'The Night Shift',
    briefing:
      'Inspect server room access on 2047-09-14 after 22:00. ORACLE data lived there.',
    mission: 'Find all Server Room access log entries after 22:00 on 2047-09-14.',
    passCondition: 'Returns employee IDs 1 (Riya) and 6 (Ethan Cross).',
    reveal:
      'Ethan entered the Server Room despite suspension. Someone enabled that access.',
    skill: 'Timestamp filtering with WHERE',
    checks: ['from', 'access_logs', 'where', 'location', 'server room', 'timestamp', '22:00'],
  },
  {
    id: 'l15',
    title: 'Find the Accomplice',
    briefing:
      'A suspended badge cannot self-authorize. Pull Security staff who could allow late-night entry.',
    mission: 'Find active Security employees on floor 1 with HIGH or CLASSIFIED clearance.',
    passCondition: 'Returns Marcus Holt and Petra Novak.',
    reveal:
      'Petra Novak appears at a critical timestamp. You now have the inside accomplice lead.',
    skill: 'Multi-condition WHERE + IN()',
    checks: ['from', 'employees', 'where', 'department', 'security', 'floor', '1', 'clearance'],
  },
  
]

const employeesFields = [
  'id (PK)',
  'name',
  'department',
  'role',
  'salary',
  'status',
  'joined_date',
  'floor',
  'clearance',
]

const accessLogFields = ['id (PK)', 'employee_id (FK)', 'location', 'timestamp', 'action']

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

function Level1() {
  const [currentSublevel, setCurrentSublevel] = useState('l11')
  const [sqlInput, setSqlInput] = useState('')
  const [maxUnlocked, setMaxUnlocked] = useState('l11')
  const [message, setMessage] = useState('')
  const [queryOutput, setQueryOutput] = useState([])
  const [tablePositions, setTablePositions] = useState({
    employees: { x: 60, y: 34 },
    accessLogs: { x: 500, y: 180 },
  })
  const schemaBoardRef = useRef(null)
  const tableSize = { width: 300, height: 190 }

  const selected = useMemo(
    () => sublevels.find((sub) => sub.id === currentSublevel) ?? sublevels[0],
    [currentSublevel],
  )

  const getStatus = (id) => {
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
    setTablePositions((prev) => ({
      ...prev,
      [tableId]: position,
    }))
  }

  const handleCheckAnswer = async () => {
    const user_id = getStoredUserId()
    const query = normalize(sqlInput)
    const level = 1
    const sublevel = currentSublevel
    if (!query) {
      setMessage('Write a SQL query before running the check.')
      return
    }

    try {
      setQueryOutput([])
      const response = await fetch(`${API_BASE}/api/verifycode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          level,
          sublevel,
          user_id: user_id, 
        }),
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
        if (idx >= 0) {
          const nextIdx = Math.min(idx + 1, sublevels.length - 1)
          const nextId = sublevels[nextIdx].id
          const maxIdx = sublevels.findIndex((s) => s.id === maxUnlocked)
          if (nextIdx > maxIdx) {
            setMaxUnlocked(nextId)
          }
        }

        const finalSublevelId = sublevels[sublevels.length - 1]?.id
        if (selected.id === finalSublevelId) {
          const unlockedLevel = Number(localStorage.getItem('level') ?? '1')
          localStorage.setItem('level', String(Number.isNaN(unlockedLevel) ? 2 : Math.max(unlockedLevel, 2)))
        }
        console.log(data.user_id)
        return
      }

      setMessage(data.error ?? 'Not quite. Compare your result with mission goal.')
    } 
    
    catch (error) {
      console.error('Error:', error)
      const reason = error instanceof Error ? error.message : String(error)
      const isNetwork =
        /fetch|network|failed to load|load failed|aborted|ERR_/i.test(reason) ||
        (typeof error === 'object' && error !== null && 'name' in error && error.name === 'TypeError')
      setMessage(
        isNetwork
          ? `Cannot reach API at ${API_BASE}. Start the backend (e.g. port 8000) and confirm VITE_API_URL in .env. (${reason})`
          : `Something went wrong: ${reason}`,
      )
    }
  }

  return (
    <main className="level-page">
      <section className="level-hero">
        <p className="case-badge">Case File 01</p>
        <h1>The Vanishing Employee</h1>
        <p className="meta">Neo Lumina, 2047 — You are Detective AXEL-7.</p>
        <p>
          The city runs on data. Dr. Riya Sharma vanished after an off-hours access event, and
          ORACLE project files are missing. Query the evidence, follow the logs, and identify who
          was inside the building that night.
        </p>
      </section>

      <section className="schema-board-wrap">
        <div className="schema-board" ref={schemaBoardRef}>
          <svg className="schema-links" aria-hidden="true">
            <line
              x1={tablePositions.employees.x + tableSize.width}
              y1={tablePositions.employees.y + tableSize.height / 2}
              x2={tablePositions.accessLogs.x}
              y2={tablePositions.accessLogs.y + tableSize.height / 2}
            />
            <text
              x={(tablePositions.employees.x + tableSize.width + tablePositions.accessLogs.x) / 2 - 44}
              y={(tablePositions.employees.y +
                tableSize.height / 2 +
                tablePositions.accessLogs.y +
                tableSize.height / 2) /
                2 -
                8}
            >
              employee_id -&gt; id
            </text>
          </svg>

          <DraggableNode
            id="employees"
            title="employees"
            fields={employeesFields}
            position={tablePositions.employees}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />

          <DraggableNode
            id="accessLogs"
            title="access_logs"
            fields={accessLogFields}
            position={tablePositions.accessLogs}
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
                    <span>{(sub.id).slice(-1)}</span>
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
              onChange={(event) => setSqlInput(event.target.value)}
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
                            style={{
                              border: '1px solid #4a4a4a',
                              padding: '8px',
                            }}
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
        <h2>SQL Skills Covered in Case File 01</h2>
        <ul>
          <li>SELECT and column targeting</li>
          <li>WHERE with inequality filters</li>
          <li>AND + IN() multi-condition filtering</li>
          <li>Timestamp comparisons and event filtering</li>
          <li>ORDER BY for timeline reconstruction</li>
        </ul>
      </section>
    </main>
  )
}

export default Level1
