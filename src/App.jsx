// ...existing code...

function App() {
  return (
    <main style={{ minHeight: '100vh', background: '#fff', margin: 0 }}>
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#222', textAlign: 'center', marginTop: '2rem', marginBottom: '2rem' }}>
        Cigerrate and Smoking Data India
      </h1>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <canvas id="choropleth-canvas" width="700" height="600" style={{ background: '#e0e0e0', borderRadius: '16px', boxShadow: '0 0 24px #aaa' }}></canvas>
      </div>
    </main>
  )
}

export default App
