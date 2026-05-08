import { useState } from 'react'
import './auth.css'
import Login from './Login.jsx'
import Signup from './Signup.jsx'
import ForgotPassword from './ForgotPassword.jsx'

const VIEWS = {
  SIGNUP: 'signup',
  LOGIN: 'login',
  FORGOT: 'forgot',
}

function Authanticate({ onLoginSuccess }) {
  const [view, setView] = useState(VIEWS.SIGNUP)

  return (
    <div className="auth-container">
      {view === VIEWS.LOGIN && (
        <Login
          onSwitchToSignup={() => setView(VIEWS.SIGNUP)}
          onSwitchToForgotPassword={() => setView(VIEWS.FORGOT)}
          onLoginSuccess={onLoginSuccess}
        />
      )}

      {view === VIEWS.SIGNUP && (
        <Signup
          onSwitchToLogin={() => setView(VIEWS.LOGIN)}
          onSignupSuccess={onLoginSuccess}
        />
      )}

      {view === VIEWS.FORGOT && (
        <ForgotPassword
          onSwitchToLogin={() => setView(VIEWS.LOGIN)}
          onResetSuccess={() => setView(VIEWS.LOGIN)}
        />
      )}
    </div>
  )
}

export default Authanticate
