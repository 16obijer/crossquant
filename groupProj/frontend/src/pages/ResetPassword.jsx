import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

export default function ResetPassword() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/auth/password-reset-confirm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          token,
          new_password: formData.newPassword
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message)
        setTimeout(() => navigate('/login'), 2000) // Redirect to login after 2 seconds
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to connect to server')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-zinc-900 p-8 rounded-xl border border-zinc-800">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            Set new password
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Enter your new password below
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {message && (
            <div className="rounded-lg bg-zinc-950 border border-green-500/30 p-4">
              <p className="text-sm text-green-400">{message}</p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-zinc-950 border border-red-500/30 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="newPassword" className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">New Password</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                className="appearance-none block w-full px-3 py-3 bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-600 rounded focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200 sm:text-sm"
                placeholder="Min 8 characters"
                value={formData.newPassword}
                onChange={handleChange}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none block w-full px-3 py-3 bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-600 rounded focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200 sm:text-sm"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 rounded-lg text-sm font-bold text-zinc-950 bg-green-500 hover:bg-green-400 transition-all duration-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting password...' : 'Reset password'}
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="font-medium text-sm text-green-400 hover:text-green-300">
              Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
