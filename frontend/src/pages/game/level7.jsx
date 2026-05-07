import { useEffect, useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
import SchemaZoomControls from './SchemaZoomControls'
import sub_level, { get_sql_query } from './common'

const API_BASE = import.meta.env.VITE_API_URL

const sublevels = [
  {
    id: 'l71',
    title: 'View the Damage',
    briefing: 'Read the current state — planted evidence and fabricated witnesses.',
    mission: 'Inspect evidence + witnesses tables.',
    passCondition: 'Planted evidence and fabricated witnesses are visible.',
    reveal: 'The mole was thorough. Now undo the damage.',
    skill: 'SELECT',
  },
  {
    id: 'l72',
    title: 'Delete the Plants',
    briefing: 'Remove all planted evidence.',
    mission: 'DELETE rows where planted = true.',
    passCondition: 'No planted evidence remains.',
    reveal: 'False alibis are gone.',
    skill: 'DELETE',
  },
  {
    id: 'l73',
    title: 'Remove Fabricated Witnesses',
    briefing: 'Delete FABRICATED witnesses.',
    mission: "DELETE FROM witnesses WHERE credibility = 'FABRICATED'.",
    passCondition: 'No fabricated witnesses remain.',
    reveal: 'The witness list is clean again.',
    skill: 'DELETE + WHERE',
  },
  {
    id: 'l74',
    title: 'Restore Missing Evidence',
    briefing: 'Re-insert the NexusVoid contract scan.',
    mission: 'INSERT the contract evidence row back.',
    passCondition: 'The contract evidence exists and is verified.',
    reveal: 'Contract restored — a link to Crane.',
    skill: 'INSERT',
  },
  {
    id: 'l75',
    title: 'Add a New Protected Witness',
    briefing: 'Add Dr. Riya Sharma as a protected witness.',
    mission: 'INSERT Riya into witnesses with protected = true.',
    passCondition: 'Riya appears as protected HIGH credibility.',
    reveal: 'Riya is back and protected.',
    skill: 'INSERT columns',
  },
  {
    id: 'l76',
    title: 'Mark Evidence as Verified',
    briefing: 'Mark all AXEL-7 evidence verified.',
    mission: 'UPDATE evidence SET verified = true for AXEL-7.',
    passCondition: 'No unverified AXEL-7 evidence remains.',
    reveal: 'The evidence database is restored. Moving to Case File 08.',
    skill: 'UPDATE',
  },
]

const CASE_COMPLETE = '__case_complete__'

function initialMaxUnlocked() {
  const chapter = Number(localStorage.getItem('level') ?? '1')
  return !Number.isNaN(chapter) && chapter >= 10 ? CASE_COMPLETE : 'l71'
}

const evidenceFields = ['id (PK)', 'case_id', 'description', 'verified', 'planted', 'added_by', 'date_added']
const witnessesFields = ['id (PK)', 'name', 'testimony', 'credibility', 'protected']

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

function Level7() {
  const [currentSublevel, setCurrentSublevel] = useState('l71')

  const resolveSublevelId = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (sublevels.some((sub) => sub.id === normalized)) return normalized
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const mapped = `l7${value}`
      if (sublevels.some((sub) => sub.id === mapped)) return mapped
    }
    return null
  }

  const [maxUnlocked, setMaxUnlocked] = useState(initialMaxUnlocked)

  useEffect(() => {
    const fetchSublevel = async () => {
      try {
        const backendSublevel = await sub_level(7)
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
    evidence: { x: 40, y: 110 },
    witnesses: { x: 520, y: 260 },
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
    const level = 7
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
          const unlockedLevel = Number(localStorage.getItem('level') ?? '1')
          localStorage.setItem(
            'level',
            String(Number.isNaN(unlockedLevel) ? 8 : Math.max(unlockedLevel, 8)),
          )
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

  return (
    <main className="level-page">
      <section className="level-hero">
        <p className="case-badge">Case File 07</p>
        <h1>The Inside Job</h1>
        <p className="meta">Neo Lumina, 2051 — CRUD missions</p>
        <p>You are not just reading evidence now — you are repairing it.</p>
      </section>

      <section className="schema-board-wrap">
        <SchemaZoomControls boardRef={schemaBoardRef} />
        <div className="schema-board" ref={schemaBoardRef}>
          <div className="schema-board-canvas">
          <DraggableNode
            id="evidence"
            title="evidence"
            fields={evidenceFields}
            position={tablePositions.evidence}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
          <DraggableNode
            id="witnesses"
            title="witnesses"
            fields={witnessesFields}
            position={tablePositions.witnesses}
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
    </main>
  )
}

export default Level7
