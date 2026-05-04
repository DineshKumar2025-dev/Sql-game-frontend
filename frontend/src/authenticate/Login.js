const handleSubmit = (event, setSubmitted, navigate) => {
    event.preventDefault()
    setSubmitted(true)
    localStorage.setItem('login_status', true)
    navigate('/main')
  }
export default handleSubmit