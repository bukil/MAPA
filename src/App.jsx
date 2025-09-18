import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Fade and scale in logos and headings
      gsap.from(".logo, h1, .card, .read-the-docs", {
        opacity: 0,
        y: 16,
        scale: 0.95,
        duration: 0.6,
        stagger: 0.1,
        ease: "power2.out",
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={containerRef}>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>VBabub </h1>
      <div className="card">
        <button
          ref={buttonRef}
          onClick={() => {
            setCount((c) => c + 1)
            // playful bounce on click
            gsap.fromTo(
              buttonRef.current,
              { scale: 1 },
              { scale: 1.1, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.out" }
            )
          }}
        >
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Mukil
      </p>
    </div>
  )
}

export default App
