import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    first_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [changePassword, setChangePassword] = useState(false)
  const [deleteMode, setDeleteMode] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        email: user.email || '',
        current_password: '',
        new_password: '',
        confirm_password: ''
      })
    }
  }, [user])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
    setMessage('')
  }

  const scrollToTopFeedback = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    // Validation
    if (!formData.first_name.trim()) {
      setError('First name is required')
      setLoading(false)
      return
    }

    if (!formData.email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }

    // Password change validation
    if (changePassword) {
      if (!formData.current_password) {
        setError('Current password is required to change password')
        setLoading(false)
        return
      }

      if (!formData.new_password) {
        setError('New password is required')
        setLoading(false)
        return
      }

      if (formData.new_password !== formData.confirm_password) {
        setError('New passwords do not match')
        setLoading(false)
        return
      }

      if (formData.new_password.length < 8) {
        setError('New password must be at least 8 characters long')
        setLoading(false)
        return
      }
    }

    try {
      const token = localStorage.getItem('token')
      
      const requestBody = {
        first_name: formData.first_name,
        email: formData.email
      }

      // Only include password fields if changing password
      if (changePassword) {
        requestBody.current_password = formData.current_password
        requestBody.new_password = formData.new_password
      }

      const response = await fetch('http://localhost:8000/api/auth/profile/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (data.success) {
        setMessage(data.message)
        // Update user in context
        setUser(data.user)
        
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          current_password: '',
          new_password: '',
          confirm_password: ''
        }))
        setChangePassword(false)

        // Scroll to top to show message
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to connect to server')
    }

    setLoading(false)
  }

  const handleDeleteAccount = async () => {
    setError('')
    setMessage('')

    const confirmationWord = deleteConfirmText.trim().toUpperCase()

    if (confirmationWord !== 'DELETE') {
        setError('Incorrect confirmation word. Type DELETE to permanently delete your account.')
      scrollToTopFeedback()
      return
    }

    if (!deletePassword) {
      setError('Current password is required to delete your account')
      scrollToTopFeedback()
      return
    }

    try {
      setDeleting(true)
      const token = localStorage.getItem('token')

      const response = await fetch('http://localhost:8000/api/auth/profile/', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        },
        body: JSON.stringify({
          current_password: deletePassword
        })
      })

      const data = await response.json()

      if (data.success) {
        await logout()
        setUser(null)
        navigate('/login')
      } else {
        setError(data.error || 'Failed to delete account')
        scrollToTopFeedback()
      }
    } catch (err) {
      setError('Failed to connect to server')
      scrollToTopFeedback()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8">
          <h2 className="text-3xl font-extrabold text-white mb-6">
            Profile <span className="text-green-400">Settings</span>
          </h2>

          {message && (
            <div className="mb-4 p-4 bg-zinc-950 border border-green-500/30 text-green-400 rounded-lg">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-zinc-950 border border-red-500/30 text-red-400 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Information Section */}
            <div className="border-b border-zinc-700 pb-6">
              <h3 className="text-sm font-bold text-green-400 uppercase tracking-wide mb-4">
                Profile Information
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="first_name" className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">
                    First Name
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleChange}
                    className="block w-full px-3 py-3 bg-zinc-950 border border-zinc-700 text-white rounded focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full px-3 py-3 bg-zinc-950 border border-zinc-700 text-white rounded focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                  />
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="border-b border-zinc-700 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-green-400 uppercase tracking-wide">
                  Security
                </h3>
                <button
                  type="button"
                  onClick={() => setChangePassword(!changePassword)}
                  className="px-4 py-2 border border-zinc-700 rounded-lg text-zinc-200 hover:bg-zinc-800 font-medium transition-all duration-200"
                >
                  {changePassword ? 'Cancel Password Update' : 'Update Password'}
                </button>
              </div>

              {!changePassword && (
                <div className="mb-2">
                  <p className="text-sm text-zinc-500">
                    Keep your account secure by updating your password.
                  </p>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-green-400 hover:text-green-300 font-medium"
                  >
                    Forgot your password?
                  </Link>
                </div>
              )}

              {changePassword && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="current_password" className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">
                      Current Password
                    </label>
                    <input
                      id="current_password"
                      name="current_password"
                      type="password"
                      value={formData.current_password}
                      onChange={handleChange}
                      className="block w-full px-3 py-3 bg-zinc-950 border border-zinc-700 text-white rounded focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="new_password" className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">
                      New Password
                    </label>
                    <input
                      id="new_password"
                      name="new_password"
                      type="password"
                      value={formData.new_password}
                      onChange={handleChange}
                      className="block w-full px-3 py-3 bg-zinc-950 border border-zinc-700 text-white rounded focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                    />
                    <p className="mt-1 text-xs text-zinc-500">
                      Must be at least 8 characters long
                    </p>
                  </div>

                  <div>
                    <label htmlFor="confirm_password" className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type="password"
                      value={formData.confirm_password}
                      onChange={handleChange}
                      className="block w-full px-3 py-3 bg-zinc-950 border border-zinc-700 text-white rounded focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Delete Account Section */}
            <div className="border-b border-red-500/30 pb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">
                  Delete Account
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteMode(!deleteMode)
                    setDeleteConfirmText('')
                    setDeletePassword('')
                  }}
                  className="px-4 py-2 border border-red-500/40 rounded-lg text-red-300 hover:bg-red-500/10 font-medium transition-all duration-200"
                >
                  {deleteMode ? 'Cancel' : 'Delete My Account'}
                </button>
              </div>

              <p className="text-sm text-zinc-500 mb-3">
                This will permanently remove your account and associated data from our system.
              </p>

              <p className="text-sm text-zinc-500 mb-3">
                If you cannot remember your password, use{' '}
                <Link to="/forgot-password" className="text-green-400 hover:text-green-300 font-medium">
                  Forgot Password
                </Link>{' '}
                first.
              </p>

              {deleteMode && (
                <div className="space-y-4 p-4 bg-zinc-950 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-300">
                    This action cannot be undone. Type DELETE and enter your current password to confirm.
                  </p>

                  <div>
                    <label htmlFor="delete_confirm" className="block text-xs font-bold text-red-400 uppercase tracking-wide mb-1">
                      Type DELETE to Confirm
                    </label>
                    <input
                      id="delete_confirm"
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => {
                        setDeleteConfirmText(e.target.value)
                        setError('')
                      }}
                      className="block w-full px-3 py-3 bg-zinc-900 border border-zinc-700 text-white rounded focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="delete_password" className="block text-xs font-bold text-red-400 uppercase tracking-wide mb-1">
                      Current Password
                    </label>
                    <input
                      id="delete_password"
                      type="password"
                      value={deletePassword}
                      onChange={(e) => {
                        setDeletePassword(e.target.value)
                        setError('')
                      }}
                      className="block w-full px-3 py-3 bg-zinc-900 border border-zinc-700 text-white rounded focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all duration-200"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="w-full px-4 py-3 bg-red-500 hover:bg-red-400 text-zinc-950 rounded-lg font-bold transition-all duration-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
                  >
                    {deleting ? 'Deleting Account...' : 'Permanently Delete Account'}
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-4 py-2 border border-zinc-700 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-green-500 hover:bg-green-400 text-zinc-950 rounded-lg font-bold transition-all duration-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
