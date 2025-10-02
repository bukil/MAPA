import './App.css'

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 2fr' }}>
      {/* Left 1/3rd */}
      <div style={{ borderRight: '2px solid #e5e7eb', background: '#f3f4f6', padding: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151', marginBottom: '2rem' }}>Parameters</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1.5rem' }}>
          <span style={{ fontSize: '1.1rem', color: '#374151' }}>Age</span>
          <span style={{ fontSize: '1.1rem', color: '#374151' }}>Gender</span>
          <span style={{ fontSize: '1.1rem', color: '#374151' }}>Urban</span>
          <span style={{ fontSize: '1.1rem', color: '#374151' }}>Education</span>
          <span style={{ fontSize: '1.1rem', color: '#374151' }}>Religion</span>
        </div>
      </div>
      {/* Right 2/3rd */}
      <div style={{ padding: '2rem', background: '#fff' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>Graph</h2>
        <p style={{ color: '#6b7280' }}>Graphs.</p>
      </div>
    </div>
  )
}

export default App
