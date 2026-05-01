const handleSubmit = (event, setSubmitted) => {
    event.preventDefault()
    setSubmitted(true)
    localStorage.setItem('login_status', true)
    navigate('/main')
  }
export default handleSubmit