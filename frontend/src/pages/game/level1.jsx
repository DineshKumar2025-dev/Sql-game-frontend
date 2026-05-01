import { useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'

const sublevels = [
  {
    id: 1,
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
    id: 2,
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
    id: 3,
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
    id: 4,
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
    id: 5,
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
  {
    id: 'BONUS',
    title: 'The Full Picture',
    briefing:
      'Reconstruct the full sequence to prepare the next case file with evidence-backed timeline.',
    mission:
      'Retrieve access logs after 22:00 for employee IDs 1, 6, and 9 ordered by timestamp.',
    passCondition: 'Returns 5 rows in chronological order of that night.',
    reveal:
      'Timeline confirms coordinated movement. Case File 01 closes with clear suspects identified.',
    skill: 'IN() + date filter + ORDER BY',
    checks: ['from', 'access_logs', 'where', 'employee_id', 'in', 'order by', 'timestamp'],
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

function Level1() {
  const [currentSublevel, setCurrentSublevel] = useState(1)
  const [sqlInput, setSqlInput] = useState('')
  const [maxUnlocked, setMaxUnlocked] = useState(1)
  const [message, setMessage] = useState('')
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
    if (id < maxUnlocked) return 'completed'
    if (id === maxUnlocked) return 'current'
    return 'locked'
  }

  const normalize = (text) => text.toLowerCase().replace(/\s+/g, ' ').trim()

  const updateTablePosition = (tableId, position) => {
    setTablePositions((prev) => ({
      ...prev,
      [tableId]: position,
    }))
  }

  const handleCheckAnswer = () => {
    const query = normalize(sqlInput)
    const missing = selected.checks.filter((check) => !query.includes(check))

    if (missing.length > 0) {
      setMessage(
        'Not quite. Your query is missing some mission conditions. Check SELECT/FROM/WHERE parts carefully.',
      )
      return
    }

    setMessage(`Solved! ${selected.reveal}`)

    const nextStep =
      typeof selected.id === 'number' ? Math.min(selected.id + 1, sublevels.length) : sublevels.length

    if (nextStep > maxUnlocked) {
      setMaxUnlocked(nextStep)
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

      <section className="play-layout">
        <section className="sublevel-map" aria-label="Sublevel roadmap">
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
                    }
                  }}
                >
                  <span>{sub.id}</span>
                </button>
                <article className={`sublevel-card ${status}`}>
                  <h3>{sub.title}</h3>
                  <p>{sub.skill}</p>
                </article>
              </div>
            )
          })}
        </section>

        <section className="challenge-panel">
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
          <button type="button" className="check-btn" onClick={handleCheckAnswer}>
            Run Query Check
          </button>
          {message && <p className="feedback">{message}</p>}
        </section>
      </section>

      <section className="skills-covered">
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
