import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Plot from 'react-plotly.js';

const Portfolio = () => {
  const { user, token, logout } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState(null);

  const[properties,setProperties] = useState([]);
  const [activeHoldingType, setActiveHoldingType] = useState('stocks');

  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [showAddPropertyForm, setShowAddPropertyForm] = useState(false);

  const [newStock, setNewStock] = useState({
    symbol: '',
    shares: '',
    purchase_date: ''
  });
  
  const [newProperty, setNewProperty] = useState({
    property_type: '',
    address: '',
    purchase_price: '',
    ownership_percentage: '100',
    monthly_rent: ''

  });


  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [symbolSuggestions, setSymbolSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingSymbol, setSearchingSymbol] = useState(false);
  const [addingStock, setAddingStock] = useState(false);

  const [addingProperty, setAddingProperty] = useState(false);

  const [selectedStock, setSelectedStock] = useState(null);
  const [stockHistory, setStockHistory] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [exchangeRates, setExchangeRates] = useState(null);
  const leftColumnRef = useRef(null);
  const [leftHeight, setLeftHeight] = useState(0);

  const formatPriceUSD = (price) => {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return '$0.00';
    return '$' + numericPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatNumber = (value) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return '0.00';
    return numericValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Convert country name to country code for flag
const getCountryFlag = (country) => {
  if (!country) return '';
  
  const emojis = {
    'United States': '🇺🇸',
    'United Kingdom': '🇬🇧',
    'Germany': '🇩🇪',
    'Japan': '🇯🇵',
    'France': '🇫🇷',
    'Mexico': '🇲🇽',
    'China': '🇨🇳',
    'India': '🇮🇳',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Switzerland': '🇨🇭',
    'Brazil': '🇧🇷',
    'South Korea': '🇰🇷',
    'Singapore': '🇸🇬',
    'Hong Kong': '🇭🇰',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Netherlands': '🇳🇱',
    'Sweden': '🇸🇪',
    'Denmark': '🇩🇰',
    'Norway': '🇳🇴',
    'Ireland': '🇮🇪',
    'Portugal': '🇵🇹',
    'Poland': '🇵🇱',
    'Turkey': '🇹🇷',
    'Russia': '🇷🇺',
    'South Africa': '🇿🇦',
    'Israel': '🇮🇱',
    'Indonesia': '🇮🇩',
    'Malaysia': '🇲🇾',
    'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳',
    'Philippines': '🇵🇭',
    'New Zealand': '🇳🇿',
    'Argentina': '🇦🇷',
    'Chile': '🇨🇱',
    'Colombia': '🇨🇴',
    'Peru': '🇵🇪',
    'Egypt': '🇪🇬',
    'Nigeria': '🇳🇬',
    'Kenya': '🇰🇪',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩',
    'Sri Lanka': '🇱🇰',
    'UAE': '🇦🇪',
    'Saudi Arabia': '🇸🇦',
    'Taiwan': '🇹🇼',
    'Kuwait': '🇰🇼',
    'Qatar': '🇶🇦',
  };
  
  if (emojis[country]) {
    return emojis[country];
  }
  
  // For countries without emoji, return the code in brackets
  const codes = {
    'United States': 'US',
    'United Kingdom': 'UK',
    'Germany': 'DE',
    'Japan': 'JP',
    'France': 'FR',
    'Mexico': 'MX',
    'China': 'CN',
    'India': 'IN',
    'Canada': 'CA',
    'Australia': 'AU',
    'Switzerland': 'CH',
    'Brazil': 'BR',
    'South Korea': 'KR',
    'Singapore': 'SG',
    'Hong Kong': 'HK',
    'Spain': 'ES',
    'Italy': 'IT',
    'Netherlands': 'NL',
    'Sweden': 'SE',
    'Denmark': 'DK',
    'Norway': 'NO',
    'Ireland': 'IE',
    'Portugal': 'PT',
    'Poland': 'PL',
    'Turkey': 'TR',
    'Russia': 'RU',
    'South Africa': 'ZA',
    'Israel': 'IL',
    'Indonesia': 'ID',
    'Malaysia': 'MY',
    'Thailand': 'TH',
    'Vietnam': 'VN',
    'Philippines': 'PH',
    'New Zealand': 'NZ',
    'Argentina': 'AR',
    'Chile': 'CL',
    'Colombia': 'CO',
    'Peru': 'PE',
    'Egypt': 'EG',
    'Nigeria': 'NG',
    'Kenya': 'KE',
    'Pakistan': 'PK',
    'Bangladesh': 'BD',
    'Sri Lanka': 'LK',
    'UAE': 'AE',
    'Saudi Arabia': 'SA',
    'Taiwan': 'TW',
    'Kuwait': 'KW',
    'Qatar': 'QA',
  };
  
  const code = codes[country] || country.slice(0, 2).toUpperCase();
  return `[${code}]`;
};


  const getPropertyPostcodeData = ()=>{
    const totals = {};
    properties.forEach((property)=>{
      const postcodeArea = property.address || 'Other';
      const value = parseFloat(property.purchase_price) || 0;
      totals[postcodeArea] = (totals[postcodeArea] || 0) +value;
    });
    return Object.entries(totals).map(([postcodeArea,value])=>({
      postcodeArea,
      value
    }));
  };

  useEffect(() => {
    const el = leftColumnRef.current;
    if (!el) return;
    const measure = () => setLeftHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [stocks, properties, summary, activeHoldingType]);

  const API_URL = 'http://127.0.0.1:8000';
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const fetchExchangeRates = async () => {
    try {
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
      if (response.data && response.data.rates) {
        setExchangeRates(response.data.rates);
      }
    } catch (err) {
      console.error('Error fetching exchange rates:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchPortfolio();
      fetchExchangeRates();
    } else {
      setLoading(false);
      setError('No authentication token found. Please log in again.');
    }
  }, [token]);

  const fetchPortfolio = async (showLoader = true) => {
    const config = {
      headers: { 
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    };
    try {
      if (showLoader) {
        setLoading(true);
      }
      
      const [stocksResponse, summaryResponse,propertiesResponse] = await Promise.all([
        axios.get(`${API_URL}/api/portfolio/stocks/`, config),
        axios.get(`${API_URL}/api/portfolio/summary/?base_currency=USD`, config),
        axios.get(`${API_URL}/api/portfolio/properties/`,config)
      ]);
      setStocks(stocksResponse.data);
      setSummary(summaryResponse.data);
      setProperties(propertiesResponse.data)
      setError('');

    } catch (err) {
      console.error('Error fetching portfolio:', err);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        logout();
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this portfolio.');
      } else if (err.response?.status === 404) {
        setError('Portfolio API endpoint not found. Check Django URLs.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Make sure Django is running on port 8000.');
      } else {
        setError(`Failed to load portfolio: ${err.response?.data?.detail || err.message}`);
      }
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
    setNewsLoading(true);
    axios.get(`${API_URL}/api/portfolio/news/`, config)
      .then(r => setNews(r.data))
      .catch(() => {})
      .finally(() => setNewsLoading(false));
    
    setError('');
  };

  const searchSymbols = async (query) => {
    if (!query || query.length < 1) {
      setSymbolSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setSearchingSymbol(true);
      const response = await axios.get(`${API_URL}/api/portfolio/search/`, {
        params: { q: query },
        headers: { 'Authorization': `Token ${token}` }
      });
      setSymbolSuggestions(response.data);
      setShowSuggestions(response.data.length > 0);
    } catch (err) {
      console.error('Error searching symbols:', err);
      setSymbolSuggestions([]);
    } finally {
      setSearchingSymbol(false);
    }
  };

  const handleSymbolChange = (value) => {
    setNewStock({ ...newStock, symbol: value });
    setFormError('');
    
    const timeoutId = setTimeout(() => {
      searchSymbols(value);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  };

  const selectSymbol = (symbol, name) => {
    setNewStock({ ...newStock, symbol: symbol });
    setShowSuggestions(false);
    setSymbolSuggestions([]);
    setFormError('');
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (addingStock) return;
    setAddingStock(true);
    
    try {
      const payload = {
        symbol: newStock.symbol.toUpperCase(),
        shares: parseFloat(newStock.shares),
        purchase_date: newStock.purchase_date
      };
      
      await axios.post(`${API_URL}/api/portfolio/stocks/`, payload, {
        headers: { 
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setShowAddForm(false);
      setNewStock({ symbol: '', shares: '', purchase_date: '' });
      setFormError('');
      setSymbolSuggestions([]);
      setShowSuggestions(false);
      fetchPortfolio();
      setError('');
    } catch (err) {
      console.error('Error adding stock:', err);
      
      if (err.response?.status === 401) {
        setFormError('Authentication failed. Please log in again.');
      } else if (err.response?.data?.error) {
        setFormError(err.response.data.error);
      } else {
        setFormError('Failed to add stock. Please check the symbol and try again.');
      }
    } finally {
      setAddingStock(false);
    }
  };

  const handleDeleteStock = async (id) => {
    if (window.confirm('Are you sure you want to remove this stock?')) {
      try {
        await axios.delete(`${API_URL}/api/portfolio/stocks/${id}/`, {
          headers: { 
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (selectedStock?.id === id) {
          setShowHistoryModal(false);
          setSelectedStock(null);
          setStockHistory(null);
        }
        fetchPortfolio(false);
      } catch (err) {
        console.error('Error deleting stock:', err);
        setError('Failed to delete stock');
      }
    }
  };
  const handleAddProperty = async (e) => {
  e.preventDefault();
  setFormError('');

  if (addingProperty) return;
  setAddingProperty(true);

  try {
    const payload = {
      property_type: newProperty.property_type,
      address: newProperty.address,
      purchase_price: parseFloat(newProperty.purchase_price),
      ownership_percentage: parseFloat(newProperty.ownership_percentage),
      monthly_rent: newProperty.monthly_rent ? parseFloat(newProperty.monthly_rent) : null
    };

    await axios.post(`${API_URL}/api/portfolio/properties/`, payload, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });

    setShowAddPropertyForm(false);
    setNewProperty({
      property_type: '',
      address: '',
      purchase_price: '',
      ownership_percentage: '100',
      monthly_rent: ''
    });
    setFormError('');
    fetchPortfolio(false);
  } catch (err) {
    console.error('Error adding property:', err);
    setFormError(err.response?.data?.detail || 'Failed to add property.');
  } finally {
    setAddingProperty(false);
  }
};

  const handleDeleteProperty = async (id) => {
    if (window.confirm('Are you sure you want to remove this property?')) {
      try {
        await axios.delete(`${API_URL}/api/portfolio/properties/${id}/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
          }
        });
        fetchPortfolio(false);
      } catch (err) {
        console.error('Error deleting property:', err);
        setError('Failed to delete property');
      }
    }
  };

  const handleStockClick = async (stock) => {
    if (!stock.purchase_date) return;
    setSelectedStock(stock);
    setShowHistoryModal(true);
    setStockHistory(null);
    setHistoryLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/portfolio/stocks/${stock.id}/history/`, {
        headers: { 'Authorization': `Token ${token}` }
      });
      setStockHistory(response.data);
    } catch (err) {
      console.error('Error fetching history:', err);
      setStockHistory({ error: err.response?.data?.error || 'Failed to load history' });
    } finally {
      setHistoryLoading(false);
    }
  };
  const propertyPostcodeData = getPropertyPostcodeData();
  //Get number of property 
  const propertyCount = properties.length;
  //get total investment
  const propertyTotalPurchasePrice = properties.reduce((total, property) => {
    return total + (parseFloat(property.purchase_price) || 0); 
  }, 0);
  //Get total income
  const propertyTotalAnnualRent = properties.reduce((total, property) => {
    return total + ((parseFloat(property.monthly_rent) || 0) * 52);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-green-400">Loading portfolio...</div>
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">

          <div>
            <h1 className="text-3xl font-bold text-white">
            Portfolio <span className="text-green-400">Tracker</span>
            </h1>
            <div className='inline-flex w-fit bg-zinc-800 rounded-lg mt-3'>
              <button
                onClick={()=>setActiveHoldingType('stocks')}
                className={` w-24 px-3 py-2 box-border rounded-md transition ${
                  activeHoldingType === 'stocks'
                  ? 'bg-green-500 text-white'
                  : 'text-zinc-400 hover:text-white'
                }`}
              >
                Stocks
              </button>

              <button
                onClick={()=>setActiveHoldingType('properties')}
                className={`w-24 px-3 py-2 box-border rounded-md transition ${
                  activeHoldingType === 'properties'
                  ? 'bg-green-500 text-white'
                  : 'text-zinc-400 hover:text-white'
                }`}
              
              >
                Property
              </button>
            </div>
          </div>
          <div className='flex gap-3'>
            {activeHoldingType === 'stocks' ? (
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setFormError('');
                  setSymbolSuggestions([]);
                  setShowSuggestions(false);
                }}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
              >
                + Add Stock
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowAddPropertyForm(true);
                  setFormError('');
                }}
                className='px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition'
              >
                + Add Property
              </button>
            )}
          </div>
          
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {activeHoldingType === 'stocks' && summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <p className="text-zinc-400 text-sm">Total Value</p>
              <p className="text-2xl font-bold text-white">
                ${formatNumber(summary.total_value)}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <p className="text-zinc-400 text-sm">Total Gain/Loss</p>
              <p className={`text-2xl font-bold ${summary.total_gain_loss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${formatNumber(Math.abs(summary.total_gain_loss))}
                <span className="text-sm ml-2">
                  ({summary.total_gain_loss_percentage?.toFixed(2)}%)
                </span>
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <p className="text-zinc-400 text-sm">Total Cost</p>
              <p className="text-2xl font-bold text-white">
                ${formatNumber(summary.total_cost)}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <p className="text-zinc-400 text-sm">Stocks Held</p>
              <p className="text-2xl font-bold text-white">
                {summary.stocks_count || 0}
              </p>
            </div>
          </div>
        )}


        {activeHoldingType === 'properties' && (
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
            <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-6'>
              <p className='text-zinc-400 text-sm'> Total Investment</p>
              <p className='text-2xl font-bold text-white'> £{formatNumber(propertyTotalPurchasePrice)}</p>
            </div>
            <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-6'>
              <p className='text-zinc-400 text-sm'> Total Income</p>
              <p className='text-2xl font-bold text-white'> £{formatNumber(propertyTotalAnnualRent)}</p>
            </div>
            <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-6'>
              <p className='text-zinc-400 text-sm'> Properties Held</p>
              <p className='text-2xl font-bold text-white'> {propertyCount}</p>
            </div>

          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
        <div ref={leftColumnRef} className="space-y-6">

        {activeHoldingType === 'stocks' && summary && summary.stocks_count > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Geographic Breakdown</h3>
              <Plot
                data={[{
                  type: 'pie',
                  labels: summary.geographic_breakdown.map(d => d.region),
                  values: summary.geographic_breakdown.map(d => d.value),
                  marker: { colors: COLORS },
                  textinfo: 'percent',
                  textposition: 'inside',
                  textfont: { color: '#fff', size: 12 },
                  hovertemplate: '<b>%{label}</b><br>$%{value:,.2f}<br>%{percent}<extra></extra>',
                  hole: 0.3
                }]}
                layout={{
                  autosize: true,
                  height: 300,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.15, font: { color: '#a1a1aa', size: 11 } },
                  margin: { l: 10, r: 10, t: 10, b: 50 },
                  hoverlabel: {
                    bgcolor: '#18181b',
                    bordercolor: '#3f3f46',
                    font: { color: '#e4e4e7', size: 13 }
                  }
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Sector Diversification</h3>
              <Plot
                data={[{
                  type: 'pie',
                  labels: summary.sector_breakdown.map(d => d.sector),
                  values: summary.sector_breakdown.map(d => d.value),
                  marker: { colors: COLORS },
                  textinfo: 'percent',
                  textposition: 'inside',
                  textfont: { color: '#fff', size: 12 },
                  hovertemplate: '<b>%{label}</b><br>$%{value:,.2f}<br>%{percent}<extra></extra>',
                  hole: 0.3
                }]}
                layout={{
                  autosize: true,
                  height: 300,
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  showlegend: true,
                  legend: { orientation: 'h', y: -0.15, font: { color: '#a1a1aa', size: 11 } },
                  margin: { l: 10, r: 10, t: 10, b: 50 },
                  hoverlabel: {
                    bgcolor: '#18181b',
                    bordercolor: '#3f3f46',
                    font: { color: '#e4e4e7', size: 13 }
                  }
                }}
                config={{ displayModeBar: false, responsive: true }}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        )}
        {/* Property Plot*/}
        {activeHoldingType === 'properties' && properties.length >0 && (
          <div className='flex justify-center'>
            <div className='bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full'>
              <h3 className='text-lg font-semibold mb-4 text-center'> Area Breakdown</h3>
              <Plot 
                data = {[{
                  type: 'pie',
                  labels: propertyPostcodeData.map(d=>d.postcodeArea),
                  values : propertyPostcodeData.map(d=>d.value),
                  marker : {colors: COLORS},
                  textinfo:'percent',
                  textposition:'inside',
                  textfont: {color:'#fff', size:12},
                  hovertemplate: '<b>%{label}</b><br>£%{value:,.2f}<br>%{percent}<extra></extra>',
                  hole: 0.3
                }]}
                layout={{
                  autosize:true,
                  height: 300, 
                  paper_bgcolor: 'transparent',
                  showlegend:true,
                  legend:{orientation: 'h', y: -0.15, font: { color: '#a1a1aa',size:11}},
                  margin: {l: 10, r: 10, t: 10, b: 50},
                  hoverlabel:{
                    bgcolor: '#18181b',
                    bordercolor: '#3f3f46',
                    font: { color: '#e4e4e7', size: 13 }
                  }

                }}
                config={{displayModeBar:false,responsive:true}}
                style = {{width:'100%'}}
            
              >
              </Plot>

            </div>

          </div>
        )}




        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <div className='flex justify-between items-center mb-4'> 
            
            
          </div>
          <h3 className="text-lg font-semibold mb-4">Your Holdings</h3>
          {activeHoldingType == 'stocks' && (stocks.length === 0 ? (
            <p className="text-zinc-400 text-center py-8">
              No stocks yet. Click "Add Stock" to get started.
            </p>
          ) : (
            <div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Symbol</th>
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium">Company</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Shares</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Start Price</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Tracking Since</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Current Price</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Current Value</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Gain/Loss</th>
                    <th className="text-right py-3 px-4 text-zinc-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock) => (
                    <tr
                      key={stock.id}
                      className={`border-b border-zinc-800 transition ${
                        stock.purchase_date
                          ? 'cursor-pointer hover:bg-zinc-800/70'
                          : 'hover:bg-zinc-800/50'
                      }`}
                      onClick={() => handleStockClick(stock)}
                      title={stock.purchase_date ? 'Click to view price history' : ''}
                    >
                    <td className="py-3 px-4 font-medium text-green-400 whitespace-nowrap">
                      {getCountryFlag(stock.country)} {stock.symbol}
                    </td>
                      <td className="py-3 px-4 text-zinc-300">{stock.company_name}</td>
                      <td className="py-3 px-4 text-right">{parseFloat(stock.shares).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">{formatPriceUSD(stock.purchase_price_usd || stock.purchase_price)}</td>
                      <td className="py-3 px-4 text-right text-zinc-400">
                        {stock.purchase_date || <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right">{formatPriceUSD(stock.current_price)}</td>
                      <td className="py-3 px-4 text-right">{formatPriceUSD(stock.current_value)}</td>
                      <td className={`py-3 px-4 text-right ${parseFloat(stock.gain_loss) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatPriceUSD(Math.abs(parseFloat(stock.gain_loss)))}
                        <span className="text-xs ml-1">
                          ({parseFloat(stock.gain_loss_percentage).toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteStock(stock.id); }}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {activeHoldingType === 'properties' && (properties.length == 0 ? (
            <p
              className='text-zinc-400 text-center py-8'  
            >
              No properties yet. Click "Add Properties to get started."

            </p>
          ):(
            <div>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-zinc-800'>
                    <th className='text-left py-3 px-4 text-zinc-400 font-medium'>Type</th>
                    <th className='text-left py-3 px-4 text-zinc-400 font-medium'>Postcode Area</th>
                    <th className='text-left py-3 px-4 text-zinc-400 font-medium'>Purchase Price</th>
                    <th className='text-left py-3 px-4 text-zinc-400 font-medium'>Annual Rent</th>
                    <th className='text-left py-3 px-4 text-zinc-400 font-medium'>Ownership</th>
                    <th className='text-left py-3 px-4 text-zinc-400 font-medium'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property)=>(
                    <tr key={property.id} className='border-b border-zinc-800 hover:bg-zinc-800/50 transition'>
                      <td className='py-3 px-4 font-medium text-green-400'>{property.property_type}</td>
                      <td className='py-3 px-4 text-zinc-300'>{property.address}</td>
                              <td className='py-3 px-4 '>£{(parseFloat(property.purchase_price) || 0).toLocaleString('en-GB')}</td>
                      <td className='py-3 px-4'>£{parseFloat(property.monthly_rent)*52}</td>
                      <td className="py-3 px-4">
                         {parseFloat(property.ownership_percentage).toFixed(2)}%
                      </td>
                      <td className='py-3 px-4'>
                        <button
                          onClick={()=>handleDeleteProperty(property.id)}
                          className='text-red-400 hover:text-red-300 transition'
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        </div>
        </div>

        <div style={{ height: leftHeight > 0 ? Math.max(leftHeight, 400) : 400, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {stocks.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col" style={{ height: '100%', minHeight: 0 }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold text-white">Portfolio News</h3>
                <p className="text-zinc-500 text-sm mt-0.5">Latest articles about your holdings</p>
              </div>
              {newsLoading && (
                <span className="text-zinc-500 text-sm animate-pulse">Fetching news...</span>
              )}
            </div>

            {!newsLoading && news.length === 0 && (
              <p className="text-zinc-500 text-center py-8">No news found for your holdings.</p>
            )}

            <div className="pr-4 mr-1 flex flex-col gap-4 overflow-y-auto flex-1" style={{ minHeight: 0 }}>
            {news.map((article, i) => {
              const secondsAgo = Math.floor(Date.now() / 1000) - article.published_at;
              let timeLabel;
              if (secondsAgo < 3600) timeLabel = `${Math.floor(secondsAgo / 60)}m ago`;
              else if (secondsAgo < 86400) timeLabel = `${Math.floor(secondsAgo / 3600)}h ago`;
              else timeLabel = `${Math.floor(secondsAgo / 86400)}d ago`;

              return (
                <a
                  key={i}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-4 p-4 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-zinc-600 rounded-xl transition-all group"
                >
                  {article.thumbnail && (
                    <img
                      src={article.thumbnail}
                      alt=""
                      className="w-20 h-16 object-cover rounded-lg flex-shrink-0 bg-zinc-700"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div className="flex flex-col justify-between min-w-0">
                    <p className="text-white text-sm font-medium leading-snug group-hover:text-green-400 transition-colors line-clamp-3">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                        {article.related_symbol}
                      </span>
                      {article.publisher && (
                        <span className="text-xs text-zinc-400">{article.publisher}</span>
                      )}
                      <span className="text-xs text-zinc-500 ml-auto">{timeLabel}</span>
                    </div>
                  </div>
                </a>
              );
            })}
            </div>
          </div>
        )}
        </div>
        </div>

        {/* Live Exchange Rates Section - Card Style */}
        {exchangeRates && (
          <div className="mt-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-400 mb-3">Live Exchange Rates</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* EUR Card */}
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🇪🇺</div>
                <div className="text-green-400 font-bold text-lg">€{(1 / exchangeRates.EUR).toFixed(4)}</div>
                <div className="text-zinc-500 text-xs">1 USD = €{exchangeRates.EUR.toFixed(4)}</div>
              </div>
              
              {/* GBP Card */}
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🇬🇧</div>
                <div className="text-green-400 font-bold text-lg">£{(1 / exchangeRates.GBP).toFixed(4)}</div>
                <div className="text-zinc-500 text-xs">1 USD = £{exchangeRates.GBP.toFixed(4)}</div>
              </div>
              
              {/* JPY Card */}
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl mb-1">🇯🇵</div>
                <div className="text-green-400 font-bold text-lg">¥{(1 / exchangeRates.JPY).toFixed(2)}</div>
                <div className="text-zinc-500 text-xs">1 USD = ¥{exchangeRates.JPY.toFixed(2)}</div>
              </div>
              
              {/* CNY Card */}
              {exchangeRates.CNY && (
                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🇨🇳</div>
                  <div className="text-green-400 font-bold text-lg">¥{(1 / exchangeRates.CNY).toFixed(4)}</div>
                  <div className="text-zinc-500 text-xs">1 USD = ¥{exchangeRates.CNY.toFixed(4)}</div>
                </div>
              )}
              
              {/* INR Card */}
              {exchangeRates.INR && (
                <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl mb-1">🇮🇳</div>
                  <div className="text-green-400 font-bold text-lg">₹{(1 / exchangeRates.INR).toFixed(4)}</div>
                  <div className="text-zinc-500 text-xs">1 USD = ₹{exchangeRates.INR.toFixed(4)}</div>
                </div>
              )}
            </div>
            <p className="text-zinc-600 text-xs mt-3 text-center">Live rates from exchangerate-api.com • Updates every few minutes</p>
          </div>
        )}
      </div>
    </div>

    {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-green-400 text-xl font-bold mb-4">Add Stock</h2>
            
            {formError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                {formError}
              </div>
            )}
            
            <form onSubmit={handleAddStock}>
              <div className="mb-4 relative">
                <label className="block text-zinc-400 text-sm mb-2">
                  Stock Symbol <span className="text-zinc-500">(Start typing to search)</span>
                </label>
                <input
                  type="text"
                  value={newStock.symbol}
                  onChange={(e) => handleSymbolChange(e.target.value)}
                  onFocus={() => newStock.symbol && searchSymbols(newStock.symbol)}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-500 uppercase"
                  placeholder="e.g., AAPL, MSFT, TSLA"
                  required
                  maxLength="10"
                  autoComplete="off"
                />
                
                {showSuggestions && symbolSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {symbolSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectSymbol(suggestion.symbol, suggestion.name)}
                        className="w-full text-left p-3 hover:bg-zinc-700 transition border-b border-zinc-700 last:border-b-0"
                      >
                        <div className="font-semibold text-green-400">{suggestion.symbol}</div>
                        <div className="text-sm text-zinc-400">{suggestion.name}</div>
                      </button>
                    ))}
                  </div>
                )}
                
                {searchingSymbol && (
                  <div className="absolute right-3 top-10 text-zinc-400 text-sm">
                    Searching...
                  </div>
                )}
              </div>
              
              <div className="mb-4">
                <label className="block text-zinc-400 text-sm mb-2">Number of Shares</label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={newStock.shares}
                  onChange={(e) => setNewStock({ ...newStock, shares: e.target.value })}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                  placeholder="e.g., 10"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-zinc-400 text-sm mb-2">
                  Start Tracking Date <span className="text-zinc-500">(price is fetched automatically for this date)</span>
                </label>
                <input
                  type="date"
                  value={newStock.purchase_date}
                  onChange={(e) => setNewStock({ ...newStock, purchase_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                  required
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={addingStock}
                  className={`flex-1 py-3 ${
                    addingStock 
                      ? 'bg-green-600 cursor-not-allowed opacity-50' 
                      : 'bg-green-500 hover:bg-green-600'
                  } text-white rounded-lg transition`}
                >
                  {addingStock ? 'Adding Stock...' : 'Add Stock'}
                </button>
                <button
                  type="button"
                  disabled={addingStock}
                  onClick={() => {
                    setShowAddForm(false);
                    setNewStock({ symbol: '', shares: '', purchase_date: '' });
                    setFormError('');
                    setSymbolSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  className={`flex-1 py-3 ${addingStock ? 'bg-zinc-700 cursor-not-allowed opacity-50' : 'bg-zinc-800 hover:bg-zinc-700'} text-white rounded-lg transition`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    {showAddPropertyForm && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
          <h2 className="text-green-400 text-xl font-bold mb-4">Add Property</h2>

          {formError && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddProperty}>
            <div className="mb-4">
              <label className="block text-zinc-400 text-sm mb-2">Property Type</label>
              <div className="relative">
                <select
                  value={newProperty.property_type}
                  onChange={(e) => setNewProperty({ ...newProperty, property_type: e.target.value })}
                  className="property-select appearance-none w-full p-3 pr-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:border-green-500 focus:outline-none focus:border-green-500 transition"
                  required
                >
                  <option value="" disabled>Choose property type</option>
                  <option>Detached House</option>
                  <option>Semi-Detached House</option>
                  <option>Terraced House</option>
                  <option>End-of-Terrace House Townhouse</option>
                  <option>Bungalow</option>
                  <option>Cottage</option>
                  <option>Flat / Apartment</option>
                  <option>Maisonette</option>
                  <option>Studio Flat</option>
                  <option>Penthouse</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-400">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path d="M6 8l4 4 4-4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-zinc-400 text-sm mb-2">Postcode Area</label>
              <input
                type="text"
                value={newProperty.address}
                onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value.toUpperCase() })}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                placeholder="CT1, CT2 ..."
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-zinc-400 text-sm mb-2">Purchase Price(£)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newProperty.purchase_price}
                onChange={(e) => setNewProperty({ ...newProperty, purchase_price: e.target.value })}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                placeholder="2000000"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-zinc-400 text-sm mb-2">Ownership Percentage</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="100"
                value={newProperty.ownership_percentage}
                onChange={(e) => setNewProperty({ ...newProperty, ownership_percentage: e.target.value })}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-zinc-400 text-sm mb-2">Weekly Rent (Optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newProperty.monthly_rent}
                onChange={(e) => setNewProperty({ ...newProperty, monthly_rent: e.target.value })}
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-green-500"
                placeholder="200"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addingProperty}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
              >
                {addingProperty ? 'Adding Property...' : 'Add Property'}
              </button>

              <button
                type="button"
                disabled={addingProperty}
                onClick={() => {
                  setShowAddPropertyForm(false);
                  setNewProperty({
                    property_type: '',
                    address: '',
                    purchase_price: '',
                    ownership_percentage: '100',
                    monthly_rent: ''
                  });
                  setFormError('');
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

      {showHistoryModal && selectedStock && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedStock.symbol}
                    <span className="text-zinc-400 text-lg font-normal ml-2">{selectedStock.company_name}</span>
                  </h2>
                  <p className="text-zinc-400 text-sm mt-1">Price history since purchase on {selectedStock.purchase_date}</p>
                </div>
                <button
                  onClick={() => { setShowHistoryModal(false); setSelectedStock(null); setStockHistory(null); }}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {historyLoading && (
                <div className="flex items-center justify-center h-64 text-green-400">
                  Loading price history...
                </div>
              )}

              {!historyLoading && stockHistory?.error && (
                <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
                  {stockHistory.error}
                </div>
              )}

              {!historyLoading && stockHistory?.history && (
                <>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-zinc-400 text-xs">Purchase Price</p>
                      <p className="text-white font-bold">{formatPriceUSD(stockHistory.purchase_price_usd || stockHistory.purchase_price)}</p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-zinc-400 text-xs">Current Price</p>
                      <p className="text-white font-bold">
                        {stockHistory.history.length > 0
                          ? formatPriceUSD(stockHistory.history[stockHistory.history.length - 1].price)
                          : 'N/A'}
                      </p>
                    </div>
                    <div className="bg-zinc-800 rounded-lg p-3">
                      <p className="text-zinc-400 text-xs">Return since purchase</p>
                      {stockHistory.history.length > 0 ? (() => {
                        const current = stockHistory.history[stockHistory.history.length - 1].price;
                        const ret = ((current - (stockHistory.purchase_price_usd || stockHistory.purchase_price)) / (stockHistory.purchase_price_usd || stockHistory.purchase_price) * 100).toFixed(2);
                        return (
                          <p className={`font-bold ${parseFloat(ret) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(ret) >= 0 ? '+' : ''}{ret}%
                          </p>
                        );
                      })() : <p className="text-zinc-400">N/A</p>}
                    </div>
                  </div>

                  <Plot
                    data={[
                      {
                        x: stockHistory.history.map(d => d.date),
                        y: stockHistory.history.map(d => d.price),
                        type: 'scatter',
                        mode: 'lines',
                        name: 'Price',
                        line: { color: '#10b981', width: 2 },
                        fill: 'tozeroy',
                        fillcolor: 'rgba(16, 185, 129, 0.08)',
                        hovertemplate: '<b>%{x}</b><br>$%{y:,.2f}<extra></extra>'
                      }
                    ]}
                    layout={{
                      autosize: true,
                      height: 320,
                      paper_bgcolor: 'transparent',
                      plot_bgcolor: 'transparent',
                      font: { color: '#a1a1aa', size: 12 },
                      xaxis: { gridcolor: '#3f3f46', color: '#a1a1aa' },
                      yaxis: {
                        gridcolor: '#3f3f46',
                        color: '#a1a1aa',
                        tickformat: '$,.2f',
                        title: { text: 'Price ($)', font: { size: 13, color: '#e4e4e7' }, standoff: 10 }
                      },
                      shapes: [{
                        type: 'line',
                        x0: stockHistory.history[0]?.date,
                        x1: stockHistory.history[stockHistory.history.length - 1]?.date,
                        y0: stockHistory.purchase_price,
                        y1: stockHistory.purchase_price,
                        line: { color: '#f59e0b', width: 2, dash: 'dash' }
                      }],
                      annotations: [{
                        x: stockHistory.history[0]?.date,
                        y: stockHistory.purchase_price,
                        text: `Purchase: ${formatPriceUSD(stockHistory.purchase_price_usd || stockHistory.purchase_price)}`,
                        showarrow: false,
                        xanchor: 'left',
                        yanchor: 'bottom',
                        font: { color: '#f59e0b', size: 12 }
                      }],
                      margin: { l: 70, r: 20, t: 20, b: 50 },
                      hovermode: 'x unified'
                    }}
                    config={{ displayModeBar: false, responsive: true }}
                    style={{ width: '100%' }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default Portfolio;



