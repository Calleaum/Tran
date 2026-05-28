import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/`)
        setMessage(response.data)
        setLoading(false)
      } catch (err) {
        setError('Failed to connect to backend')
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>🎮 Transcendence</h1>
        <p>Le Jeu du Président - Tournament Platform</p>
      </header>

      <main className="app-main">
        {loading && <p>Connecting to server...</p>}
        {error && <p className="error">{error}</p>}
        {message && <p className="message">{message}</p>}

        <section className="features">
          <h2>À venir</h2>
          <ul>
            <li>🎴 Jeux du Président en temps réel</li>
            <li>👥 Profils des joueurs</li>
            <li>🏆 Gestion des tournois</li>
            <li>💬 Chat en direct</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

export default App
