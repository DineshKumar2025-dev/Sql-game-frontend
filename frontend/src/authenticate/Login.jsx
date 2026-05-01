import { useState } from 'react'
import './auth.css'

function Login({ onSwitchToSignup, onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const canSubmit = /\S+@\S+\.\S+/.test(email) && password.length >= 8

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')

    if (!canSubmit) return

    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.detail ?? 'Login failed.')
        return
      }

      localStorage.setItem('login_status', 'true')
      localStorage.setItem('auth_token', data.token ?? '')
      localStorage.setItem('user', JSON.stringify(data.user ?? {}))
      onLoginSuccess?.()
    } catch (submitError) {
      setError('Server error while signing in.')
      console.error(submitError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <p className="auth-kicker">SQL Game</p>
        <h1>Welcome back</h1>
        <p className="auth-subtext">Sign in to continue your SQL adventure.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          <div className="form-row">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Remember me
            </label>
            <button type="button" className="text-btn">
              Forgot password?
            </button>
          </div>

          <button className="auth-btn" type="submit" disabled={!canSubmit || isLoading}>
            Sign In
          </button>

          {error && <p className="field-error">{error}</p>}
          {submitted && canSubmit && !error && (
            <p className="success-text">Signed in successfully. Welcome back!</p>
          )}
        </form>

        <p className="switch-text">
          Don&apos;t have an account?{' '}
          <button type="button" className="text-btn" onClick={onSwitchToSignup}>
            Sign up
          </button>
        </p>
      </section>

      <aside className="visual-panel">
        <div className="badge">Challenge Mode</div>
        <h2>Stay sharp and keep your SQL streak alive.</h2>
        <p>Log in to continue missions, compare scores, and unlock tougher levels.</p>
      </aside>
    </div>
  )
}

export default Login
