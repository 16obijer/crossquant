import { useState } from 'react'
import Plot from 'react-plotly.js'

export default function OptionsPricing() {
  const [optionType, setOptionType] = useState('1')
  const [prediction, setPrediction] = useState(null)
  const [black76Price, setBlack76Price] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showRateInfoModal, setShowRateInfoModal] = useState(false)
  const [chartZoom, setChartZoom] = useState('focused')
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(1)
  
  // Form state
  const [formData, setFormData] = useState({
    S: '18000',
    K: '18500',
    T: '30',
    sigma: '20',
  })

  const closeTutorial = () => {
    setShowTutorial(false)
    setTutorialStep(1)
  }

  const openTutorial = () => {
    setTutorialStep(1)
    setShowTutorial(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setPrediction(null)

    const parsedFormData = {
      S: Number(formData.S),
      K: Number(formData.K),
      T: Number(formData.T),
      sigma: Number(formData.sigma),
    }

    try {
      const response = await fetch('http://localhost:8000/api/options/predict-option-price/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          S: parsedFormData.S,
          K: parsedFormData.K,
          T: parsedFormData.T,
          sigma: parsedFormData.sigma,
          option_type: parseInt(optionType)
        })
      })

      const data = await response.json()

      if (data.success) {
        setPrediction(data.ml_price)
        setBlack76Price(data.black76_price)
      } else {
        setError(data.error || 'Prediction failed')
      }
    } catch (err) {
      setError('Failed to connect to the server. Make sure Django is running on port 8000.')
      console.error('API Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getDifference = () => {
    if (prediction !== null && black76Price !== null) {
      const diff = prediction - black76Price
      const percentDiff = ((diff / black76Price) * 100).toFixed(1)
      return { diff, percentDiff }
    }
    return null
  }

  // Generate payoff diagram data
  // const generatePayoffData = () => {
  //   if (prediction === null || black76Price === null) return []
    
  //   const isCall = optionType === '1'
  //   const strike = formData.K
  //   const futuresPrice = formData.S
    
  //   // Generate price range around current price (±30%)
  //   const minPrice = futuresPrice * 0.7
  //   const maxPrice = futuresPrice * 1.3
  //   const step = (maxPrice - minPrice) / 50
    
  //   const data = []
  //   for (let price = minPrice; price <= maxPrice; price += step) {
  //     // Calculate intrinsic value (payoff at expiration)
  //     const intrinsicValue = isCall 
  //       ? Math.max(0, price - strike)
  //       : Math.max(0, strike - price)
      
  //     // Profit/Loss = Intrinsic Value - Premium Paid
  //     const profitLossML = intrinsicValue - prediction
  //     const profitLossBlack76 = intrinsicValue - black76Price
      
  //     data.push({
  //       price: Math.round(price),
  //       intrinsicValue,
  //       profitLossML,
  //       profitLossBlack76
  //     })
  //   }
    
  //   return data
  // }
  const generatePayoffData = () => {
    if (prediction === null || black76Price === null) return []

    const isCall = optionType === '1'
    const strike = Number(formData.K)
    const futuresPrice = Number(formData.S)
    const breakEven = getBreakEven()
    const maxPremium = Math.max(prediction, black76Price)
    const premiumGap = Math.abs(prediction - black76Price)

    // Focused mode: premium-aware buffers to compare model lines clearly.
    // Wide mode: broader context to inspect full payoff shape.
    const keyPrices = [futuresPrice, strike, breakEven].filter((value) => Number.isFinite(value))
    const minKey = Math.min(...keyPrices)
    const maxKey = Math.max(...keyPrices)

    const minFocusedBuffer = Math.max(premiumGap * 8, 40)
    const downsideBuffer = Math.max(maxPremium * (isCall ? 0.45 : 0.7), minFocusedBuffer)
    const upsideBuffer = Math.max(maxPremium * (isCall ? 0.7 : 0.45), minFocusedBuffer)

    const focusedMinPrice = Math.max(0, minKey - downsideBuffer)
    const focusedMaxPrice = maxKey + upsideBuffer

    const wideMinPrice = Math.max(0, futuresPrice * 0.7)
    const wideMaxPrice = futuresPrice * 1.3

    const minPrice = chartZoom === 'wide' ? wideMinPrice : focusedMinPrice
    const maxPrice = chartZoom === 'wide' ? wideMaxPrice : focusedMaxPrice
    const points = 75
    const step = (maxPrice - minPrice) / points

    // Build set of prices, injecting exact values we need reference lines on.
    const priceSet = new Set()
    for (let price = minPrice; price <= maxPrice; price += step) {
      priceSet.add(Math.round(price))
    }
    priceSet.add(Math.round(strike))
    if (breakEven) priceSet.add(Math.round(breakEven))

    return Array.from(priceSet)
      .sort((a, b) => a - b)
      .map((price) => {
        const intrinsicValue = isCall
          ? Math.max(0, price - strike)
          : Math.max(0, strike - price)
        return {
          price,
          intrinsicValue,
          profitLossML: intrinsicValue - prediction,
          profitLossBlack76: intrinsicValue - black76Price,
        }
      })
  }
  

  // Calculate break-even point
  const getBreakEven = () => {
    if (prediction === null) return null
    const isCall = optionType === '1'
    const strike = Number(formData.K)
    return isCall ? strike + prediction : strike - prediction
  }

  const getChartRanges = (payoffData, zoomMode) => {
    if (!payoffData.length) return null

    const xValues = payoffData.map((point) => point.price)
    const yValues = payoffData.flatMap((point) => [point.profitLossML, point.profitLossBlack76])

    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)
    const minY = Math.min(...yValues)
    const maxY = Math.max(...yValues)

    const isFocused = zoomMode === 'focused'
    const xPadding = isFocused
      ? Math.max((maxX - minX) * 0.02, 20)
      : Math.max((maxX - minX) * 0.05, 50)
    const yPadding = isFocused
      ? Math.max((maxY - minY) * 0.04, 10)
      : Math.max((maxY - minY) * 0.1, 25)

    return {
      x: [minX - xPadding, maxX + xPadding],
      y: [minY - yPadding, maxY + yPadding],
    }
  }

  const payoffData = generatePayoffData()
  const chartRanges = getChartRanges(payoffData, chartZoom)
  const markerStep = Math.max(1, Math.floor(payoffData.length / 10))
  const markerData = payoffData.filter((_, index) => index % markerStep === 0 || index === payoffData.length - 1)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-4xl font-bold text-white">Options Pricing <span className="text-green-400">Calculator</span></h1>
        <button
          type="button"
          onClick={openTutorial}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-green-400 hover:border-green-500/50 rounded-lg transition-all"
        >
          Tutorial
        </button>
      </div>
      <p className="text-zinc-400 mb-6">Calculate fair prices for Nasdaq 100 futures options using our XGBoost model.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form and Results */}
        <div className="flex flex-col min-h-[900px]">
          <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white">Option Parameters</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowRateInfoModal(true)}
                className="p-2 text-zinc-400 hover:text-green-400 hover:bg-zinc-800 rounded-lg transition-all"
                title="Model Information"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5 flex-shrink-0">
          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">Futures Price ($)</label>
              <input
                type="number"
                name="S"
                step="0.01"
                value={formData.S}
                onChange={handleInputChange}
                required
                className="w-full bg-zinc-950 text-white border border-zinc-700 rounded p-3 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">Strike Price ($)</label>
              <input
                type="number"
                name="K"
                step="0.01"
                value={formData.K}
                onChange={handleInputChange}
                required
                className="w-full bg-zinc-950 text-white border border-zinc-700 rounded p-3 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">Days</label>
              <input
                type="number"
                name="T"
                step="1"
                value={formData.T}
                onChange={handleInputChange}
                required
                className="w-full bg-zinc-950 text-white border border-zinc-700 rounded p-3 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">Vol (%)</label>
              <input
                type="number"
                name="sigma"
                step="0.1"
                value={formData.sigma}
                onChange={handleInputChange}
                required
                className="w-full bg-zinc-950 text-white border border-zinc-700 rounded p-3 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-green-400 uppercase tracking-wide mb-1">Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOptionType('1')}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all duration-200 border ${
                  optionType === '1'
                    ? 'text-green-400 bg-green-500/10 border-green-400/60'
                    : 'text-zinc-400 border-transparent hover:text-green-400 hover:bg-green-500/10'
                }`}
              >
                Call Option
              </button>
              <button
                type="button"
                onClick={() => setOptionType('0')}
                className={`flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all duration-200 border ${
                  optionType === '0'
                    ? 'text-green-400 bg-green-500/10 border-green-400/60'
                    : 'text-zinc-400 border-transparent hover:text-green-400 hover:bg-green-500/10'
                }`}
              >
                Put Option
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 text-zinc-950 font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-all duration-200 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed"
          >
            {loading ? 'Calculating...' : 'Calculate Fair Price'}
          </button>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-zinc-950 border border-red-500/30 rounded-lg">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wide mb-1">Error</p>
            <p className="text-sm text-zinc-400">{error}</p>
          </div>
        )}

        {/* Results Display */}
        {prediction !== null && black76Price !== null && (
          <div className="mt-6 space-y-4">
            {/* ML Model Price */}
            <div className="p-5 bg-zinc-950 border border-green-500/30 rounded-lg">
              <p className="text-xs font-bold text-green-400 uppercase tracking-wide mb-2">ML Model Price (XGBoost)</p>
              <p className="text-3xl font-bold text-green-400 tabular-nums">${prediction.toFixed(2)}</p>
              <p className="text-xs text-zinc-500 mt-1">Trained on real CME market data</p>
            </div>

            {/* Black-76 Price */}
            <div className="p-5 bg-zinc-950 border border-blue-500/30 rounded-lg">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2">Black-76 Formula Price</p>
              <p className="text-3xl font-bold text-blue-400 tabular-nums">${black76Price.toFixed(2)}</p>
              <p className="text-xs text-zinc-500 mt-1">Theoretical futures option pricing</p>
            </div>

            {/* Comparison */}
            {(() => {
              const comparison = getDifference()
              if (comparison) {
                const isMLHigher = comparison.diff > 0
                return (
                  <div className="p-4 bg-zinc-950 border border-zinc-700 rounded-lg">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2">Comparison</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">Difference:</span>
                      <span className={`text-lg font-bold tabular-nums ${
                        isMLHigher ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {isMLHigher ? '+' : ''}${comparison.diff.toFixed(2)} ({comparison.percentDiff}%)
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      {isMLHigher 
                        ? 'ML model predicts higher price (may reflect market risk premium)' 
                        : 'ML model predicts lower price compared to Black-76'}
                    </p>
                  </div>
                )
              }
              return null
            })()}
          </div>
        )}
          </div>
        </div>

        {/* Right Column: Payoff Diagram */}
        <div className="flex flex-col min-h-[900px]">
          {prediction !== null && black76Price !== null ? (
            <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Payoff Diagram</h2>
                <p className="text-sm text-zinc-400">Profit/Loss at Expiration</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-700 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setChartZoom('focused')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded transition-all duration-200 ${
                      chartZoom === 'focused'
                        ? 'bg-green-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-green-400'
                    }`}
                  >
                    Focused
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartZoom('wide')}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded transition-all duration-200 ${
                      chartZoom === 'wide'
                        ? 'bg-green-500 text-zinc-950'
                        : 'text-zinc-400 hover:text-green-400'
                    }`}
                  >
                    Wide
                  </button>
                </div>
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="p-2 text-zinc-400 hover:text-green-400 hover:bg-zinc-800 rounded-lg transition-all"
                  title="Learn about payoff diagrams"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
            
            <Plot
              data={[
                // ML halo to keep the line visible where traces are close
                {
                  x: payoffData.map(d => d.price),
                  y: payoffData.map(d => d.profitLossML),
                  type: 'scatter',
                  mode: 'lines',
                  showlegend: false,
                  hoverinfo: 'skip',
                  line: {
                    color: 'rgba(16,185,129,0.25)',
                    width: 8
                  }
                },
                // ML Model P/L Line
                {
                  x: payoffData.map(d => d.price),
                  y: payoffData.map(d => d.profitLossML),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'ML Model Price',
                  line: {
                    color: '#10b981',
                    width: 3
                  },
                  hovertemplate: '<b>Futures Price:</b> $%{x:,.0f}<br><b>ML Model P/L:</b> $%{y:,.0f}<extra></extra>'
                },
                {
                  x: markerData.map(d => d.price),
                  y: markerData.map(d => d.profitLossML),
                  type: 'scatter',
                  mode: 'markers',
                  showlegend: false,
                  hoverinfo: 'skip',
                  marker: {
                    symbol: 'circle',
                    size: 6,
                    color: '#10b981',
                    line: {
                      color: '#052e16',
                      width: 1
                    }
                  }
                },
                // Black-76 halo to keep dashed line visible where traces are close
                {
                  x: payoffData.map(d => d.price),
                  y: payoffData.map(d => d.profitLossBlack76),
                  type: 'scatter',
                  mode: 'lines',
                  showlegend: false,
                  hoverinfo: 'skip',
                  line: {
                    color: 'rgba(96,165,250,0.25)',
                    width: 8,
                    dash: 'longdash'
                  }
                },
                // Black-76 P/L Line
                {
                  x: payoffData.map(d => d.price),
                  y: payoffData.map(d => d.profitLossBlack76),
                  type: 'scatter',
                  mode: 'lines',
                  name: 'Black-76 Price',
                  line: {
                    color: '#60a5fa',
                    width: 3,
                    dash: 'longdash'
                  },
                  hovertemplate: '<b>Futures Price:</b> $%{x:,.0f}<br><b>Black-76 P/L:</b> $%{y:,.0f}<extra></extra>'
                },
                {
                  x: markerData.map(d => d.price),
                  y: markerData.map(d => d.profitLossBlack76),
                  type: 'scatter',
                  mode: 'markers',
                  showlegend: false,
                  hoverinfo: 'skip',
                  marker: {
                    symbol: 'diamond-open',
                    size: 7,
                    color: '#60a5fa',
                    line: {
                      color: '#60a5fa',
                      width: 1.5
                    }
                  }
                }
              ]}
              layout={{
                autosize: true,
                height: 500,
                paper_bgcolor: 'transparent',
                plot_bgcolor: 'transparent',
                font: {
                  color: '#a1a1aa',
                  size: 13
                },
                xaxis: {
                  range: chartRanges?.x,
                  title: {
                    text: 'Futures Price at Expiration ($)',
                    font: {
                      size: 14,
                      color: '#e4e4e7'
                    }
                  },
                  gridcolor: '#3f3f46',
                  tickformat: '$,.0f',
                  color: '#a1a1aa'
                },
                yaxis: {
                  range: chartRanges?.y,
                  title: {
                    text: 'Profit / Loss ($)',
                    font: {
                      size: 14,
                      color: '#e4e4e7'
                    },
                    standoff: 45
                  },
                  gridcolor: '#3f3f46',
                  tickformat: '$,.0f',
                  color: '#a1a1aa',
                  zeroline: true,
                  zerolinecolor: '#a1a1aa',
                  zerolinewidth: 2
                },
                shapes: [
                  // Strike Price Line
                  {
                    type: 'line',
                    x0: formData.K,
                    x1: formData.K,
                    y0: 0,
                    y1: 1,
                    yref: 'paper',
                    line: {
                      color: '#ef4444',
                      width: 4
                    }
                  },
                  // Break-even Line
                  getBreakEven() ? {
                    type: 'line',
                    x0: getBreakEven(),
                    x1: getBreakEven(),
                    y0: 0,
                    y1: 1,
                    yref: 'paper',
                    line: {
                      color: '#eab308',
                      width: 4
                    }
                  } : null
                ].filter(Boolean),
                annotations: [
                  // Strike Label
                  {
                    x: formData.K,
                    y: 1,
                    yref: 'paper',
                    text: `Strike: $${formData.K.toLocaleString()}`,
                    showarrow: false,
                    yanchor: 'bottom',
                    font: {
                      color: '#ef4444',
                      size: 14,
                      weight: 'bold'
                    },
                    bgcolor: 'rgba(0,0,0,0.7)',
                    borderpad: 4
                  },
                  // Break-even Label
                  getBreakEven() ? {
                    x: getBreakEven(),
                    y: 1,
                    yref: 'paper',
                    text: `Break-even: $${Math.round(getBreakEven()).toLocaleString()}`,
                    showarrow: false,
                    yanchor: 'bottom',
                    font: {
                      color: '#eab308',
                      size: 14,
                      weight: 'bold'
                    },
                    bgcolor: 'rgba(0,0,0,0.7)',
                    borderpad: 4
                  } : null
                ].filter(Boolean),
                legend: {
                  x: 0.5,
                  xanchor: 'center',
                  y: -0.15,
                  yanchor: 'top',
                  orientation: 'h',
                  bgcolor: 'transparent'
                },
                margin: {
                  l: 90,
                  r: 30,
                  t: 40,
                  b: 80
                },
                hovermode: 'x unified'
              }}
              config={{
                displayModeBar: true,
                displaylogo: false,
                modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d'],
                responsive: true
              }}
              style={{ width: '100%', height: '100%' }}
            />

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-lg border border-red-500/30">
                <div className="w-1 h-8 bg-red-500 rounded"></div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">Strike Price</p>
                  <p className="text-sm font-bold text-white">${formData.K.toLocaleString()}</p>
                </div>
              </div>
              
              {getBreakEven() && (
                <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-lg border border-yellow-500/30">
                  <div className="w-1 h-8 bg-yellow-500 rounded"></div>
                  <div>
                    <p className="text-xs font-medium text-zinc-400">Break-even</p>
                    <p className="text-sm font-bold text-white">${Math.round(getBreakEven()).toLocaleString()}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-lg border border-emerald-500/30">
                <div className="w-12 h-2 bg-emerald-500 rounded shadow-lg shadow-emerald-500/50"></div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">ML Model P/L</p>
                  <p className="text-sm font-bold text-emerald-400">Premium: ${prediction.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-zinc-950 rounded-lg border border-blue-500/30">
                <div className="w-12 h-2 rounded overflow-hidden bg-zinc-800 relative">
                  <div className="absolute inset-0" style={{ 
                    background: 'linear-gradient(90deg, #60a5fa 0px, #60a5fa 15px, transparent 15px, transparent 23px)',
                    backgroundSize: '23px 100%',
                    backgroundRepeat: 'repeat-x'
                  }}></div>
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-400">Black-76 P/L</p>
                  <p className="text-sm font-bold text-blue-400">Premium: ${black76Price.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-zinc-950 to-zinc-900 rounded-lg border border-zinc-700">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-2">📊 Chart Guide</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                The <span className="text-red-500 font-bold">red vertical line</span> marks the strike price. 
                The <span className="text-yellow-500 font-bold">yellow line</span> shows where you break even. 
                The solid <span className="text-emerald-400 font-bold">green line</span> shows your profit/loss with the ML model's price,
                and the dashed <span className="text-blue-400 font-bold">blue line</span> shows Black-76 pricing.
              </p>
              <p className="text-xs text-zinc-500 mt-2">Use <span className="text-green-400 font-semibold">Focused</span> to compare ML vs Black-76 clearly, and <span className="text-zinc-300 font-semibold">Wide</span> to view a broader payoff shape.</p>
            </div>
          </div>
          ) : (
            <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 flex-1 flex flex-col items-center justify-center">
              <svg className="w-20 h-20 text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-zinc-500 text-center text-lg font-medium">Calculate an option price to see the payoff diagram</p>
              <p className="text-zinc-600 text-center text-sm mt-2">Enter values and click "Calculate Fair Price"</p>
            </div>
          )}
        </div>
      </div>

      {/* First-Visit Tutorial */}
      {showTutorial && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[3500] p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-xl w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-2xl font-bold text-white">Quick Tutorial</h2>
                {/* Adding "X" to close the tutorial box */}
                <div className='flex items-center gap-3'>
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Step {tutorialStep} of 3</p>
                  <button type='button' onClick={closeTutorial} className='text-zinc-400 hover:text-white transition-colors' title='Close Tutorial'> 
                    <svg className='w-6 h-6' fill="none" stroke = "currentColor" viewBox='0 0 24 24'>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>

                    </svg>
                  </button>
                  

                </div>
              </div>

              {tutorialStep === 1 ? (
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">1. Fill in the form values</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Input your values into the form, choose Call or Put, then click <span className="font-semibold text-white">Calculate Fair Price</span>. This gives you the payoff diagram and an explanation so you can understand profit/loss at expiration.
                  </p>
                </div>
              ) : tutorialStep === 2 ? (
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">2. Click i for more information</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Click the <span className="font-semibold text-white">i</span> button in the payoff section to open the detailed explanation of the diagram, break-even line, and how to compare ML vs Black-76.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">3. Use the graph to explore outcomes</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Use the payoff graph to compare profit/loss across future prices. Switch between <span className="font-semibold text-white">Focused</span> and <span className="font-semibold text-white">Wide</span>, hover points for exact values, and use the strike and break-even lines to understand risk.
                  </p>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setTutorialStep((prev) => Math.max(1, prev - 1))}
                  disabled={tutorialStep === 1}
                  className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Back
                </button>

                {tutorialStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setTutorialStep((prev) => Math.min(3, prev + 1))}
                    className="px-5 py-2 rounded-lg bg-green-500 text-zinc-950 font-bold hover:bg-green-400 transition-all"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={closeTutorial}
                    className="px-5 py-2 rounded-lg bg-green-500 text-zinc-950 font-bold hover:bg-green-400 transition-all"
                  >
                    Ok got it
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Info Modal */}
      {showRateInfoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[3000] p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-lg w-full">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-white">Risk-Free Rate</h2>
                <button 
                  onClick={() => setShowRateInfoModal(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 text-zinc-300">
                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-2">Fixed at 4.5%</h3>
                  <p>The risk-free interest rate is fixed at 4.5% for all calculations in this pricing model.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-2">Why Fixed?</h3>
                  <p className="mb-2">The machine learning model was trained on historical data where all examples used a constant risk-free rate of 4.5%. To ensure accurate predictions, we use the same rate that the model learned from.</p>
                  <p>Both the <strong>ML Model</strong> and <strong>Black-76 Formula</strong> use this fixed rate for consistency.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-green-400 mb-2">What is the Risk-Free Rate?</h3>
                  <p>The risk-free rate represents the return on a "safe" investment like Treasury bills. It's used to discount future cash flows to present value in option pricing formulas.</p>
                </div>
              </div>

              <button
                onClick={() => setShowRateInfoModal(false)}
                className="mt-6 w-full bg-green-500 text-zinc-950 font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-all duration-200"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payoff Diagram Info Modal */}
      {showInfoModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[3000] p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-white">Understanding the Payoff Diagram</h2>
                  <button 
                    onClick={() => setShowInfoModal(false)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4 text-zinc-300">
                  <div>
                    <h3 className="text-lg font-semibold text-green-400 mb-2">What is a Payoff Diagram?</h3>
                    <p>A payoff diagram shows the profit or loss of an option position at expiration, across different possible prices of the underlying futures contract. It helps you visualize the risk and reward of the option.</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-green-400 mb-2">How to Read This Chart</h3>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong>X-axis (Horizontal):</strong> Shows different possible prices of the underlying futures contract at expiration</li>
                      <li><strong>Y-axis (Vertical):</strong> Shows your profit (above $0) or loss (below $0)</li>
                      <li><strong>Strike Price (Red line):</strong> The price at which you have the right to buy/sell. For calls, profit starts here.</li>
                      <li><strong>Break-even Point (Yellow line):</strong> The price where you neither profit nor lose. This is Strike ± Premium.</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Comparing ML vs Black-76</h3>
                    <p className="mb-2">The two lines show how your profit/loss differs depending on which price you paid:</p>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li><strong className="text-green-400">Green solid line:</strong> If you paid the ML model's predicted price</li>
                      <li><strong className="text-blue-400">Blue dashed line:</strong> If you paid the Black-76 theoretical price</li>
                    </ul>
                    <p className="mt-2">The lower your entry price (premium paid), the higher your profit curve sits on the chart. This is why accurate pricing matters!</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-green-400 mb-2">Key Takeaways</h3>
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      <li>The maximum loss is limited to the premium you pay (the price shown above)</li>
                      <li>For calls, profit is unlimited as price rises; for puts, profit is capped at the strike price</li>
                      <li>You need the underlying price to move beyond the break-even point to make a profit</li>
                      <li>A more accurate price prediction (lower if you're buying) means better profit potential</li>
                    </ul>
                  </div>
                </div>

                <button
                  onClick={() => setShowInfoModal(false)}
                  className="mt-6 w-full bg-green-500 text-zinc-950 font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-all duration-200"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
