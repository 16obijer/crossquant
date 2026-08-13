import { useEffect, useRef, useState } from 'react';

function SentimentPieChart({ positive, negative, neutral }) {
  const [animated, setAnimated] = useState(false);
  const [hovered, setHovered] = useState(null);

  setTimeout(() => {
    if (!animated) setAnimated(true);
  }, 60);

  const data = [
    { value: positive, color: '#4ade80', glow: 'rgba(74,222,128,0.55)',  label: 'Positive' },
    { value: negative, color: '#f87171', glow: 'rgba(248,113,113,0.55)', label: 'Negative' },
    { value: neutral,  color: '#a1a1aa', glow: 'rgba(161,161,170,0.4)',  label: 'Neutral'  },
  ];

  const total = positive + negative + neutral;
  const cx = 100, cy = 100, r = 72;
  const circumference = 2 * Math.PI * r;

  let cumulativeStart = 0;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const dash = pct * circumference;
    const gap = circumference - dash;
    const offset = -cumulativeStart * circumference;
    cumulativeStart += pct;
    return { ...d, dash, gap, offset, delay: i * 0.12 };
  });

  const dominant = data.reduce((a, b) => (a.value > b.value ? a : b));
  const strokeBase = 20;
  const strokeHover = 26;

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      <div className="relative" style={{ width: 220, height: 220 }}>
        <svg viewBox="0 0 200 200" width="220" height="220" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#27272a" strokeWidth={strokeBase} />
          {slices.map((s) => {
            const isHov = hovered === s.label;
            return (
              <circle
                key={s.label}
                cx={cx} cy={cy} r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={isHov ? strokeHover : strokeBase}
                strokeLinecap="round"
                strokeDasharray={animated ? `${s.dash} ${s.gap}` : `0 ${circumference}`}
                strokeDashoffset={s.offset}
                onMouseEnter={() => setHovered(s.label)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  transition: `stroke-dasharray ${0.65 + s.delay}s cubic-bezier(0.34,1.56,0.64,1) ${s.delay}s, stroke-width 0.2s ease, filter 0.2s ease`,
                  filter: isHov ? `drop-shadow(0 0 7px ${s.glow})` : 'none',
                  cursor: 'pointer',
                }}
              />
            );
          })}
        </svg>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ opacity: animated ? 1 : 0, transition: 'opacity 0.4s ease 0.5s' }}
        >
          <span className="text-3xl font-extrabold tabular-nums" style={{ color: dominant.color }}>
            {dominant.value}%
          </span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 mt-0.5">
            {dominant.label}
          </span>
        </div>
      </div>
      <div className="flex gap-6">
        {data.map((d) => {
          const isHov = hovered === d.label;
          return (
            <div
              key={d.label}
              className="flex flex-col items-center gap-1 cursor-pointer"
              onMouseEnter={() => setHovered(d.label)}
              onMouseLeave={() => setHovered(null)}
              style={{ transition: 'transform 0.15s ease', transform: isHov ? 'translateY(-2px)' : 'none' }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: d.color,
                    boxShadow: isHov ? `0 0 8px ${d.glow}` : 'none',
                    transition: 'box-shadow 0.2s',
                  }}
                />
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">{d.label}</span>
              </div>
              <span
                className="text-xl font-bold tabular-nums"
                style={{ color: d.color, transition: 'opacity 0.2s', opacity: isHov ? 1 : 0.85 }}
              >
                {d.value}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SentimentAnalysis() {
  const [ticker, setTicker] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Queued');
  const [errorMessage, setErrorMessage] = useState('');
  const [housingKeyword, setHousingKeyword] = useState('');
  const [housingResults, setHousingResults] = useState(null);
  const [housingLoading, setHousingLoading] = useState(false);
  const [housingLoadingProgress, setHousingLoadingProgress] = useState(0);
  const [housingLoadingMessage, setHousingLoadingMessage] = useState('Queued');
  const [housingErrorMessage, setHousingErrorMessage] = useState('');
  const pollerRef = useRef(null);
  const pollingInFlightRef = useRef(false);
  const housingPollerRef = useRef(null);
  const housingPollingInFlightRef = useRef(false);

  const sentimentStyles = {
    positive: {
      dot: 'bg-green-500',
      baseBorder: 'border-green-500/35',
      itemHoverBorder: 'hover:border-green-500/50',
      itemHoverText: 'group-hover/item:text-green-400',
      itemHoverTitle: 'group-hover/item:text-green-300',
    },
    negative: {
      dot: 'bg-red-500',
      baseBorder: 'border-red-500/35',
      itemHoverBorder: 'hover:border-red-500/50',
      itemHoverText: 'group-hover/item:text-red-400',
      itemHoverTitle: 'group-hover/item:text-red-300',
    },
    neutral: {
      dot: 'bg-zinc-400',
      baseBorder: 'border-zinc-400/35',
      itemHoverBorder: 'hover:border-zinc-400/50',
      itemHoverText: 'group-hover/item:text-zinc-300',
      itemHoverTitle: 'group-hover/item:text-zinc-200',
    },
  };

  const stopPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    pollingInFlightRef.current = false;
  };

  const stopHousingPolling = () => {
    if (housingPollerRef.current) {
      clearInterval(housingPollerRef.current);
      housingPollerRef.current = null;
    }
    housingPollingInFlightRef.current = false;
  };

  useEffect(() => {
    return () => {
      stopPolling();
      stopHousingPolling();
    };
  }, []);

  const handleSearch = async () => {
    if (!ticker.trim()) return;

    stopPolling();
    setErrorMessage('');
    setResults(null);
    setLoading(true);
    setLoadingProgress(0);
    setLoadingMessage('Queued');

    try {
      const startRes = await fetch(`http://127.0.0.1:8000/api/sentiment/sentiment/start/?stock=${ticker}`);
      const startData = await startRes.json();

      if (!startRes.ok || !startData.job_id) {
        throw new Error(startData.error || 'Unable to start sentiment analysis job.');
      }

      setLoadingProgress(startData.progress ?? 0);
      setLoadingMessage(startData.stage || 'Queued');

      const jobId = startData.job_id;

      pollerRef.current = setInterval(async () => {
        if (pollingInFlightRef.current) return;
        pollingInFlightRef.current = true;

        try {
          const statusRes = await fetch(`http://127.0.0.1:8000/api/sentiment/sentiment/status/${jobId}/`);
          const statusData = await statusRes.json();

          if (!statusRes.ok) {
            throw new Error(statusData.error || 'Failed to read sentiment job status.');
          }

          setLoadingProgress(statusData.progress ?? 0);
          setLoadingMessage(statusData.stage || 'Running');

          if (statusData.status === 'done') {
            setLoadingProgress(100);
            setLoadingMessage('Completed');
            setResults(statusData.result || null);
            setLoading(false);
            stopPolling();
          } else if (statusData.status === 'failed') {
            setErrorMessage(statusData.error || 'Sentiment analysis failed.');
            setLoading(false);
            stopPolling();
          }
        } catch (error) {
          setErrorMessage(error.message || 'Could not update sentiment progress.');
          setLoading(false);
          stopPolling();
        } finally {
          pollingInFlightRef.current = false;
        }
      }, 700);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to start sentiment analysis.');
      setLoading(false);
    }
  };

  const handleHousingSearch = async () => {
    if (!housingKeyword.trim()) return;

    stopHousingPolling();
    setHousingErrorMessage('');
    setHousingResults(null);
    setHousingLoading(true);
    setHousingLoadingProgress(0);
    setHousingLoadingMessage('Queued');

    try {
      const startRes = await fetch(`http://127.0.0.1:8000/api/sentiment/property/start/?keyword=${encodeURIComponent(housingKeyword)}`);
      const startData = await startRes.json();

      if (!startRes.ok || !startData.job_id) {
        throw new Error(startData.error || 'Unable to start sentiment analysis job.');
      }

      setHousingLoadingProgress(startData.progress ?? 0);
      setHousingLoadingMessage(startData.stage || 'Queued');

      const jobId = startData.job_id;

      housingPollerRef.current = setInterval(async () => {
        if (housingPollingInFlightRef.current) return;
        housingPollingInFlightRef.current = true;

        try {
          const statusRes = await fetch(`http://127.0.0.1:8000/api/sentiment/property/status/${jobId}/`);
          const statusData = await statusRes.json();

          if (!statusRes.ok) {
            throw new Error(statusData.error || 'Failed to read sentiment job status.');
          }

          setHousingLoadingProgress(statusData.progress ?? 0);
          setHousingLoadingMessage(statusData.stage || 'Running');

          if (statusData.status === 'done') {
            setHousingLoadingProgress(100);
            setHousingLoadingMessage('Completed');
            setHousingResults(statusData.result || null);
            setHousingLoading(false);
            stopHousingPolling();
          } else if (statusData.status === 'failed') {
            setHousingErrorMessage(statusData.error || 'Sentiment analysis failed.');
            setHousingLoading(false);
            stopHousingPolling();
          }
        } catch (error) {
          setHousingErrorMessage(error.message || 'Could not update sentiment progress.');
          setHousingLoading(false);
          stopHousingPolling();
        } finally {
          housingPollingInFlightRef.current = false;
        }
      }, 700);
    } catch (err) {
      setHousingErrorMessage(err.message || 'Unable to start sentiment analysis.');
      setHousingLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleHousingKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleHousingSearch();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-4xl font-bold text-white mb-2">Sentiment <span className="text-green-400">Analysis</span></h1>
      <p className="text-zinc-400 mb-6">Enter a keyword to analyse market sentiment.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 mb-8 min-h-[230px]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label className="block text-xs font-bold text-green-400 uppercase tracking-wide">Stock Ticker</label>
                  <input
                    type="text"
                    placeholder="e.g. AAPL"
                    value={ticker}
                    onChange={(e) => {
                      setTicker(e.target.value.toUpperCase());
                      setResults(null);
                    }}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    className="text-white border border-zinc-700 rounded p-3 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200 w-56 bg-zinc-950 placeholder-zinc-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-green-500 text-zinc-950 font-semibold py-3 px-6 rounded-lg hover:bg-green-400 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Search'}
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-green-400 uppercase tracking-wide mb-2">Examples</p>
                <div className="flex flex-wrap gap-3">
                  {['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setTicker(example);
                        setResults(null);
                      }}
                      disabled={loading}
                      className={`text-sm border px-3 py-1 rounded transition-all duration-200 ${
                        loading
                          ? 'border-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-green-500/50 hover:bg-zinc-800'
                      }`}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading && (
              <div className="mt-5 pt-5 border-t border-zinc-800/70">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400">{loadingMessage}</p>
                  <span className="text-xs font-bold text-green-400 tabular-nums">{loadingProgress}%</span>
                </div>
                <div
                  className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden"
                  role="progressbar"
                  aria-label="Sentiment analysis progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={loadingProgress}
                >
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-300">{errorMessage}</p>
              </div>
            )}
          </div>

          {results && (
            <div key={ticker} style={{ animation: 'fadeSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) both' }}>
              <style>{`
                @keyframes fadeSlideUp {
                  from { opacity: 0; transform: translateY(18px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 text-white">Sentiment Results for <span className="text-green-400">{ticker}</span></h2>
                <div className="flex justify-center">
                  <SentimentPieChart positive={results.positive} negative={results.negative} neutral={results.neutral} />
                </div>

                <div className="mt-10 border-t border-zinc-800 pt-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-green-400 mb-6">Sources Used By Sentiment</h3>
                  <div className="grid grid-cols-1 gap-6">
                    {['positive', 'negative', 'neutral'].map((sentimentVar) => {
                      const sources = results.sources?.[sentimentVar] || [];
                      const style = sentimentStyles[sentimentVar];
                      return (
                        <div
                          key={sentimentVar}
                          className={`rounded-2xl border bg-zinc-950/70 p-5 flex flex-col h-[340px] ${style.baseBorder}`}
                        >
                          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${style.dot}`} style={{ animationDuration: '3s' }} />
                              <h4 className="text-xs uppercase tracking-widest font-bold text-white">{sentimentVar} Sources</h4>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">{sources.length} Articles</span>
                          </div>
                          
                          {sources.length > 0 ? (
                            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
                              {sources.map((item, index) => (
                                <a
                                  key={`${sentimentVar}-${item.link}-${index}`}
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`block p-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/50 group/item transition-colors duration-200 ${style.itemHoverBorder}`}
                                  title={item.title}
                                >
                                  <div className={`flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-zinc-500 transition-colors ${style.itemHoverText}`}>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                    <span className="truncate">{item.source || 'Unknown source'}</span>
                                  </div>
                                  <p className={`text-sm text-zinc-300 leading-snug line-clamp-2 transition-colors ${style.itemHoverTitle}`}>
                                    {item.title}
                                  </p>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/60 rounded-xl bg-zinc-900/20">
                              <p className="text-xs text-zinc-500 font-medium">No articles found</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800 mb-8 min-h-[230px]">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div className="flex flex-col gap-1">
                  <label className="block text-xs font-bold text-green-400 uppercase tracking-wide">Housing Keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. Canterbury"
                    value={housingKeyword}
                    onChange={(e) => {
                      setHousingKeyword(e.target.value);
                      setHousingResults(null);
                    }}
                    onKeyPress={handleHousingKeyPress}
                    disabled={housingLoading}
                    className="text-white border border-zinc-700 rounded p-3 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-200 w-56 bg-zinc-950 placeholder-zinc-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleHousingSearch}
                  disabled={housingLoading}
                  className="bg-green-500 text-zinc-950 font-semibold py-3 px-6 rounded-lg hover:bg-green-400 transition-all duration-200 disabled:opacity-50"
                >
                  {housingLoading ? 'Loading...' : 'Search'}
                </button>
              </div>

              <div>
                <p className="text-xs font-bold text-green-400 uppercase tracking-wide mb-2">Examples</p>
                <div className="flex flex-wrap gap-3">
                  {['Canterbury', 'Faversham', 'Sandwich', 'Bromley'].map((example) => (
                    <button
                      key={example}
                      onClick={() => {
                        setHousingKeyword(example);
                        setHousingResults(null);
                      }}
                      disabled={housingLoading}
                      className={`text-sm border px-3 py-1 rounded transition-all duration-200 ${
                        housingLoading
                          ? 'border-zinc-800 text-zinc-500 cursor-not-allowed'
                          : 'border-zinc-700 text-zinc-400 hover:text-white hover:border-green-500/50 hover:bg-zinc-800'
                      }`}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {housingLoading && (
              <div className="mt-5 pt-5 border-t border-zinc-800/70">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400">{housingLoadingMessage}</p>
                  <span className="text-xs font-bold text-green-400 tabular-nums">{housingLoadingProgress}%</span>
                </div>
                <div
                  className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden"
                  role="progressbar"
                  aria-label="Sentiment analysis progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={housingLoadingProgress}
                >
                  <div
                    className="h-full bg-gradient-to-r from-green-500 via-emerald-400 to-green-300 transition-all duration-300 ease-out"
                    style={{ width: `${housingLoadingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {housingErrorMessage && (
              <div className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-300">{housingErrorMessage}</p>
              </div>
            )}
          </div>

          {housingResults && (
            <div key={housingKeyword} style={{ animation: 'fadeSlideUp 0.45s cubic-bezier(0.22,1,0.36,1) both' }}>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 mb-8 backdrop-blur-sm">
                <h2 className="text-2xl font-bold mb-6 text-white">Sentiment Results for <span className="text-green-400">{housingKeyword}</span></h2>
                <div className="flex justify-center">
                  <SentimentPieChart positive={housingResults.positive} negative={housingResults.negative} neutral={housingResults.neutral} />
                </div>

                <div className="mt-10 border-t border-zinc-800 pt-8">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-green-400 mb-6">Sources Used By Sentiment</h3>
                  <div className="grid grid-cols-1 gap-6">
                    {['positive', 'negative', 'neutral'].map((sentimentVar) => {
                      const sources = housingResults.sources?.[sentimentVar] || [];
                      const style = sentimentStyles[sentimentVar];
                      return (
                        <div
                          key={`housing-${sentimentVar}`}
                          className={`rounded-2xl border bg-zinc-950/70 p-5 flex flex-col h-[340px] ${style.baseBorder}`}
                        >
                          <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${style.dot}`} style={{ animationDuration: '3s' }} />
                              <h4 className="text-xs uppercase tracking-widest font-bold text-white">{sentimentVar} Sources</h4>
                            </div>
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400">{sources.length} Articles</span>
                          </div>
                          
                          {sources.length > 0 ? (
                            <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 custom-scrollbar">
                              {sources.map((item, index) => (
                                <a
                                  key={`housing-${sentimentVar}-${item.link}-${index}`}
                                  href={item.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`block p-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/50 group/item transition-colors duration-200 ${style.itemHoverBorder}`}
                                  title={item.title}
                                >
                                  <div className={`flex items-center gap-2 mb-2 text-[10px] uppercase font-bold text-zinc-500 transition-colors ${style.itemHoverText}`}>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                                    <span className="truncate">{item.source || 'Unknown source'}</span>
                                  </div>
                                  <p className={`text-sm text-zinc-300 leading-snug line-clamp-2 transition-colors ${style.itemHoverTitle}`}>
                                    {item.title}
                                  </p>
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800/60 rounded-xl bg-zinc-900/20">
                              <p className="text-xs text-zinc-500 font-medium">No articles found</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

