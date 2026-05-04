import { useNavigate } from 'react-router-dom'

function Playmap({ levels, getStatus }) {
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
                // Do not write progress here — replaying an earlier mission must not lower
                // localStorage `level`, or later missions appear locked again.
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