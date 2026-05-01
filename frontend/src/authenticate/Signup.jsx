import { useMemo, useState } from 'react'
import './auth.css'

function Signup({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const passwordStrength = useMemo(() => {
    const { password } = form
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    if (score <= 1) return { label: 'Weak', className: 'weak' }
    if (score <= 3) return { label: 'Medium', className: 'medium' }
    return { label: 'Strong', className: 'strong' }
  }, [form.password])

  const emailIsValid = /\S+@\S+\.\S+/.test(form.email)
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword

  const canSubmit =
    form.fullName.trim() &&
    emailIsValid &&
    form.password.length >= 8 &&
    passwordsMatch &&
    form.acceptedTerms

  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <p className="auth-kicker">SQL Game</p>
        <h1>Create your account</h1>
        <p className="auth-subtext">Join now and start solving SQL challenges.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              name="fullName"
              placeholder="White Rabbit"
              value={form.fullName}
              onChange={updateField}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={updateField}
            />
          </label>

          <label>
            Password
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={updateField}
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

          {form.password && (
            <div className={`strength ${passwordStrength.className}`}>
              Password strength: {passwordStrength.label}
            </div>
          )}

          <label>
            Confirm password
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="Repeat your password"
              value={form.confirmPassword}
              onChange={updateField}
            />
          </label>

          {form.confirmPassword && !passwordsMatch && (
            <p className="field-error">Passwords do not match.</p>
          )}

          <label className="checkbox-row">
            <input
              type="checkbox"
              name="acceptedTerms"
              checked={form.acceptedTerms}
              onChange={updateField}
            />
            I agree to the Terms and Privacy Policy.
          </label>

          <button className="auth-btn" type="submit" disabled={!canSubmit}>
            Create Account
          </button>

          {submitted && canSubmit && (
            <p className="success-text">Account created! Let&apos;s get you started.</p>
          )}
        </form>

        <p className="switch-text">
          Already have an account?{' '}
          <button type="button" className="text-btn" onClick={onSwitchToLogin}>
            Sign in
          </button>
        </p>
      </section>

      <aside className="visual-panel">
        <div className="badge">Level Up</div>
        <h2>Practice SQL with real game-like missions.</h2>
        <p>Track your progress, unlock badges, and build confidence query by query.</p>
      </aside>
    </div>
  )
}

export default Signup
