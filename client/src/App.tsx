import { useEffect, useState } from 'react'
import { fetchHealth, fetchHello } from './api'
import './App.css'

function App() {
  const [health, setHealth] = useState<string>('checking…')
  const [message, setMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchHealth()
      .then((data) => {
        if (!cancelled) setHealth(`${data.service}: ${data.status}`)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setHealth('unreachable')
          setError(err instanceof Error ? err.message : 'Failed to reach API')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  async function handleHello() {
    setError(null)
    try {
      const data = await fetchHello('CrackEd')
      setMessage(data.message)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Request failed')
    }
  }

  return (
    <main className="app">
      <h1>CrackEd</h1>
      <p className="status">API status: {health}</p>
      {error ? <p className="error">{error}</p> : null}
      <button type="button" onClick={handleHello}>
        Call /api/hello
      </button>
      {message ? <p className="message">{message}</p> : null}
    </main>
  )
}

export default App
