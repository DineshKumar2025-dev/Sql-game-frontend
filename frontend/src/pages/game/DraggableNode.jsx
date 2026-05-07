import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

let topLayerCounter = 10

function DraggableNode({
  id,
  title,
  fields,
  position,
  width,
  height,
  boardRef,
  onPositionChange,
}) {
  const nodeRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isActive, setIsActive] = useState(false)
  const [layer, setLayer] = useState(() => {
    topLayerCounter += 1
    return topLayerCounter
  })
  const dragStateRef = useRef({
    pointerId: null,
    offsetX: 0,
    offsetY: 0,
  })

  const normalizedFields = useMemo(
    () =>
      fields.map((field) => {
        const value = String(field)
        const lowered = value.toLowerCase()
        const isPrimary = /\bprimary key\b/.test(lowered) || lowered === 'id'
        const isForeign = /\bforeign key\b/.test(lowered) || /_id\b/.test(lowered)
        return {
          value,
          isPrimary,
          isForeign: isForeign && !isPrimary,
        }
      }),
    [fields],
  )

  const clampPosition = useCallback((x, y, nodeWidth, nodeHeight) => {
    if (!boardRef.current) return { x, y }
    const boardRect = boardRef.current.getBoundingClientRect()
    const margin = 8
    const fallbackWidth = width ?? 300
    const fallbackHeight = height ?? 190
    const resolvedWidth = nodeWidth ?? fallbackWidth
    const resolvedHeight = nodeHeight ?? fallbackHeight
    const maxX = Math.max(margin, boardRect.width - resolvedWidth - margin)
    const maxY = Math.max(margin, boardRect.height - resolvedHeight - margin)
    return {
      x: Math.max(margin, Math.min(x, maxX)),
      y: Math.max(margin, Math.min(y, maxY)),
    }
  }, [boardRef, height, width])

  useEffect(() => {
    if (!boardRef.current || !nodeRef.current) return
    const nodeRect = nodeRef.current.getBoundingClientRect()
    const clamped = clampPosition(position.x, position.y, nodeRect.width, nodeRect.height)
    if (clamped.x !== position.x || clamped.y !== position.y) {
      onPositionChange(id, clamped)
    }
    // Clamp when board size changes so nodes stay visible on smaller screens.
    const observer = new ResizeObserver(() => {
      if (!nodeRef.current) return
      const nextRect = nodeRef.current.getBoundingClientRect()
      const nextClamped = clampPosition(position.x, position.y, nextRect.width, nextRect.height)
      if (nextClamped.x !== position.x || nextClamped.y !== position.y) {
        onPositionChange(id, nextClamped)
      }
    })
    observer.observe(boardRef.current)
    return () => observer.disconnect()
  }, [boardRef, clampPosition, id, onPositionChange, position.x, position.y])

  const handlePointerMove = useCallback((event) => {
    if (!isDragging || !boardRef.current || !nodeRef.current) return
    if (dragStateRef.current.pointerId !== event.pointerId) return
    const boardRect = boardRef.current.getBoundingClientRect()
    const nodeRect = nodeRef.current.getBoundingClientRect()
    const nextX = event.clientX - boardRect.left - dragStateRef.current.offsetX
    const nextY = event.clientY - boardRect.top - dragStateRef.current.offsetY
    const clamped = clampPosition(nextX, nextY, nodeRect.width, nodeRect.height)
    onPositionChange(id, clamped)
  }, [boardRef, clampPosition, id, isDragging, onPositionChange])

  const stopDragging = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    const { pointerId } = dragStateRef.current
    if (pointerId != null && nodeRef.current?.hasPointerCapture?.(pointerId)) {
      nodeRef.current.releasePointerCapture(pointerId)
    }
    dragStateRef.current.pointerId = null
  }, [isDragging])

  useEffect(() => {
    if (!isDragging) return
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [handlePointerMove, isDragging, stopDragging])

  const handlePointerDown = (event) => {
    if (!boardRef.current || !nodeRef.current) return
    if (event.button !== 0) return
    event.preventDefault()
    const boardRect = boardRef.current.getBoundingClientRect()
    const nodeRect = nodeRef.current.getBoundingClientRect()
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - (nodeRect.left - boardRect.left),
      offsetY: event.clientY - (nodeRect.top - boardRect.top),
    }
    nodeRef.current.setPointerCapture(event.pointerId)
    topLayerCounter += 1
    setLayer(topLayerCounter)
    setIsDragging(true)
  }

  return (
    <article
      ref={nodeRef}
      className={`db-table-node ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: `translate(${position.x}px, ${position.y}px)`, zIndex: layer }}
      onBlur={() => setIsActive(false)}
      onFocus={() => {
        setIsActive(true)
        topLayerCounter += 1
        setLayer(topLayerCounter)
      }}
      tabIndex={0}
      role="group"
      aria-label={`${title} table schema`}
    >
      <header className="db-table-header" onPointerDown={handlePointerDown}>
        <h3>{title}</h3>
        <span className="db-table-chip">{normalizedFields.length} cols</span>
      </header>
      <p className="db-table-subtitle">{isDragging ? 'Dragging table...' : 'SQL schema table'}</p>
      <ul>
        {normalizedFields.map((field) => (
          <li key={field.value} className="db-field-row">
            <span className="db-field-name">{field.value}</span>
            {field.isPrimary ? <span className="db-field-tag db-field-tag-pk">PK</span> : null}
            {field.isForeign ? <span className="db-field-tag db-field-tag-fk">FK</span> : null}
          </li>
        ))}
      </ul>
      <p className={`db-drag-hint ${isActive ? 'is-active' : ''}`}>Drag to inspect joins</p>
    </article>
  )
}

export default DraggableNode
