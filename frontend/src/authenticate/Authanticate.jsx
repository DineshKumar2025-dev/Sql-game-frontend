import { useState } from 'react'
import './auth.css'
import Login from './Login.jsx'
import Signup from './Signup.jsx'

function Authanticate({ onLoginSuccess }) {
  const [isLoginPage, setIsLoginPage] = useState(false)

  return (
    <div className="auth-container">
      {isLoginPage ? (
        <Login
          onSwitchToSignup={() => setIsLoginPage(false)}
          onLoginSuccess={onLoginSuccess}
        />
      ) : (
        <Signup
          onSwitchToLogin={() => setIsLoginPage(true)}
          onSignupSuccess={onLoginSuccess}
        />
      )}
    </div>
  )
}

export default Authanticate