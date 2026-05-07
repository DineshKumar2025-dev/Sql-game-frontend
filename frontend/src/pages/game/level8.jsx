import { useEffect, useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
import SchemaZoomControls from './SchemaZoomControls'
import sub_level, { get_sql_query } from './common'

const API_BASE = import.meta.env.VITE_API_URL

const sublevels = [
  { id: 'l81', title: 'Spot the Ghost Transaction', briefing: 'Find ledger rows marked ghost.', mission: 'SELECT ghost ledger rows.', passCondition: 'Two ghost transactions appear.', reveal: 'Money in, money out — in minutes.', skill: 'SELECT + WHERE' },
  { id: 'l82', title: 'Check the Balance Inconsistency', briefing: 'Inspect balances to see the inconsistency.', mission: 'SELECT balances ordered by balance.', passCondition: 'CityTreasury still shows full balance.', reveal: 'Classic double-spend symptom.', skill: 'SELECT + ORDER BY' },
  { id: 'l83', title: 'Simulate a Safe Rollback', briefing: 'Use BEGIN/COMMIT to reverse ghosts.', mission: 'BEGIN; UPDATE ledger ...; COMMIT;', passCondition: 'Ghost rows become reversed.', reveal: 'Ledger stabilized.', skill: 'BEGIN/COMMIT' },
  { id: 'l84', title: 'Restore the Treasury Balance', briefing: 'Zero Crane-Offshore in a transaction.', mission: 'BEGIN; UPDATE balances ...; COMMIT;', passCondition: 'Crane-Offshore is zero.', reveal: 'Clawback complete.', skill: 'Transactional UPDATE' },
  { id: 'l85', title: 'Demonstrate a Rollback', briefing: 'Delete valid rows, then ROLLBACK the mistake.', mission: 'BEGIN; DELETE ...; ROLLBACK;', passCondition: 'Ledger returns to pre-delete state.', reveal: 'ACID saves you.', skill: 'ROLLBACK' },
  { id: 'l86', title: 'Full Audit Report', briefing: 'Group totals by status.', mission: 'GROUP BY status with COUNT and SUM.', passCondition: 'Valid vs reversed totals are visible.', reveal: 'The double-spend is neutralized. Moving to Case File 09.', skill: 'GROUP BY' },
]

const CASE_COMPLETE = '__case_complete__'

function initialMaxUnlocked() {
  return sublevels[0]?.id ?? 'l81'
}

const ledgerFields = ['id (PK)', 'account_from', 'account_to', 'amount', 'status', 'timestamp', 'tx_group']
const balancesFields = ['id (PK)', 'account (UNIQUE)', 'balance', 'last_updated']

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

function Level8() {
  const [currentSublevel, setCurrentSublevel] = useState('l81')

  const resolveSublevelId = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (sublevels.some((sub) => sub.id === normalized)) return normalized
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      const mapped = `l8${value}`
      if (sublevels.some((sub) => sub.id === mapped)) return mapped
    }
    return null
  }

  const [maxUnlocked, setMaxUnlocked] = useState(initialMaxUnlocked)

  useEffect(() => {
    const fetchSublevel = async () => {
      try {
        const backendSublevel = await sub_level(8)
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
    ledger: { x: 40, y: 120 },
    balances: { x: 520, y: 260 },
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
    const level = 8
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
          localStorage.setItem('highest_level_completed', String(Math.max(prev, 8)))
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
        <p className="case-badge">Case File 08</p>
        <h1>The Double Spend</h1>
        <p className="meta">Neo Lumina, 2051 — Transactions &amp; ACID</p>
        <p>Reverse a race-condition exploit using BEGIN / COMMIT / ROLLBACK.</p>
      </section>

      <section className="schema-board-wrap">
        <SchemaZoomControls boardRef={schemaBoardRef} />
        <div className="schema-board" ref={schemaBoardRef}>
          <div className="schema-board-canvas">
          <DraggableNode
            id="ledger"
            title="ledger"
            fields={ledgerFields}
            position={tablePositions.ledger}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />
          <DraggableNode
            id="balances"
            title="balances"
            fields={balancesFields}
            position={tablePositions.balances}
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

export default Level8
