import './App.css'

function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '0.6fr 2fr', background: '#111' }}>
      {/* Left 1/3rd */}
      <div style={{ borderRight: '1px solid #ffffffff', background: '#000000ff', padding: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffffff', marginBottom: '1rem' }}>Parameters</h2>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '1.5rem' }}>
          <span style={{ fontSize: '1.1rem', color: '#ffffffff', fontWeight: 'thin' }}>Age</span>
          <span style={{ fontSize: '1.1rem', color: '#ffffffff', fontWeight: 'thin' }}>Gender</span>
          <span style={{ fontSize: '1.1rem', color: '#ffffffff', fontWeight: 'thin' }}>Urban</span>
          <span style={{ fontSize: '1.1rem', color: '#ffffffff', fontWeight: 'thin' }}>Education</span>
          <span style={{ fontSize: '1.1rem', color: '#ffffffff', fontWeight: 'thin' }}>Religion</span>
        </div>
      </div>
      {/* Right 2/3rd */}
      <div style={{ padding: '2rem', background: '#000000ff' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#222' }}>Graph</h2>
        <p style={{ color: '#444', fontWeight: 'bold' }}>Graphs.</p>
      </div>
    </div>
  )
}

export default App
