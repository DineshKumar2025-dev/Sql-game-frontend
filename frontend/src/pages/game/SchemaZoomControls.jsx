import { useEffect, useState } from 'react'

function SchemaZoomControls({ boardRef }) {
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (!boardRef.current) return
    boardRef.current.style.setProperty('--schema-zoom', String(zoom))
  }, [boardRef, zoom])

  const changeZoom = (delta) => {
    setZoom((prev) => Math.max(0.75, Math.min(1.6, Number((prev + delta).toFixed(2)))))
  }

  return (
    <div className="schema-zoom-controls" role="group" aria-label="Schema zoom controls">
      <button type="button" className="schema-zoom-btn" onClick={() => changeZoom(-0.1)}>
        -
      </button>
      <button type="button" className="schema-zoom-btn" onClick={() => changeZoom(0.1)}>
        +
      </button>
      <button type="button" className="schema-zoom-btn schema-zoom-reset" onClick={() => setZoom(1)}>
        {Math.round(zoom * 100)}%
      </button>
    </div>
  )
}

export default SchemaZoomControls
