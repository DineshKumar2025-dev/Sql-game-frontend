import { useNavigate } from 'react-router-dom'

function Playmap({ levels, getStatus, setLevel }) {
  const navigate = useNavigate()

  return (
    <section className="roadmap" aria-label="Level roadmap">
      {levels.map((item, index) => {
        const status = getStatus(item.id)
        return (
          <div
            key={item.id}
            className={`level-wrapper ${index % 2 === 0 ? 'left' : 'right'} ${status}`}
          >
            <div className="level-path" aria-hidden="true" />

            <button
              type="button"
              className={`level-node ${status}`}
              disabled={status === 'locked'}
              onClick={() => {
                setLevel(item.id)
                navigate(item.page)
              }}
              title={status === 'locked' ? 'Complete previous level first' : 'Play level'}
            >
              <span className="level-number">{item.id}</span>
            </button>

            <article className={`level-card ${status}`}>
              <h2>{item.title}</h2>
              <p>{item.topic}</p>
              <span className={`status-pill ${status}`}>
                {status === 'current'
                  ? 'Current mission'
                  : status === 'completed'
                    ? 'Completed'
                    : 'Locked'}
              </span>
            </article>
          </div>
        )
      })}
    </section>
  )
}

export default Playmap