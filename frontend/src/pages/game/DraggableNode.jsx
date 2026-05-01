import { useRef, useState } from 'react'

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
  const [isDragging, setIsDragging] = useState(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  const clampPosition = (x, y) => {
    if (!boardRef.current) return { x, y }
    const boardRect = boardRef.current.getBoundingClientRect()
    const maxX = boardRect.width - width
    const maxY = boardRect.height - height
    return {
      x: Math.max(8, Math.min(x, maxX)),
      y: Math.max(8, Math.min(y, maxY)),
    }
  }

  const handlePointerMove = (event) => {
    if (!isDragging || !boardRef.current) return
    const boardRect = boardRef.current.getBoundingClientRect()
    const nextX = event.clientX - boardRect.left - dragOffsetRef.current.x
    const nextY = event.clientY - boardRect.top - dragOffsetRef.current.y
    const clamped = clampPosition(nextX, nextY)
    onPositionChange(id, clamped)
  }

  const handlePointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  const handlePointerDown = (event) => {
    if (!boardRef.current) return
    const boardRect = boardRef.current.getBoundingClientRect()
    const nodeRect = event.currentTarget.getBoundingClientRect()
    dragOffsetRef.current = {
      x: event.clientX - (nodeRect.left - boardRect.left),
      y: event.clientY - (nodeRect.top - boardRect.top),
    }
    setIsDragging(true)
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <article
      className={`db-table-node ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
      onPointerDown={handlePointerDown}
    >
      <h3>{title}</h3>
      <ul>
        {fields.map((field) => (
          <li key={field}>{field}</li>
        ))}
      </ul>
    </article>
  )
}

export default DraggableNode
