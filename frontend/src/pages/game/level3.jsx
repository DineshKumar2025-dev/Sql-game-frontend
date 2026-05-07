import { useEffect, useMemo, useRef, useState } from 'react'
import './game.css'
import DraggableNode from './DraggableNode'
import SchemaZoomControls from './SchemaZoomControls'
import sub_level, { get_sql_query } from './common'
const API_BASE = import.meta.env.VITE_API_URL
const sublevels = [
  {
    id: 'l31',
    title: 'Who Are the Sellers?',
    briefing:
      "Pull every transaction and attach the seller's name. The broker always shows up as a seller.",
    mission:
      'Join transactions to suspects on seller_id; return transaction id, seller name (as seller), item, price_cr, and date. Order by date.',
    passCondition:
      'Marcus Veil and Sable Mox appear as sellers across the ledger — NexusVoid fingerprints everywhere.',
    reveal:
      'The sell side keeps pointing at NexusVoid operators. Marcus Veil and Sable Mox are running volume.',
    skill: 'JOIN (seller)',
    checks: ['select', 'from', 'transactions', 'join', 'suspects', 'seller'],
  },
  {
    id: 'l32',
    title: 'Who Are the Buyers?',
    briefing: "Attach the buyer's name to every transaction — follow the money from the other side.",
    mission:
      'Join on buyer_id; return id, buyer name (as buyer), item, price_cr, status. Order by price_cr descending.',
    passCondition:
      'Victor Crane shows up as a buyer more than once — including goods that came from his own house.',
    skill: 'JOIN (buyer)',
    checks: ['select', 'from', 'transactions', 'join', 'suspects', 'buyer'],
  },
  {
    id: 'l33',
    title: 'Full Network Map',
    briefing: 'Join both seller and buyer names — one row per deal with both parties visible.',
    mission:
      'Double-join suspects as seller and buyer aliases; return id, seller name, buyer name, item, price_cr, status. Order by date.',
    passCondition:
      'The chain appears: ORACLE moves from Marcus toward Lena, then deeper toward Victor — resale in plain SQL.',
    reveal:
      'You can read the laundering ladder in one result set. Same table twice, two different roles.',
    skill: 'Two JOINs',
    checks: ['join', 'suspects', 'transactions', 'seller', 'buyer'],
  },
  {
    id: 'l34',
    title: 'Flagged Deals Only',
    briefing: 'Filter to flagged transactions only; still show both party names.',
    mission:
      'Same double join as the network map, but only rows where status is flagged. Return seller, buyer, item, price_cr, date.',
    passCondition: 'Two flagged rows — Victor Crane sits on one side or the other in both.',
    reveal:
      'Compliance already flagged the CEO-adjacent traffic. Someone saw this coming and still let it ride.',
    skill: 'JOIN + WHERE',
    checks: ['join', 'where', 'flagged', 'status'],
  },
  {
    id: 'l35',
    title: 'ORACLE Transactions Only',
    briefing: 'Track every row where the traded item is ORACLE Source Code.',
    mission:
      'Seller and buyer names plus price_cr, date, status for item exactly ORACLE Source Code. Order by date.',
    passCondition:
      'Two ORACLE deals in order: Marcus to Lena, then Sable to Lena — resale before the end client.',
    reveal:
      'ORACLE did not walk out once — it was staged through Lena Cross before the final handoff narrative tightens.',
    skill: 'JOIN + item filter',
    checks: ['join', 'where', 'item', 'oracle'],
  },
  {
    id: 'l36',
    title: 'High-Threat Suspects in Deals',
    briefing:
      'Surface every transaction where either party has threat_level CRITICAL — the inner circle of the market.',
    mission:
      'Join seller and buyer; include both names and threat_level columns; filter CRITICAL on either side; order by price_cr descending.',
    passCondition:
      'Five rows, top price 120000; Marcus Veil and Victor Crane recur — the spine of the black market.',
    reveal:
      'The broker is Marcus Veil. The end client is Victor Crane — NovaCorp’s own CEO bankrolled the ORACLE bleed. Case File 04 is next.',
    skill: 'JOIN + OR filter',
    checks: ['join', 'where', 'threat', 'critical', 'or'],
  },
]

