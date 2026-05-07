import { useEffect, useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
import SchemaZoomControls from './SchemaZoomControls'
import sub_level, { get_sql_query } from './common'
const API_BASE = import.meta.env.VITE_API_URL
const sublevels = [
  {
    id: 'l21',
    title: 'Full Transmission Log',
    briefing:
      'Pull every transmission from the crashed drone DR-002 and see the full picture before you start filtering.',
    mission: 'List all columns for every transmission sent by drone_id 2, oldest first.',
    passCondition: 'Returns 7 rows for DR-002 in chronological order.',
    reveal:
      'The log fills in: payloads grow and more packets are encrypted as the night goes on. Something large was leaving that drone.',
    skill: 'SELECT * + ORDER BY',
    checks: ['select', 'from', 'transmissions', 'where', 'drone_id', 'order by', 'timestamp'],
  },
  {
    id: 'l22',
    title: 'Most Recent First',
    briefing: 'The last transmission is the most critical. Flip the order — show latest first.',
    mission:
      'Return id, receiver_id, payload_size, and timestamp for drone 2, newest timestamp first.',
    passCondition: 'The first row is receiver_id 3 at 2051-03-11 00:02:00 — RX-GAMMA.',
    reveal:
      'The newest ping hit RX-GAMMA in the Underground Bunker, BlackNet turf. That is a serious red flag.',
    skill: 'ORDER BY DESC',
    checks: ['select', 'from', 'transmissions', 'where', 'order by', 'timestamp', 'desc'],
  },
  {
    id: 'l23',
    title: 'The Final Burst',
    briefing: 'You only need the single last transmission. Limit your result to one row.',
    mission:
      'Same filter as before for drone 2, newest first, but return only the latest row including encrypted.',
    passCondition: 'One row: 220 bytes, encrypted, 00:02, receiver_id 3.',
    reveal:
      'The final burst was small but encrypted — a tight shot to RX-GAMMA right before the drone went dark.',
    skill: 'LIMIT',
    checks: ['select', 'from', 'transmissions', 'where', 'order by', 'desc', 'limit'],
  },
  {
    id: 'l24',
    title: 'Top Payload Transfers',
    briefing:
      'Large payloads mean large data. Find the three biggest transmissions from the crashed drone.',
    mission:
      'Return id, receiver_id, payload_size, timestamp, encrypted for drone 2, ranked by payload_size descending, top 3 only.',
    passCondition: 'Top sizes 3800, 2100, 1240 — heavy traffic toward RX-OMEGA and RX-ALPHA.',
    reveal:
      'The two largest dumps both hit RX-OMEGA. That receiver is not noise — it is the main spigot.',
    skill: 'ORDER BY + LIMIT',
    checks: ['select', 'from', 'transmissions', 'where', 'order by', 'payload', 'limit'],
  },
  {
    id: 'l25',
    title: 'Encrypted Only',
    briefing: 'Filter to encrypted transmissions only, then rank by payload size — that is the contraband trail.',
    mission:
      'For drone 2, only encrypted rows; return id, receiver_id, payload_size, timestamp ordered by payload_size descending.',
    passCondition: 'Four encrypted rows; RX-OMEGA owns the two largest classified payloads.',
    reveal:
      'RX-OMEGA took 3800 and 2100 bytes encrypted. Primary data receiver identified.',
    skill: 'WHERE + ORDER BY',
    checks: ['select', 'from', 'transmissions', 'where', 'encrypted', 'order by', 'payload'],
  },
  {
    id: 'l26',
    title: 'Weakest Signal Before Crash',
    briefing:
      'The drone was losing power. Find the three transmissions with the weakest signal — the last gasps before the crash.',
    mission:
      'Return id, receiver_id, signal_strength, timestamp for drone 2, lowest signal first, limit 3.',
    passCondition: 'Signal strengths 30, 44, 60 — the dying edge of the link.',
    reveal:
      'Someone drained that bird after the big exfil. The case file is moving to Case 03 — bunker coordinates locked.',
    skill: 'ORDER BY signal + LIMIT',
    checks: ['select', 'from', 'transmissions', 'where', 'signal', 'order by', 'limit'],
  },
]

const CASE_COMPLETE = '__case_complete__'

function initialMaxUnlocked() {
  const chapter = Number(localStorage.getItem('level') ?? '1')
  return !Number.isNaN(chapter) && chapter >= 3 ? CASE_COMPLETE : 'l21'
}

const dronesFields = ['id (PK)', 'drone_code', 'owner_org', 'status', 'floor_base']

const receiversFields = ['id (PK)', 'code', 'location', 'org', 'clearance']

const transmissionsFields = [
  'id (PK)',
  'drone_id (FK)',
  'receiver_id (FK)',
  'signal_strength',
  'payload_size',
  'timestamp',
  'encrypted',
]

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

function Level2() {
  const [currentSublevel, setCurrentSublevel] = useState('l21')

  const resolveSublevelId = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (sublevels.some((sub) => sub.id === normalized)) return normalized
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const mapped = `l2${value}`
      if (sublevels.some((sub) => sub.id === mapped)) return mapped
    }

    return null
  }

  const [maxUnlocked, setMaxUnlocked] = useState(initialMaxUnlocked)

  useEffect(() => {
    const fetchSublevel = async () => {
      try {
        const backendSublevel = await sub_level(2)
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
    drones: { x: 40, y: 120 },
    receivers: { x: 520, y: 40 },
    transmissions: { x: 260, y: 300 },
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
    setTablePositions((prev) => ({
      ...prev,
      [tableId]: position,
    }))
  }

  const handleCheckAnswer = async () => {
    const user_id = getStoredUserId()
    const query = normalize(sqlInput)
    const level = 2
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
        const finalSublevelId = sublevels[sublevels.length - 1]?.id
        const isFinal = selected.id === finalSublevelId

        if (idx >= 0) {
          if (isFinal) {
            setMaxUnlocked(CASE_COMPLETE)
          } else {
            const nextIdx = Math.min(idx + 1, sublevels.length - 1)
            const nextId = sublevels[nextIdx].id
            const maxIdx = sublevels.findIndex((s) => s.id === maxUnlocked)
            if (nextIdx > maxIdx) {
              setMaxUnlocked(nextId)
            }
          }
        }

        if (isFinal) {
          const unlockedLevel = Number(localStorage.getItem('level') ?? '1')
          localStorage.setItem(
            'level',
            String(Number.isNaN(unlockedLevel) ? 3 : Math.max(unlockedLevel, 3)),
          )
        }
        return
      }

      setMessage(data.error ?? 'Not quite. Compare your result with mission goal.')
    } catch (error) {
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
    } finally {
      setIsChecking(false)
    }
  }

  const tx = tablePositions.transmissions
  const dr = tablePositions.drones
  const rx = tablePositions.receivers
  const w = tableSize.width
  const h = tableSize.height

  return (
    <main className="level-page">
      <section className="level-hero">
        <p className="case-badge">Case File 02</p>
        <h1>The Last Signal</h1>
        <p className="meta">Neo Lumina, 2051 — ORDER BY &amp; LIMIT</p>
        <p>
          Forty-eight hours after Riya vanished, a rogue surveillance drone lies crashed on NovaCorp
          Tower. Its memory card is wiped, but DroneNet still holds transmission logs. Reconstruct the
          send order, surface the final packet, and expose who took the last signal before the trail
          goes cold.
        </p>
      </section>

      <section className="schema-board-wrap">
        <SchemaZoomControls boardRef={schemaBoardRef} />
        <div className="schema-board" ref={schemaBoardRef}>
          <div className="schema-board-canvas">
          <svg className="schema-links" aria-hidden="true">
            <line
              x1={dr.x + w}
              y1={dr.y + h / 2}
              x2={tx.x}
              y2={tx.y + h / 2}
            />
            <text
              x={(dr.x + w + tx.x) / 2 - 36}
              y={(dr.y + h / 2 + tx.y + h / 2) / 2 - 8}
            >
              drone_id -&gt; id
            </text>
            <line
              x1={tx.x + w}
              y1={tx.y + h / 2}
              x2={rx.x}
              y2={rx.y + h / 2}
            />
            <text
              x={(tx.x + w + rx.x) / 2 - 44}
              y={(tx.y + h / 2 + rx.y + h / 2) / 2 - 8}
            >
              receiver_id -&gt; id
            </text>
          </svg>

          <DraggableNode
            id="drones"
            title="drones"
            fields={dronesFields}
            position={tablePositions.drones}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />

          <DraggableNode
            id="receivers"
            title="receivers"
            fields={receiversFields}
            position={tablePositions.receivers}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />

          <DraggableNode
            id="transmissions"
            title="transmissions"
            fields={transmissionsFields}
            position={tablePositions.transmissions}
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
        <h2>SQL Skills Covered in Case File 02</h2>
        <ul>
          <li>ORDER BY ascending and descending timelines</li>
          <li>LIMIT for single-row and top-N results</li>
          <li>Sorting by payload size and signal strength</li>
          <li>Combining filters with ORDER BY and LIMIT</li>
        </ul>
      </section>
    </main>
  )
}

export default Level2
