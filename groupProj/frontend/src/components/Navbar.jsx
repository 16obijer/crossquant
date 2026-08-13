import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/options-pricing', label: 'Options Pricing' },
  { to: '/house-pricing', label: 'House Pricing' },
  { to: '/sentiment-analysis', label: 'Sentiment Analysis' },
  { to: '/portfolio', label: 'Portfolio' },  // Added Portfolio here
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (to) => location.pathname === to

  const handleLogout = () => {
    logout()
    setMobileOpen(false)
    navigate('/login')
  }

  return (
    <nav className="bg-zinc-900 border-b border-zinc-700/60 sticky top-0 backdrop-blur-md z-[2000] shadow-lg shadow-black/30">
      <div className="max-w-[88rem] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-1.5 group shrink-0 md:-ml-3 lg:-ml-5">
            <img src="/CrossQuant logo.png" alt="CrossQuant Logo" className="w-8 h-8" />
            <span className="text-2xl font-bold text-white group-hover:text-green-400 transition-colors duration-200">CrossQuant</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1.5 min-w-0">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`relative px-3 lg:px-4 py-2.5 rounded-md text-sm lg:text-base font-medium whitespace-nowrap transition-all duration-200 ${
                  isActive(to)
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-zinc-400 hover:text-green-400 hover:bg-green-500/10'
                }`}
              >
                {label}
                {isActive(to) && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green-400 rounded-full" />
                )}
              </Link>
            ))}

            {/* Auth section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 lg:gap-1.5 ml-2 lg:ml-4 pl-3 lg:pl-6 border-l border-zinc-700/60 min-w-0">
                <span
                  title={`Hi, ${user?.first_name || ''}`}
                  className="text-zinc-400 text-sm font-medium max-w-20 lg:max-w-32 truncate"
                >
                  Hi, {user?.first_name}
                </span>
                <Link
                  to="/profile"
                  className={`relative px-3 lg:px-4 py-2.5 rounded-md text-sm lg:text-base font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive('/profile')
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-zinc-400 hover:text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  Profile
                  {isActive('/profile') && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green-400 rounded-full" />
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-3 lg:px-4 py-2.5 rounded-md text-sm lg:text-base font-medium whitespace-nowrap text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 lg:gap-2 ml-2 lg:ml-4 pl-2 border-l border-zinc-700/60">
                <Link
                  to="/login"
                className={`relative px-3 lg:px-4 py-2.5 rounded-md text-sm lg:text-base font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive('/login')
                      ? 'text-green-400 bg-green-500/10'
                    : 'text-zinc-400 hover:text-green-400 hover:bg-green-500/10'
                  }`}
                >
                {isActive("/login") && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-green-400 rounded-full" />
                )}
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-3 rounded-md text-sm font-bold bg-green-500 text-zinc-950 hover:bg-green-400 transition-all duration-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-zinc-400 hover:text-white transition-colors duration-200 p-2 rounded-md hover:bg-zinc-800"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-zinc-700/60 py-2">
            {NAV_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md mx-1 my-0.5 transition-colors duration-200 ${
                  isActive(to)
                    ? 'text-green-400 bg-green-500/10'
                    : 'text-zinc-400 hover:text-green-400 hover:bg-green-500/10'
                }`}
              >
                {isActive(to) && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                {label}
              </Link>
            ))}
            {isAuthenticated ? (
              <>
                <div className="px-4 py-3text-zinc-500 text-xs font-bold uppercase tracking-wide border-t border-zinc-700/60 mt-2 pt-3 mx-1">
                  Hi, {user?.first_name}
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md mx-1 my-0.5 transition-colors duration-200 ${
                    isActive('/profile')
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-zinc-400 hover:text-green-400 hover:bg-green-500/10'
                  }`}
                >
                  {isActive('/profile') && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center px-4 py-3 text-sm font-medium rounded-md mx-1 my-0.5 text-red-400 hover:text-white hover:bg-red-500/20 transition-colors duration-200"
                >
                  Logout
                </button>
              </>
            ) : (
              <div className="border-t border-zinc-700/60 mt-2 pt-2 mx-1">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-medium rounded-md my-0.5 text-zinc-400 hover:text-green-400 hover:bg-green-500/10 transition-colors duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center px-4 py-3 text-sm font-bold rounded-md my-0.5 text-green-400 hover:text-white hover:bg-green-500/20 transition-colors duration-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
