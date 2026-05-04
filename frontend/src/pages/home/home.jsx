import './home.css'
import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()
  const motive = [
    'Treat SQL like investigative action, not syntax memorization.',
    'Extract clues from evidence archives, logs, transactions, and links.',
    'Develop analyst-grade query thinking under active-case pressure.',
  ]

  const caseFiles = [
    ['01', 'The Vanishing Employee', 'SELECT & WHERE', 'Identify who is missing and who had direct access to protected zones.'],
    ['02', 'The Last Signal', 'ORDER BY & LIMIT', 'Reconstruct signal chronology and isolate the final receiver before evidence is erased.'],
    ['03', 'The Black Market Broker', 'JOIN Basics', 'Connect buyers and sellers to expose ORACLE resale routes.'],
    ['04', 'The Ghost Accounts', 'GROUP BY & HAVING', 'Aggregate micro-transactions to reveal laundering patterns hidden in row-level noise.'],
    ['05', 'The Puppet Master', 'Subqueries', 'Unpeel proxy chains and reporting hierarchies to locate command authority.'],
    ['06', 'The Memory Leak', 'CTEs (WITH)', 'Build a forensic query chain proving targeted neural-memory theft.'],
    ['07', 'The Inside Job', 'CRUD Missions', 'Restore integrity by removing planted records and re-inserting true evidence.'],
    ['08', 'The Double Spend', 'Transactions & ACID', 'Use transactional control to reverse race-condition ledger corruption.'],
    ['09', 'The Slow Burn', 'Indexes & Optimization', 'Repair query performance sabotage and rebuild real-time detection capability.'],
  ]

  const basics = [
    'What is a database and table?',
    'Rows, columns, and primary keys',
    'SELECT, WHERE, ORDER BY fundamentals',
    'Joins basics (INNER, LEFT)',
  ]

  const dialects = [
    { name: 'MySQL', use: 'Web apps, easy setup' },
    { name: 'PostgreSQL', use: 'Advanced features, reliability' },
    { name: 'SQLite', use: 'Lightweight local storage' },
    { name: 'Microsoft SQL Server', use: 'Enterprise ecosystem' },
    { name: 'Oracle SQL', use: 'Large enterprise systems' },
  ]

  const crud = [
    { op: 'Create', sql: 'INSERT INTO users (name) VALUES ("Alex");' },
    { op: 'Read', sql: 'SELECT * FROM users;' },
    { op: 'Update', sql: 'UPDATE users SET name = "Sam" WHERE id = 1;' },
    { op: 'Delete', sql: 'DELETE FROM users WHERE id = 1;' },
  ]

  const acid = [
    {
      key: 'Atomicity',
      title: 'All or Nothing',
      points: [
        'A transaction must complete fully or not happen at all.',
        'If any step fails, everything is rolled back.',
        'No partial updates allowed.',
      ],
      example: 'Transfer money: Debit from A succeeds, Credit to B fails, so system cancels whole transaction.',
    },
    {
      key: 'Consistency',
      title: 'Valid State Only',
      points: [
        'After a transaction, the database must remain correct.',
        'No invalid data is allowed.',
        'Constraints (primary key, foreign key, checks) must hold.',
      ],
      example: 'A balance cannot become negative if a rule prevents it.',
    },
    {
      key: 'Isolation',
      title: 'No Interference',
      points: [
        'Multiple transactions should not affect each other while running.',
        'Each transaction behaves as if it is running alone.',
      ],
      example: 'Two users updating the same row do not see each other’s incomplete changes.',
    },
    {
      key: 'Durability',
      title: 'Permanent Changes',
      points: [
        'Once a transaction is committed, it is permanently saved.',
        'Committed data survives system crashes and power failures.',
      ],
      example: 'After payment success, the record is not lost even if the server crashes.',
    },
  ]

  return (
    <main className="home">
      <section className="hero">
        <p className="badge">Case Terminal // Authorized Session</p>
        <h1>The SQL Investigation System</h1>
        <p>
          You are inside a secured investigation system used by detectives to solve digital crimes.
          Tables are evidence archives, queries are investigation actions, and results are live clues.
        </p>
        <p className="muted-text">
          Every case file escalates the threat: missing persons, fraud, cybercrime, and conspiracy.
          Progress comes from extracting truth step by step.
        </p>

        <div className="hero-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => navigate('/levels')}
          >
            Open Case Terminal
          </button>
        </div>
      </section>

      <section className="overview-grid">
        <article className="card">
          <h2>Mission Objectives</h2>
          <ul>
            {motive.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>System Personality</h2>
          <p>
            This is not a playful UI. It behaves like an internal police intelligence console.
          </p>
          <p className="muted-text">
            Access Restricted. Partial Data Retrieved. Suspicious Pattern Detected.
          </p>
        </article>
      </section>

      <section className="card case-files">
        <h2>Case Files // Main Motive by Level</h2>
        <div className="case-grid">
          {caseFiles.map(([id, title, topic, summary]) => (
            <article className="case-card" key={id}>
              <p className="case-id">Case File {id}</p>
              <h3>{title}</h3>
              <p className="case-topic">{topic}</p>
              <p>{summary}</p>
              <span className="status-chip">Evidence Route Active</span>
            </article>
          ))}
        </div>
      </section>

      <section className="grid">
        <article className="card">
          <h2>Core Query Skills</h2>
          <ul>
            {basics.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Investigation Stack</h2>
          <div className="dialects">
            {dialects.map((d) => (
              <div key={d.name} className="chip">
                <strong>{d.name}</strong>
                <span>{d.use}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>CRUD Operations</h2>
          <div className="code-list">
            {crud.map((c) => (
              <div key={c.op} className="code-item">
                <h3>{c.op}</h3>
                <code>{c.sql}</code>
              </div>
            ))}
          </div>
        </article>

        <article className="card full-width">
          <h2>ACID Properties in Database</h2>
          <p className="muted-text">
            ACID ensures that database transactions are reliable and safe, even when something goes
            wrong.
          </p>
          <div className="acid-grid">
            {acid.map((a) => (
              <article key={a.key} className="acid-box">
                <h3>
                  {a.key} <span>({a.title})</span>
                </h3>
                <ul>
                  {a.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <p className="acid-example">
                  <strong>Example:</strong> {a.example}
                </p>
              </article>
            ))}
          </div>
          <p className="acid-summary">In one line: ACID = Safe, Reliable, and Consistent database transactions.</p>
        </article>
      </section>
    </main>
  )
}

export default Home