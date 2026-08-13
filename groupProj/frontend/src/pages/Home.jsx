import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { isAuthenticated, token } = useAuth();
  const [portfolioSummary, setPortfolioSummary] = useState(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [portfolioError, setPortfolioError] = useState('')
  const [recentPostcodes, setRecentPostcodes] = useState([])
  const [recentPostcodesLoading, setRecentPostcodesLoading] = useState(false)
  const [recentPostcodesError, setRecentPostcodesError] = useState('')

  const fetchPostcodePrice = async (postcode) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/postcode_district_lookup/?postcode_district=${postcode}`
      )
      if (response.ok) {
        const data = await response.json()
        return data.predicted_price || null
      }
    } catch (error) {
      console.warn(`Failed to fetch price for ${postcode}:`, error)
    }
    return null
  }

  useEffect(() => {
    const fetchPortfolioSummary = async () => {
      if (!isAuthenticated || !token) {
        setPortfolioSummary(null)
        setPortfolioError('')
        setPortfolioLoading(false)
        return
      }

      setPortfolioLoading(true)
      setPortfolioError('')

      try {
        const response = await fetch('http://127.0.0.1:8000/api/portfolio/summary/', {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Unable to load portfolio summary')
        }

        const data = await response.json()
        setPortfolioSummary(data)
      } catch {
        setPortfolioSummary(null)
        setPortfolioError('Unable to load portfolio summary right now.')
      } finally {
        setPortfolioLoading(false)
      }
    }

    fetchPortfolioSummary()
  }, [isAuthenticated, token])

  useEffect(() => {
    const fetchRecentPostcodes = async () => {
      if (!isAuthenticated || !token) {
        setRecentPostcodes([])
        setRecentPostcodesError('')
        setRecentPostcodesLoading(false)
        return
      }

      setRecentPostcodesLoading(true)
      setRecentPostcodesError('')

      try {
        const response = await fetch('http://127.0.0.1:8000/api/get_recent_postcodes/', {
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Unable to load recent postcodes')
        }

        const data = await response.json()
        const postcodes = data.recent_postcodes || []

        // Fetch prices for each postcode
        const postcodesWithPrices = await Promise.all(
          postcodes.map(async (postcode) => {
            const price = await fetchPostcodePrice(postcode)
            return { postcode, price }
          })
        )

        setRecentPostcodes(postcodesWithPrices)
      } catch {
        setRecentPostcodes([])
        setRecentPostcodesError('Unable to load recent postcodes right now.')
      } finally {
        setRecentPostcodesLoading(false)
      }
    }

    fetchRecentPostcodes()
  }, [isAuthenticated, token])

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.28)_0%,rgba(34,197,94,0.16)_26%,rgba(34,197,94,0.06)_46%,rgba(24,24,27,0)_72%)]" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-white mb-4 leading-tight tracking-tight">Welcome to <span className="text-green-400">CrossQuant</span></h1>
        <p className="text-lg text-zinc-400 max-w-xl mx-auto">Your comprehensive financial analysis platform — built for speed, precision, and clarity.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Options Pricing  */}
        <Link to="/options-pricing" className="group bg-zinc-900 border border-zinc-800 hover:border-green-500/60 rounded-xl p-6 transition-all duration-300 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-green-900/20">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors duration-300">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors duration-300">Options Pricing</h3>
          <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">Calculate fair prices for Nasdaq 100 futures options using our XGBoost pricing model.</p>
        </Link>

        {/* House Pricing  */}
        <Link to="/house-pricing" className="group bg-zinc-900 border border-zinc-800 hover:border-green-500/60 rounded-xl p-6 transition-all duration-300 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-green-900/20">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors duration-300">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors duration-300">House Pricing</h3>
          <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">Estimate property values across Kent with our machine learning models and live map.</p>
        </Link>

        {/* Sentiment Analysis  */}
        <Link to="/sentiment-analysis" className="group bg-zinc-900 border border-zinc-800 hover:border-green-500/60 rounded-xl p-6 transition-all duration-300 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-green-900/20">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors duration-300">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors duration-300">Sentiment Analysis</h3>
          <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">Analyse market sentiment from financial news using advanced NLP techniques.</p>
        </Link>

        {/* Portfolio Tracker  */}
        <Link 
          to={isAuthenticated ? "/portfolio" : "/login"} 
          className="group bg-zinc-900 border border-zinc-800 hover:border-green-500/60 rounded-xl p-6 transition-all duration-300 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-green-900/20"
        >
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors duration-300">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors duration-300">Portfolio Tracker</h3>
          <p className="text-zinc-400 text-sm leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
            {isAuthenticated 
              ? "Track your stocks, view geographic and sector breakdown, and monitor your gains in real-time."
              : "Sign in to track your stock portfolio with live prices, charts, and performance metrics."}
          </p>
        </Link>
      </div>

      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-bold text-white">Portfolio Summary</h2>
          <Link
            to={isAuthenticated ? '/portfolio' : '/login'}
            className="text-sm font-semibold text-green-400 hover:text-green-300 transition-colors"
          >
            {isAuthenticated ? 'Open Portfolio' : 'Login'}
          </Link>
        </div>

        {!isAuthenticated ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
            <p className="text-zinc-300 text-sm">Login to view portfolio summary.</p>
          </div>
        ) : portfolioLoading ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
            <p className="text-zinc-300 text-sm">Loading portfolio summary...</p>
          </div>
        ) : portfolioError ? (
          <div className="bg-zinc-950 border border-red-500/30 rounded-lg p-5">
            <p className="text-red-400 text-sm">{portfolioError}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Total Value</p>
              <p className="text-xl font-bold text-white">${portfolioSummary?.total_value?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Total Gain/Loss</p>
              <p className={`text-xl font-bold ${(portfolioSummary?.total_gain_loss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${Math.abs(portfolioSummary?.total_gain_loss || 0).toFixed(2)}
              </p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Total Cost</p>
              <p className="text-xl font-bold text-white">${portfolioSummary?.total_cost?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <p className="text-zinc-400 text-xs uppercase tracking-wide mb-1">Stocks Held</p>
              <p className="text-xl font-bold text-white">{portfolioSummary?.stocks_count || 0}</p>
            </div>
          </div>
        )}
      </div>

      {isAuthenticated && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-bold text-white">Recent House Searches</h2>
            <Link
              to="/house-pricing"
              className="text-sm font-semibold text-green-400 hover:text-green-300 transition-colors"
            >
              New Search
            </Link>
          </div>

          {recentPostcodesLoading ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
              <p className="text-zinc-300 text-sm">Loading recent searches...</p>
            </div>
          ) : recentPostcodesError ? (
            <div className="bg-zinc-950 border border-red-500/30 rounded-lg p-5">
              <p className="text-red-400 text-sm">{recentPostcodesError}</p>
            </div>
          ) : recentPostcodes.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-5">
              <p className="text-zinc-300 text-sm">No recent searches yet. <Link to="/house-pricing" className="text-green-400 hover:text-green-300">Start exploring</Link>.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentPostcodes.map(({ postcode, price }, index) => (
                <Link
                  key={index}
                  to={`/house-pricing?postcode=${postcode}`}
                  className="group bg-zinc-950 border border-zinc-800 hover:border-green-500/60 rounded-lg p-4 transition-all duration-300 hover:bg-zinc-800/80"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                      </div>
                      <p className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">{postcode}</p>
                    </div>
                    <p className="text-lg font-bold text-white">
                      {price ? `£${(price / 1000).toFixed(0)}K` : '...'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
