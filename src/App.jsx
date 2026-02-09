import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <div className="container">
        <h1>SkyNET</h1>
        <p className="subtitle">Welcome to your application</p>
        
        <div className="card">
          <h2>Counter Example</h2>
          <div className="counter">
            <button onClick={() => setCount(count - 1)}>-</button>
            <span className="count">{count}</span>
            <button onClick={() => setCount(count + 1)}>+</button>
          </div>
        </div>

        <div className="card">
          <h2>Getting Started</h2>
          <p>Your app is running! Start building your features here.</p>
        </div>
      </div>
    </div>
  )
}

export default App