const CASE_COMPLETE = '__case_complete__'

function initialMaxUnlocked() {
  return sublevels[0]?.id ?? 'l31'
}

const suspectsFields = ['id (PK)', 'name', 'alias', 'org', 'threat_level']

const itemsCatalogFields = ['id (PK)', 'item_name', 'category', 'risk_level']

const transactionsFields = [
  'id (PK)',
  'seller_id (FK)',
  'buyer_id (FK)',
  'item',
  'price_cr',
  'date',
  'status',
]

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

function Level3() {
  const [currentSublevel, setCurrentSublevel] = useState('l31')

  const resolveSublevelId = (value) => {
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (sublevels.some((sub) => sub.id === normalized)) return normalized
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      const mapped = `l3${value}`
      if (sublevels.some((sub) => sub.id === mapped)) return mapped
    }

    return null
  }

  const [maxUnlocked, setMaxUnlocked] = useState(initialMaxUnlocked)

  useEffect(() => {
    const fetchSublevel = async () => {
      try {
        const backendSublevel = await sub_level(3)
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
    suspects: { x: 40, y: 120 },
    itemsCatalog: { x: 520, y: 40 },
    transactions: { x: 260, y: 280 },
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
    const level = 3
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
          const prev = Number(localStorage.getItem('highest_level_completed') ?? '0')
          localStorage.setItem('highest_level_completed', String(Math.max(prev, 3)))
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

  const tx = tablePositions.transactions
  const su = tablePositions.suspects
  const cat = tablePositions.itemsCatalog
  const w = tableSize.width
  const h = tableSize.height

  return (
    <main className="level-page">
      <section className="level-hero">
        <p className="case-badge">Case File 03</p>
        <h1>The Black Market Broker</h1>
        <p className="meta">Neo Lumina, 2051 — JOIN basics</p>
        <p>
          RX-OMEGA led you to Nexus Void LLC — a shell running a stolen-data bazaar. Buyers live in
          one table, sellers in the same roster of suspects, deals in another. Join the threads, map
          who sold ORACLE, and who paid for it.
        </p>
      </section>

      <section className="schema-board-wrap">
        <SchemaZoomControls boardRef={schemaBoardRef} />
        <div className="schema-board" ref={schemaBoardRef}>
          <div className="schema-board-canvas">
          <svg className="schema-links" aria-hidden="true">
            <line x1={su.x + w} y1={su.y + h / 2} x2={tx.x} y2={tx.y + h / 2} />
            <text x={(su.x + w + tx.x) / 2 - 72} y={(su.y + h / 2 + tx.y + h / 2) / 2 - 8}>
              seller_id / buyer_id -&gt; suspects.id
            </text>
            <line x1={tx.x + w} y1={tx.y + h / 2} x2={cat.x} y2={cat.y + h / 2} />
            <text x={(tx.x + w + cat.x) / 2 - 52} y={(tx.y + h / 2 + cat.y + h / 2) / 2 - 8}>
              item ↔ item_name
            </text>
          </svg>

          <DraggableNode
            id="suspects"
            title="suspects"
            fields={suspectsFields}
            position={tablePositions.suspects}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />

          <DraggableNode
            id="itemsCatalog"
            title="items_catalog"
            fields={itemsCatalogFields}
            position={tablePositions.itemsCatalog}
            width={tableSize.width}
            height={tableSize.height}
            boardRef={schemaBoardRef}
            onPositionChange={updateTablePosition}
          />

          <DraggableNode
            id="transactions"
            title="transactions"
            fields={transactionsFields}
            position={tablePositions.transactions}
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
        <h2>SQL Skills Covered in Case File 03</h2>
        <ul>
          <li>JOIN suspects as seller or buyer on transactions</li>
          <li>Aliasing the same table twice for two roles in one query</li>
          <li>Filtering joined results with WHERE on deal status or item name</li>
          <li>OR conditions across columns from joined tables</li>
        </ul>
      </section>
    </main>
  )
}

export default Level3
