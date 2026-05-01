import './home.css'

function Home() {
  const motive = [
    'Learn SQL by solving story-based missions instead of memorizing syntax.',
    'Build real query skills that help in interviews, projects, and data jobs.',
    'Understand not just what query works, but why it works.',
  ]

  const gameFlow = [
    {
      level: 'Level 1 - Rookie Analyst',
      objective: 'Learn SELECT, WHERE, ORDER BY by filtering simple clue tables.',
    },
    {
      level: 'Level 2 - Street Investigator',
      objective: 'Use JOINs to connect witnesses, suspects, and timelines.',
    },
    {
      level: 'Level 3 - Forensic Specialist',
      objective: 'Apply GROUP BY and aggregate functions to detect hidden patterns.',
    },
    {
      level: 'Level 4 - Case Strategist',
      objective: 'Use subqueries and CTEs to crack multi-step investigations.',
    },
    {
      level: 'Level 5 - Chief Detective',
      objective: 'Solve final missions using transactions, ACID, and optimization.',
    },
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
    { key: 'Atomicity', text: 'All steps succeed or none are saved.' },
    { key: 'Consistency', text: 'Data stays valid before and after transactions.' },
    { key: 'Isolation', text: 'Concurrent transactions do not conflict badly.' },
    { key: 'Durability', text: 'Committed data survives crashes.' },
  ]

  const extraSqlConcepts = [
    'Indexes and query performance basics',
    'Normalization vs denormalization',
    'Views and reusable query logic',
    'Transactions and lock awareness',
  ]

  return (
    <main className="home">
      <section className="hero">
        <p className="badge">Story Mode Enabled</p>
        <h1>SQL Detective: Learn SQL Through Missions</h1>
        <p>
          Every query is a clue. Every level is a case. You play as a detective who solves
          mysteries by mastering SQL concepts in the right order.
        </p>
        <p className="muted-text">
          Each level unlocks new concepts and teaches SQL step by step, from beginner basics
          to professional query mastery.
        </p>

        <div className="hero-actions">
          <button type="button" className="secondary">
            Start Game
          </button>
        </div>
      </section>

      <section className="motive-grid">
        <article className="card wide">
          <h2>Motive of the Game</h2>
          <ul>
            {motive.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>Story Theme</h2>
          <p>
            You are a data detective. Each mission gives you suspect records, evidence tables,
            and timeline logs. Your SQL queries reveal the truth.
          </p>
          <p className="muted-text">
            The better your query quality, the faster you unlock advanced chapters.
          </p>
        </article>
      </section>

      <section className="grid">
        <article className="card full-width">
          <h2>Level Journey</h2>
          <p className="muted-text">
            Every level introduces new SQL topics, so your skills grow from basic commands to
            pro-level problem solving.
          </p>
          <div className="levels">
            {gameFlow.map((stage) => (
              <div key={stage.level} className="level-item">
                <h3>{stage.level}</h3>
                <p>{stage.objective}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Basics of SQL</h2>
          <ul>
            {basics.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <h2>5 SQL Dialects</h2>
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

        <article className="card">
          <h2>ACID Properties</h2>
          <div className="acid-list">
            {acid.map((a) => (
              <div key={a.key} className="acid-item">
                <h3>{a.key}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>More SQL You Will Learn</h2>
          <ul>
            {extraSqlConcepts.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  )
}

export default Home