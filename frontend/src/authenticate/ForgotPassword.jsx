import { useMemo, useState } from 'react'
import emailjs from '@emailjs/browser'
import './auth.css'

const API_BASE = import.meta.env.VITE_API_URL

function ForgotPassword({ onSwitchToLogin, onResetSuccess }) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [otpSent, setOtpSent] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const emailIsValid = /\S+@\S+\.\S+/.test(email)
  const passwordsMatch =
    newPassword.length > 0 && newPassword === confirmPassword

  const passwordStrength = useMemo(() => {
    let score = 0
    if (newPassword.length >= 8) score += 1
    if (/[A-Z]/.test(newPassword)) score += 1
    if (/[0-9]/.test(newPassword)) score += 1
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1

    if (score <= 1) return { label: 'Weak', className: 'weak' }
    if (score <= 3) return { label: 'Medium', className: 'medium' }
    return { label: 'Strong', className: 'strong' }
  }, [newPassword])

  const canRequestOtp = emailIsValid
  const canResetPassword =
    emailIsValid &&
    otp.trim().length === 6 &&
    newPassword.length >= 8 &&
    passwordsMatch

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
        subject: 'password reset request',
        to_email: receiverEmail,
        otp: otpCode,
        name: receiverName,
      },
      { publicKey },
    )
  }

  const handleRequestOtp = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')
    setSuccess('')

    if (!canRequestOtp) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/auth/forgot-password/request-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setError(data.detail ?? 'Failed to request OTP.')
        return
      }

      await sendOtpWithEmailJs(
        email.trim(),
        data.otp,
        data.user_name ?? 'there',
      )
      setOtpSent(true)
      setSuccess('OTP sent. Check your email and enter it below.')
    } catch (submitError) {
      setError('Server error while requesting OTP.')
      console.error(submitError)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (event) => {
    event.preventDefault()
    setSubmitted(true)
    setError('')
    setSuccess('')

    if (!canResetPassword) return

    setIsLoading(true)
    try {
      const response = await fetch(
        `${API_BASE}/api/auth/forgot-password/reset`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp: otp.trim(),
            new_password: newPassword,
          }),
        },
      )
      const data = await response.json()
      if (!response.ok) {
        setError(data.detail ?? 'Failed to reset password.')
        return
      }

      setSuccess('Password reset successful. You can now sign in.')
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setOtpSent(false)
      onResetSuccess?.()
    } catch (submitError) {
      setError('Server error while resetting password.')
      console.error(submitError)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <p className="auth-kicker">SQL Game</p>
        <h1>Forgot your password?</h1>
        <p className="auth-subtext">
          {otpSent
            ? 'Enter the OTP sent to your email and choose a new password.'
            : 'Enter your account email and we will send you an OTP to reset your password.'}
        </p>

        <form
          className="auth-form"
          onSubmit={otpSent ? handleResetPassword : handleRequestOtp}
        >
          <label>
            Email
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={otpSent}
            />
          </label>

          {submitted && !emailIsValid && (
            <p className="field-error">Please enter a valid email.</p>
          )}

          {otpSent && (
            <>
              <label>
                OTP
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  maxLength={6}
                />
              </label>

              <label>
                New password
                <div className="password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
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

              {newPassword && (
                <div className={`strength ${passwordStrength.className}`}>
                  Password strength: {passwordStrength.label}
                </div>
              )}

              <label>
                Confirm new password
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>

              {confirmPassword && !passwordsMatch && (
                <p className="field-error">Passwords do not match.</p>
              )}
            </>
          )}

          <button
            className="auth-btn"
            type="submit"
            disabled={
              isLoading ||
              (otpSent ? !canResetPassword : !canRequestOtp)
            }
          >
            {isLoading
              ? 'Please wait…'
              : otpSent
              ? 'Reset Password'
              : 'Send OTP'}
          </button>

          {otpSent && (
            <button
              type="button"
              className="text-btn"
              onClick={() => {
                setOtpSent(false)
                setOtp('')
                setNewPassword('')
                setConfirmPassword('')
                setError('')
                setSuccess('')
              }}
              disabled={isLoading}
            >
              Use a different email
            </button>
          )}

          {error && <p className="field-error">{error}</p>}
          {success && <p className="success-text">{success}</p>}
        </form>

        <p className="switch-text">
          Remembered your password?{' '}
          <button type="button" className="text-btn" onClick={onSwitchToLogin}>
            Back to Sign in
          </button>
        </p>
      </section>

      <aside className="visual-panel">
        <div className="badge">Account Recovery</div>
        <h2>Get back into your SQL missions in seconds.</h2>
        <p>
          We will send a one-time code to your email so you can safely choose a
          new password and pick up where you left off.
        </p>
      </aside>
    </div>
  )
}

export default ForgotPassword
