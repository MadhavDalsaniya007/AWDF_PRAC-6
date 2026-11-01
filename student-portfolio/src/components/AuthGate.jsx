import { useState } from 'react'
import { login, register, setToken } from '../api'

// The backend's POST/PUT /tasks routes are protected by JWT auth middleware
// (see middleware/auth.js from Practical 5). This small widget lets the user
// register or log in from the UI so the app has a token to send with writes.
function AuthGate({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const action = mode === 'login' ? login : register
      const data = await action(email, password)
      setToken(data.token)
      onAuthenticated()
    } catch (err) {
      setError(err.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <h3>{mode === 'login' ? 'Log in' : 'Create an account'}</h3>
      <p>Sign in to create or edit tasks. Viewing and deleting tasks doesn't require login.</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" className="cta-button" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>
      </form>

      <button
        type="button"
        className="link-button"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? "Need an account? Register" : 'Already have an account? Log in'}
      </button>
    </div>
  )
}

export default AuthGate
