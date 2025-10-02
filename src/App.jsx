import './App.css'
import { useEffect, useRef } from 'react'

function App() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let zoom = 1.0
    let panX = canvas.width / 2
    let panY = canvas.height / 2
    let isDragging = false
    let lastMouseX = 0
    let lastMouseY = 0
    const MIN_ZOOM = 0.2
    const MAX_ZOOM = 20
    const ZOOM_SENSITIVITY = 0.001

    function resizeCanvas() {
      canvas.width = canvas.parentElement.clientWidth
      canvas.height = canvas.parentElement.clientHeight
      panX = canvas.width / 2
      panY = canvas.height / 2
      draw()
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.translate(panX, panY)
      ctx.scale(zoom, zoom)
      drawAxes()
      ctx.restore()
    }

    function drawAxes() {
      ctx.beginPath()
      ctx.strokeStyle = '#ffffffff'
      ctx.lineWidth = 1 / zoom
      // X-axis
      ctx.moveTo(-canvas.width / zoom, 0)
      ctx.lineTo(canvas.width / zoom, 0)
      // Y-axis
      ctx.moveTo(0, -canvas.height / zoom)
      ctx.lineTo(0, canvas.height / zoom)
      ctx.stroke()
    }

    function handleZoom(event) {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top
      const worldXBefore = (mouseX - panX) / zoom
      const worldYBefore = (mouseY - panY) / zoom
      const delta = event.deltaY * ZOOM_SENSITIVITY
      const newZoom = zoom - delta
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom))
      const worldXAfter = (mouseX - panX) / zoom
      const worldYAfter = (mouseY - panY) / zoom
      panX += (worldXAfter - worldXBefore) * zoom
      panY += (worldYAfter - worldYBefore) * zoom
      draw()
    }

    function startPan(event) {
      isDragging = true
      lastMouseX = event.clientX
      lastMouseY = event.clientY
    }

    function handlePan(event) {
      if (!isDragging) return
      const dx = event.clientX - lastMouseX
      const dy = event.clientY - lastMouseY
      panX += dx
      panY += dy
      lastMouseX = event.clientX
      lastMouseY = event.clientY
      draw()
    }

    function endPan() {
      isDragging = false
    }

    window.addEventListener('resize', resizeCanvas)
    canvas.addEventListener('wheel', handleZoom)
    canvas.addEventListener('mousedown', startPan)
    canvas.addEventListener('mousemove', handlePan)
    canvas.addEventListener('mouseup', endPan)
    canvas.addEventListener('mouseout', endPan)
    resizeCanvas()
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('wheel', handleZoom)
      canvas.removeEventListener('mousedown', startPan)
      canvas.removeEventListener('mousemove', handlePan)
      canvas.removeEventListener('mouseup', endPan)
      canvas.removeEventListener('mouseout', endPan)
    }
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '0.5fr 2.5fr', background: '#111', height: '100vh', overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div style={{ borderRight: '1px solid #444', background: '#000000ff', padding: '1rem', height: '100vh', boxSizing: 'border-box' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', marginBottom: '1rem' }}>Parameters</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1.5rem' }}>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'thin' }}>Age</span>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'thin' }}>Gender</span>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'thin' }}>Urban</span>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'thin' }}>Education</span>
          <span style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 'thin' }}>Religion</span>
        </div>
      </div>
      {/* Right canvas area - scrollable */}
      <div style={{ padding: 0, background: '#000000ff', height: '100vh', overflow: 'auto', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', background: '#000000ff', borderRadius: '12px', boxShadow: '0 0 24px #0008', cursor: 'grab', touchAction: 'none' }} />
        </div>
      </div>
    </div>
  )
}

export default App
