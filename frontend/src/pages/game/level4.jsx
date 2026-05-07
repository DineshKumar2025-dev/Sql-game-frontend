import { useEffect, useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
import SchemaZoomControls from './SchemaZoomControls'
import sub_level, { get_sql_query } from './common'

const API_BASE = import.meta.env.VITE_API_URL

const sublevels = [
  {
    id: 'l41',
    title: 'Count Transactions Per Account',
    briefing: 'Find how many transactions each account made. Volume is the first clue.',
    mission: 'Group `bank_transactions` by account_id and count rows.',
    passCondition: 'Accounts 2, 3, and 6 float to the top.',
    reveal: 'The micro-transaction pattern is loud only when you aggregate it.',
    skill: 'GROUP BY + COUNT()',
  },
  {
    id: 'l42',
    title: 'Total Outflow Per Account',
    briefing: 'Sum the outgoing money per account. Ghost accounts bleed slowly.',
    mission: 'Filter amount < 0, group by account_id, sum amounts.',
    passCondition: 'Ghost accounts show small but repeated negative totals.',
    reveal: 'Small numbers, repeated enough times, become a drain.',
    skill: 'SUM() + WHERE',
  },
  {
    id: 'l43',
    title: 'Accounts With More Than 3 Transactions',
    briefing: 'Use HAVING to filter after grouping. Any account with >3 tx is suspicious.',
    mission: 'COUNT(*) per account_id, HAVING COUNT(*) > 3.',
    passCondition: 'Only the ghost accounts exceed the threshold.',
    reveal: 'HAVING is the gate after aggregation — exactly where laundering hides.',
    skill: 'HAVING',
  },
  {
    id: 'l44',
    title: 'Flagged Transactions Grouped by Account',
    briefing: 'Group only flagged transactions and count them per account.',
    mission: 'WHERE flagged = true, group by account_id, count + sum.',
    passCondition: 'Accounts 2, 3, 6 are entirely flagged traffic.',
    reveal: 'Crane stays clean at the surface; the ghosts do the dirty work.',
    skill: 'GROUP BY on filtered set',
  },
  {
    id: 'l45',
    title: 'Average Transaction Per Category',
    briefing: 'Average amounts by category; laundering disguises itself as normal categories.',
    mission: 'GROUP BY category with COUNT/AVG/SUM.',
    passCondition: 'Transfers look “normal” individually, but total the drain.',
    reveal: 'This is why fraud detectors aggregate: the story is in totals.',
    skill: 'AVG()',
  },
  {
    id: 'l46',
    title: 'Orgs Draining Over 1000 Credits',
    briefing: 'Join accounts and transactions, group by org, then HAVING on total outflow.',
    mission: 'JOIN + GROUP BY org + HAVING total < -1000.',
    passCondition: 'NexusVoid shows repeated outflow at scale.',
    reveal:
      'Ghost Accounts A, B and C point to NexusVoid shell infrastructure. Moving to Case File 05.',
    skill: 'JOIN + HAVING',
  },
]

const CASE_COMPLETE = '__case_complete__'

function initialMaxUnlocked() {
  return sublevels[0]?.id ?? 'l41'
}

const accountsFields = ['id (PK)', 'holder', 'org', 'account_type', 'created_at']
const transactionsFields = ['id (PK)', 'account_id (FK)', 'amount', 'category', 'date', 'flagged']

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

function Level4() {
  const [currentSublevel, setCurrentSublevel] = useState('l41')

  const resolveSublevelId = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (sublevels.some((sub) => sub.id === normalized)) return normalized
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const mapped = `l4${value}`
      if (sublevels.some((sub) => sub.id === mapped)) return mapped
    }

    return null
  }

  const [maxUnlocked, setMaxUnlocked] = useState(initialMaxUnlocked)

  useEffect(() => {
    const fetchSublevel = async () => {
      try {
        const backendSublevel = await sub_level(4)
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
    accounts: { x: 60, y: 90 },
    bankTransactions: { x: 480, y: 240 },
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
    const level = 4
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
            if (nextIdx > maxIdx) setMaxUnlocked(nextId)
          }
        }

        if (isFinal) {
          const prev = Number(localStorage.getItem('highest_level_completed') ?? '0')
          localStorage.setItem('highest_level_completed', String(Math.max(prev, 4)))
        }

        return
      }

      setMessage(data.error ?? 'Not quite. Compare your result with mission goal.')
    } catch (error) {
      console.error('Error:', error)
      const reason = error instanceof Error ? error.message : String(error)
      setMessage(`Something went wrong: ${reason}`)
    } finally {
      setIsChecking(false)
    }
  }

  const ac = tablePositions.accounts
  const bt = tablePositions.bankTransactions
  const w = tableSize.width
  const h = tableSize.height

  return (
    <main className="level-page">
      <section className="level-hero">
        <p className="case-badge">Case File 04</p>
        <h1>The Ghost Accounts</h1>
        <p className="meta">Neo Lumina, 2051 — GROUP BY &amp; HAVING</p>
        <p>
          Victor Crane’s operation hides behind thousands of “innocent” micro-transactions. Your job
          is to aggregate the flow and reveal the ghost accounts draining the city.
        </p>
      </section>

      <section className="schema-board-wrap">
        <SchemaZoomControls boardRef={schemaBoardRef} />
        <div className="schema-board" ref={schemaBoardRef}>
          <div className="schema-board-canvas">
          <svg className="schema-links" aria-hidden="true">
            <line x1={ac.x + w} y1={ac.y + h / 2} x2={bt.x} y2={bt.y + h / 2} />
            <text x={(ac.x + w + bt.x) / 2 - 58} y={(ac.y + h / 2 + bt.y + h / 2) / 2 - 8}>
              account_id -&gt; id
            </text>
          </svg>

          <DraggableNode
            id="accounts"
            title="accounts"
            fields={accountsFields}
            position={tablePositions.accounts}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />

          <DraggableNode
            id="bankTransactions"
            title="bank_transactions"
            fields={transactionsFields}
            position={tablePositions.bankTransactions}
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
        <h2>SQL Skills Covered in Case File 04</h2>
        <ul>
          <li>COUNT / SUM / AVG aggregations</li>
          <li>GROUP BY for pattern detection</li>
          <li>HAVING to filter aggregates</li>
          <li>JOIN + aggregation across organizations</li>
        </ul>
      </section>
    </main>
  )
}

export default Level4
