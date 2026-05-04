import { useMemo, useState } from 'react'
import emailjs from '@emailjs/browser'
import './auth.css'

function Signup({ onSwitchToLogin, onSignupSuccess }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  })
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const sendOtpWithEmailJs = async (receiverEmail, otpCode, receiverName) => {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

    if (!serviceId || !templateId || !publicKey) {
      throw new Error('EmailJS environment variables are missing.')
    }

    await emailjs.send(
      serviceId,
      templateId,
      {
        to_email: receiverEmail,
        otp: otpCode,
        name: receiverName,
      },
      {
        publicKey,
      },
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')
    setSuccess('')

    if (!canSubmit) return

    setIsLoading(true)
    try {
      if (!otpSent) {
        const response = await fetch('http://localhost:8000/api/auth/request-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_name: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            password: form.password,
          }),
        })
        const data = await response.json()
        if (!response.ok) {
          setError(data.detail ?? 'Failed to request OTP.')
          return
        }

        await sendOtpWithEmailJs(form.email.trim(), data.otp, form.fullName.trim())
        setOtpSent(true)
        setSuccess('OTP sent. Check your email and enter it below.')
        return
      }

      const response = await fetch('http://localhost:8000/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          otp: otp.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.detail ?? 'Signup failed.')
        return
      }

      setSuccess('Account created successfully.')
      localStorage.setItem('login_status', 'true')
      localStorage.setItem('user', JSON.stringify(data.user ?? {}))
      localStorage.setItem('user_id', data.user.user_id);
      localStorage.setItem('highest_level_completed', data.user.highest_level_completed)
      setOtp('')
      setOtpSent(false)
      onSignupSuccess?.()
    } catch (submitError) {
      setError('Server error while processing signup.')
      console.error(submitError)
    } finally {
      setIsLoading(false)
    }
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

          {otpSent && (
            <label>
              OTP
              <input
                type="text"
                name="otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
              />
            </label>
          )}

          <button className="auth-btn" type="submit" disabled={!canSubmit || isLoading}>
            {otpSent ? 'Verify OTP & Create Account' : 'Send OTP'}
          </button>

          {error && <p className="field-error">{error}</p>}
          {submitted && canSubmit && success && <p className="success-text">{success}</p>}
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
