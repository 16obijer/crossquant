import { useCallback, useEffect, useRef,useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Mock data for house price estimates in Kent
const Postcode_Postions = [
  { name: 'Swanley', lat: 51.397, lng: 0.178, price: -1, postcode: 'BR8' },
  { name: 'Canterbury', lat: 51.2793, lng: 1.0832, price: 425000, postcode: 'CT1' },
  { name: 'Canterbury North', lat: 51.295, lng: 1.07, price: -1, postcode: 'CT2' },
  { name: 'Sandwich Rural', lat: 51.27, lng: 1.25, price: -1, postcode: 'CT3' },
  { name: 'Chartham', lat: 51.24, lng: 1.02, price: -1, postcode: 'CT4' },
  { name: 'Whitstable', lat: 51.36, lng: 1.03, price: -1, postcode: 'CT5' },
  { name: 'Herne Bay', lat: 51.37, lng: 1.12, price: -1, postcode: 'CT6' },
  { name: 'Birchington', lat: 51.37, lng: 1.3, price: -1, postcode: 'CT7' },
  { name: 'Westgate-on-Sea', lat: 51.38, lng: 1.34, price: -1, postcode: 'CT8' },
  { name: 'Margate', lat: 51.385, lng: 1.386, price: -1, postcode: 'CT9' },
  { name: 'Broadstairs', lat: 51.36, lng: 1.43, price: -1, postcode: 'CT10' },
  { name: 'Ramsgate', lat: 51.334, lng: 1.416, price: -1, postcode: 'CT11' },
  { name: 'Ramsgate Inland', lat: 51.342, lng: 1.36, price: -1, postcode: 'CT12' },
  { name: 'Sandwich', lat: 51.276, lng: 1.343, price: -1, postcode: 'CT13' },
  { name: 'Deal', lat: 51.223, lng: 1.404, price: -1, postcode: 'CT14' },
  { name: 'Dover Rural', lat: 51.186, lng: 1.267, price: -1, postcode: 'CT15' },
  { name: 'Dover', lat: 51.1282, lng: 1.3168, price: 380000, postcode: 'CT16' },
  { name: 'Dover Docks', lat: 51.117, lng: 1.314, price: -1, postcode: 'CT17' },
  { name: 'Hawkinge', lat: 51.11, lng: 1.165, price: -1, postcode: 'CT18' },
  { name: 'Folkestone Central', lat: 51.092, lng: 1.178, price: -1, postcode: 'CT19' },
  { name: 'Folkestone West', lat: 51.073, lng: 1.152, price: -1, postcode: 'CT20' },
  { name: 'Hythe', lat: 51.072, lng: 1.084, price: -1, postcode: 'CT21' },
  { name: 'Dartford', lat: 51.446, lng: 0.216, price: -1, postcode: 'DA1' },
  { name: 'Dartford South', lat: 51.423, lng: 0.258, price: -1, postcode: 'DA2' },
  { name: 'Longfield', lat: 51.386, lng: 0.304, price: -1, postcode: 'DA3' },
  { name: 'Farningham', lat: 51.393, lng: 0.228, price: -1, postcode: 'DA4' },
  { name: 'Bexley', lat: 51.441, lng: 0.149, price: -1, postcode: 'DA5' },
  { name: 'Greenhithe', lat: 51.446, lng: 0.281, price: -1, postcode: 'DA9' },
  { name: 'Swanscombe', lat: 51.449, lng: 0.309, price: -1, postcode: 'DA10' },
  { name: 'Gravesend East', lat: 51.434, lng: 0.354, price: -1, postcode: 'DA11' },
  { name: 'Gravesend', lat: 51.431, lng: 0.394, price: -1, postcode: 'DA12' },
  { name: 'Meopham', lat: 51.366, lng: 0.3612, price: -1, postcode: 'DA13' },
  { name: 'Rochester', lat: 51.387, lng: 0.505, price: -1, postcode: 'ME1' },
  { name: 'Strood', lat: 51.393, lng: 0.477, price: -1, postcode: 'ME2' },
  { name: 'Hoo Peninsula', lat: 51.43, lng: 0.55, price: -1, postcode: 'ME3' },
  { name: 'Snodland', lat: 51.329, lng: 0.443, price: -1, postcode: 'ME6' },
  { name: 'Sittingbourne East', lat: 51.346, lng: 0.807, price: -1, postcode: 'ME9' },
  { name: 'Maidstone', lat: 51.278, lng: 0.534, price: 445000, postcode: 'ME14' },
  { name: 'Sittingbourne', lat: 51.3371, lng: 0.7404, price: 355000, postcode: 'ME10' },
  { name: 'Queenborough', lat: 51.416, lng: 0.748, price: -1, postcode: 'ME11' },
  { name: 'Sheerness', lat: 51.411, lng: 0.822, price: -1, postcode: 'ME12' },
  { name: 'Faversham', lat: 51.315, lng: 0.89, price: -1, postcode: 'ME13' },
  { name: 'Maidstone South', lat: 51.252, lng: 0.542, price: -1, postcode: 'ME15' },
  { name: 'Maidstone West', lat: 51.277, lng: 0.482, price: -1, postcode: 'ME16' },
  { name: 'Lenham', lat: 51.223, lng: 0.709, price: -1, postcode: 'ME17' },
  { name: 'West Malling', lat: 51.255, lng: 0.418, price: -1, postcode: 'ME18' },
  { name: 'Kings Hill', lat: 51.299, lng: 0.406, price: -1, postcode: 'ME19' },
  { name: 'Aylesford', lat: 51.302, lng: 0.476, price: -1, postcode: 'ME20' },
  { name: 'Tunbridge Wells', lat: 51.1315, lng: 0.2649, price: 520000, postcode: 'TN1' },
  { name: 'Tunbridge Wells East', lat: 51.145, lng: 0.294, price: -1, postcode: 'TN2' },
  { name: 'Groombridge', lat: 51.102, lng: 0.257, price: -1, postcode: 'TN3' },
  { name: 'Tunbridge Wells North', lat: 51.141, lng: 0.245, price: -1, postcode: 'TN4' },
  { name: 'Edenbridge', lat: 51.198, lng: 0.067, price: -1, postcode: 'TN8' },
  { name: 'Tonbridge', lat: 51.195, lng: 0.273, price: -1, postcode: 'TN9' },
  { name: 'Tonbridge North', lat: 51.21, lng: 0.286, price: -1, postcode: 'TN10' },
  { name: 'Hadlow', lat: 51.225, lng: 0.333, price: -1, postcode: 'TN11' },
  { name: 'Paddock Wood', lat: 51.181, lng: 0.387, price: -1, postcode: 'TN12' },
  { name: 'Sevenoaks', lat: 51.273, lng: 0.192, price: -1, postcode: 'TN13' },
  { name: 'Dunton Green', lat: 51.294, lng: 0.126, price: -1, postcode: 'TN14' },
  { name: 'Borough Green', lat: 51.293, lng: 0.304, price: -1, postcode: 'TN15' },
  { name: 'Westerham', lat: 51.269, lng: 0.053, price: -1, postcode: 'TN16' },
  { name: 'Cranbrook', lat: 51.097, lng: 0.534, price: -1, postcode: 'TN17' },
  { name: 'Hawkhurst', lat: 51.048, lng: 0.51, price: -1, postcode: 'TN18' },
  { name: 'Ashford Central', lat: 51.144, lng: 0.852, price: -1, postcode: 'TN23' },
  { name: 'Ashford West', lat: 51.147, lng: 0.891, price: -1, postcode: 'TN24' },
  { name: 'Wye', lat: 51.153, lng: 0.95, price: -1, postcode: 'TN25' },
  { name: 'Bethersden', lat: 51.115, lng: 0.788, price: -1, postcode: 'TN26' },
  { name: 'Headcorn', lat: 51.167, lng: 0.642, price: -1, postcode: 'TN27' },
  { name: 'New Romney', lat: 50.986, lng: 0.945, price: -1, postcode: 'TN28' },
  { name: 'Lydd', lat: 50.951, lng: 0.91, price: -1, postcode: 'TN29' },
  { name: 'Tenterden', lat: 51.068, lng: 0.689, price: -1, postcode: 'TN30' },
];
const normalizePostcode = (value) => {
  if (!value) return '';
  const cleaned = value.toUpperCase().trim();
  const match = cleaned.match(/^[A-Z]{1,2}\d{1,2}[A-Z]?/);
  return match ? match[0] : cleaned;
};

const MAX_COMPARE_POSTCODES = 5;
const COMPARE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#10b981', '#06b6d4'];
const MAP_COLORS = ['#dc2626', '#3b82f6', '#f59e0b', '#10b981', '#06b6d4'];

const getSeriesLabel = (index) => String.fromCharCode(65 + index);

const formatCompactCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const amount = Number(value);
  const absAmount = Math.abs(amount);

  if (absAmount >= 1000000) {
    const millions = absAmount / 1000000;
    const compact = millions >= 10 ? Math.round(millions) : Number(millions.toFixed(1));
    return `${amount < 0 ? '-' : ''}${compact}M`;
  }

  if (absAmount >= 1000) {
    const thousands = Math.round(absAmount / 1000);
    return `${amount < 0 ? '-' : ''}${thousands}K`;
  }

  return `${Math.round(amount)}`;
};

const buildComparablePostcodeList = (inputs) => {
  const normalizedInputs = inputs.map((value) => normalizePostcode(value));
  const uniquePostcodes = [...new Set(normalizedInputs.filter(Boolean))].slice(0, MAX_COMPARE_POSTCODES);
  return { normalizedInputs, uniquePostcodes };
};

const alignEstimatedPricesWithPostcodes = (previousEstimates, orderedPostcodes) => {
  return orderedPostcodes
    .map((postcode, index) => {
      const match = previousEstimates.find((estimate) => estimate.postcode === postcode);
      if (!match) return null;
      return {
        ...match,
        color: COMPARE_COLORS[index] ?? COMPARE_COLORS[0],
      };
    })
    .filter(Boolean);
};

const saveRecentPostcodes = async (postcodes, token) => {
  if (!token) return null;
  
  try {
    const response = await fetch('http://127.0.0.1:8000/api/save_recent_postcodes/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${token}`,
      },
      body: JSON.stringify({ postcodes }),
    });

    if (!response.ok) {
      console.warn('Failed to save recent postcodes:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('Error saving recent postcodes:', error);
    return null;
  }
};

const createSelectionPinIcon = (color, label) => L.divIcon({
  className: 'custom-selection-pin',
  iconSize: [34, 46],
  iconAnchor: [17, 42],
  popupAnchor: [0, -38],
  html: `
    <div style="position: relative; width: 34px; height: 46px; display: flex; align-items: flex-start; justify-content: center;">
      <div style="position: absolute; top: 7px; width: 28px; height: 28px; border-radius: 999px; background: ${color}; border: 2px solid #ffffff; box-shadow: 0 0 0 4px rgba(255,255,255,0.35), 0 8px 14px rgba(0,0,0,0.55); color: #ffffff; font-weight: 800; font-size: 13px; display: flex; align-items: center; justify-content: center;">
        ${label}
      </div>
      <div style="position: absolute; top: 30px; width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 14px solid ${color}; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.45));"></div>
    </div>
  `,
});

export default function HousePricing() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [kentData, setKentData] = useState(null);
  const [postcodeInputs, setPostcodeInputs] = useState(['']);
  const [activeInputIndex, setActiveInputIndex] = useState(0);
  const [estimatedPrices, setEstimatedPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,setError] = useState(null);
  const[showInfo, setShowInfo] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  const geoJsonRef = useRef(null);
  const layersByPostcode = useRef({});
  const autoSearchDoneRef = useRef('');
  const activeInputIndexRef = useRef(activeInputIndex);

  useEffect(() => {
    activeInputIndexRef.current = activeInputIndex;
  }, [activeInputIndex]);

  useEffect(() => {
    // Load Kent GeoJSON data
    fetch('/kent.geojson')
      .then(response => response.json())
      .then(data => setKentData(data))
      .catch(error => console.error('Error loading GeoJSON:', error));
  }, []);

  const closeTutorial = () => {
    setShowTutorial(false);
    setTutorialStep(1);
  };

  const openTutorial = () => {
    setTutorialStep(1);
    setShowTutorial(true);
  };

  // Highlight one or two postcode districts whenever comparison results change.
  useEffect(()=>{
    // Reset all layers to default style.
    Object.values(layersByPostcode.current).forEach(layer=>{
      layer.setStyle({color:'#555555', weight:0,fillOpacity:0, opacity:0})

    });

    if (!estimatedPrices.length) return;

    const map = geoJsonRef.current?._map;
    const boundsToFit = [];

    estimatedPrices.forEach((item, index) => {
      const matched = layersByPostcode.current[item.postcode];
      if (matched) {
        matched.setStyle({
          color: MAP_COLORS[index] ?? MAP_COLORS[0],
          weight: 2,
          fillOpacity: 0.35,
          fillColor: MAP_COLORS[index] ?? MAP_COLORS[0],
          opacity: 1,
        });

        const bounds = matched.getBounds?.();
        if (bounds?.isValid?.()) {
          boundsToFit.push(bounds);
        }
      }
    });

    if (map && boundsToFit.length) {
      const combined = boundsToFit[0];
      boundsToFit.slice(1).forEach((bounds) => combined.extend(bounds));
      map.flyToBounds(combined.pad(0.1), {
        duration: 1.2,
        easeLinearity: 0.25,
        maxZoom: 12,
      });
      return;
    }

    const fallbackLocation = Postcode_Postions.find(
      (item) => item.postcode === estimatedPrices[0].postcode
    );
    if (map && fallbackLocation) {
      map.flyTo([fallbackLocation.lat, fallbackLocation.lng], 12, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    }
  },[estimatedPrices]);

  const postcodeInputsRef = useRef(postcodeInputs);
  useEffect(()=>{
    postcodeInputsRef.current = postcodeInputs;
  },[postcodeInputs]);
  

  const handleEstimate = useCallback(async(inputValues) => {
    const values = inputValues ?? postcodeInputsRef.current;
    const { normalizedInputs, uniquePostcodes } = buildComparablePostcodeList(values);

    if (!uniquePostcodes.length) return;

    setLoading(true);
    setError(null);
    setEstimatedPrices([]);
    try{
      const response = await fetch('http://127.0.0.1:8000/api/postcode_district_lookup_bulk/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postcode_districts: uniquePostcodes }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || 'Failed to fetch postcode estimates');
      }

      const data = await response.json();
      const resultMap = new Map((data.results || []).map((item) => [item.postcode_district, item]));

      const responses = uniquePostcodes
        .map((code, index) => {
          const item = resultMap.get(code);
          if (!item) return null;

          const locationInfo = Postcode_Postions.find((location) => location.postcode === code);
          return {
            price: item.predicted_price,
            postcode: code,
            name: locationInfo?.name ?? `Area ${code}`,
            trend: item.trend,
            color: COMPARE_COLORS[index] ?? COMPARE_COLORS[0],
          };
        })
        .filter(Boolean);

      if (!responses.length) {
        throw new Error('No data found for selected postcodes');
      }
      //Fall back to single input if the input is invalid
      setPostcodeInputs(normalizedInputs.length ? normalizedInputs:['']);
      setEstimatedPrices(responses);

      // Save recent postcodes to database (optional - don't fail if it errors)
      saveRecentPostcodes(uniquePostcodes, token).catch((err) => {
        console.warn('Failed to save recent postcodes:', err);
      });

    }
    catch(err){
      setError(err.message);
    }
    finally{
      setLoading(false);
    }
  }, [token]);

  //Fixing the duplicated API calls 
  const handleEstimateRef = useRef(handleEstimate);
  useEffect(()=>{
    handleEstimateRef.current = handleEstimate;
  
  },[handleEstimate]);

  useEffect(() => {
    const rawPostcode = searchParams.get('postcode');
    const normalizedPostcode = normalizePostcode(rawPostcode || '');

    if (!normalizedPostcode) return;
    if (autoSearchDoneRef.current === normalizedPostcode) return;

    autoSearchDoneRef.current = normalizedPostcode;
    const nextInputs = [normalizedPostcode];

    setPostcodeInputs(nextInputs);
    setActiveInputIndex(0);
    handleEstimateRef.current(nextInputs);
  }, [searchParams]);

  const buildSeriesForPostcode = (estimate) => {
    if (!estimate?.trend?.prices) return [];
    const entries = Object.entries(estimate.trend.prices);

    return entries.map(([year, price], index) => {
      const isPredicted = year.includes('_predicted');
      return {
        year: year.replace('_predicted', ''),
        actual: !isPredicted ? Math.round(price) : null,
        //avoids bridging in 2023
        predicted: isPredicted  || (index === entries.length - 2) ? Math.round(price) : null,
      };
    });
  };

  // Transform one or two trend series from the API to a merged chart shape.
  const getChartData = () => {
    if (!estimatedPrices.length) return [];

    const mergedByYear = {};
    estimatedPrices.forEach((estimate, index) => {
      const series = buildSeriesForPostcode(estimate);
      series.forEach((point) => {
        if (!mergedByYear[point.year]) {
          mergedByYear[point.year] = { year: point.year };
        }
        mergedByYear[point.year][`price_${index}`] = point.actual;
        mergedByYear[point.year][`predicted_${index}`] = point.predicted;
      });
    });

    return Object.values(mergedByYear).sort((a, b) => Number(a.year) - Number(b.year));
  };

  const handleMapPostcodeSelect = (selectedPostcode) => {
    if (!selectedPostcode) return;

    const normalizedSelection = selectedPostcode.toUpperCase();

    setPostcodeInputs((prev) => {
      if (prev[activeInputIndexRef.current] !== undefined) {
        const next = [...prev];
        next[activeInputIndexRef.current] = normalizedSelection;
        return next;
      }

      const firstEmptyIndex = prev.findIndex((value) => !value.trim());
      if (firstEmptyIndex >= 0) {
        const next = [...prev];
        next[firstEmptyIndex] = normalizedSelection;
        return next;
      }

      const next = [...prev];
      next[next.length - 1] = normalizedSelection;
      return next;
    });

    setError(null);
  };

  const handlePostcodeInputChange = (index, value) => {
    setPostcodeInputs((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleAddPostcodeInput = () => {
    setPostcodeInputs((prev) => {
      if (prev.length >= MAX_COMPARE_POSTCODES) return prev;
      return [...prev, ''];
    });
  };

  const handleRemovePostcodeInput = (index) => {
    setPostcodeInputs((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, inputIndex) => inputIndex !== index);

      const { uniquePostcodes } = buildComparablePostcodeList(next);
      setEstimatedPrices((previousEstimates) => alignEstimatedPricesWithPostcodes(previousEstimates, uniquePostcodes));

      return next.length ? next : [''];
    });

    setActiveInputIndex((prevIndex) => {
      if (index < prevIndex) return prevIndex - 1;
      if (index === prevIndex) return Math.max(0, prevIndex - 1);
      return prevIndex;
    });
  };

  const filledPostcodeCount = postcodeInputs.filter((value) => normalizePostcode(value)).length;

  const onEachFeature = (feature, layer) => {
    // Store layer by postcode for red boundary highlighting
    if(feature.properties.name){
      layersByPostcode.current[feature.properties.name]= layer;
    }
    //Add popup for postcode areas
    if(feature.properties.name){
      const locationInfo = Postcode_Postions.find(item=>item.postcode ===feature.properties.name);
      const displayName = locationInfo ?.name ??feature.properties.name;
      layer.bindPopup(`<strong>${displayName}</strong><br/>${feature.properties.name}`);
      layer.on({
        click: () => {
          handleMapPostcodeSelect(feature.properties.name);
        },
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="text-4xl font-bold text-white">House Pricing <span className="text-green-400">Estimator</span></h1>
        <button
          type="button"
          onClick={openTutorial}
          className="px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-green-400 hover:border-green-500/50 rounded-lg transition-all"
        >
          Tutorial
        </button>
      </div>
      <p className="text-zinc-400 mb-6">Median estimate property values across Kent</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left panel - Controls */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 p-8 rounded-xl border border-zinc-800">
            <div className='flex justify-between items-center mb-6'>
               <h2 className="text-xl font-bold text-white ">Search</h2>
               <button 
                  type= "button" 
                  onClick= {()=> setShowInfo(true)} 
                className='inline-flex h-10 w-10 items-center justify-center text-zinc-400 hover:text-green-400 hover:bg-zinc-800 rounded-lg transition-all'
                  title='Model Information'>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </button>
            </div>
           
            
            <div className="flex flex-col gap-5">
              {postcodeInputs.map((postcodeValue, index) => {
                const label = getSeriesLabel(index);
                const ringColor = COMPARE_COLORS[index] ?? COMPARE_COLORS[0];

                return (
                  <div className="flex flex-col gap-2" key={`postcode-input-${index}`}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: ringColor }}>
                        Postcode {label}{index === 0 ? '' : ' (Optional)'}
                      </label>
                      {postcodeInputs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePostcodeInput(index)}
                          className="px-2.5 py-1 text-xs font-semibold text-red-300 border border-red-500/40 rounded-md hover:bg-red-500/10 transition-all"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. CT1, ME10, TN1"
                      value={postcodeValue}
                      onChange={(e) => handlePostcodeInputChange(index, e.target.value)}
                      onFocus={() => setActiveInputIndex(index)}
                      onKeyDown = {(e)=>e.key === 'Enter' && handleEstimate(postcodeInputs)}
                      className="bg-zinc-950 text-white border border-zinc-700 rounded p-3 focus:outline-none focus:border-white transition-all duration-200 placeholder-zinc-600"
                      
                    />
                  </div>
                );
              })}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleAddPostcodeInput}
                  disabled={postcodeInputs.length >= MAX_COMPARE_POSTCODES}
                  className="text-sm font-semibold text-zinc-200 px-3 py-2 rounded-lg border border-zinc-700 hover:border-zinc-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Add More Postcodes
                </button>
                <p className="text-xs text-zinc-500">{postcodeInputs.length}/{MAX_COMPARE_POSTCODES} inputs</p>
              </div>

              <button
                onClick={()=>handleEstimate(postcodeInputs)}
                //When loading=True, or button becomes unclickable, prevents spamming the request to API
                disabled = {loading}
                className="bg-green-500 text-zinc-950 font-semibold py-3 px-6 rounded-lg hover:bg-green-400 transition-all duration-200"
              >
                {loading ? 'Fetching ... ' : (filledPostcodeCount > 1 ? 'Compare Postcodes' : 'Estimate Price')}
              </button>
            </div>

          {/*Error state: If no data is found then show no data found*/}
          {error && (
            <div className='mt-6 p-4 font-semibold text-white border border-zinc-700 rounded p-3 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all duration-200 placeholder-zinc-600 rounded-lg'>
              <p className='text-sm text-red-400'>{error}</p>
            </div>
          )}

            {/* Price Estimate Result */}
            {estimatedPrices.length > 0 && (
              <div className="mt-8 space-y-4">
                {estimatedPrices.map((item, index) => (
                  <div key={item.postcode} className="p-5 bg-zinc-950 border border-zinc-700 rounded-lg">
                    <p className="text-sm text-zinc-400 mb-2">
                      <strong style={{ color: item.color }}>Location:</strong> {item.name}
                    </p>
                    <p className="text-sm text-zinc-400 mb-4">
                      <strong style={{ color: item.color }}>Postcode {getSeriesLabel(index)}:</strong> {item.postcode}
                    </p>
                    <p className="text-3xl font-bold mt-4 tabular-nums" style={{ color: item.color }}>
                      £{Math.round(item.price).toLocaleString()}
                    </p>
                    <p className="text-xs text-zinc-600 mt-3">
                      *2024 median predicted price*.
                    </p>
                  </div>
                ))}

              </div>
            )}
          </div>
        </div>
        {/*Info Model*/}
        {showInfo && (
          <div className='fixed inset-0 bg-black/70 flex items-center justify-center z-[3000] p-4'>
            <div className='bg-zinc-900 border border-zinc-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden'>
              <div className='p-6 my-2 max-h-[calc(90vh-1rem)] overflow-y-auto scrollbar-hidden info-modal-scroll'>
                <div className='flex justify-between items-start mb-4'>
                  <h2 className='text-2xl font-bold text-white'>How is this price estimated?</h2>
                  <button 
                    onClick = {()=> setShowInfo(false)}
                    className='text-zinc-400 hover:text-white transition-colors'>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  </button>  
                </div>
                <div className='space-y-4 text-zinc-300 mb-4'>
                  <p> We analyse historical property price data across Kent to estimate typical housing values at postcode district level. By identifying patterns in historical sales prices alongside structural attributes of properties- such as size, type, energy rating, property age, number of rooms- as well as how prices have moved over recent quarters, we estimate the median sale prices for your postcode district.</p>
                  <p>The prices shown is the median which means half of homes in your area is sold above this figure and half below. It reflects the typical market, <span className='text-red-400'>not any single property.</span></p>

                </div>
                <div className='mt-4'>
                  <button
                    onClick={()=>setShowDetails(!showDetails)}
                    className='text-yellow-200 hover:text-blue transition-colors text-sm'>
                      {showDetails?"Show Less ▲":"Learn More ▼"}
                  </button>
                  {showDetails &&(
                    <div className='mt-4 space-y-4 text-zinc-300 text-lg'>
                      <h3 className='text-sky-400 font-semibold'>
                        Diving into the model
                      </h3>
                      <p className='text-sm'>
                        <span className='text-green-400 font-bold'>Data-</span> Land Registry sale records were merged with Energy Performance Certificate (EPC) data to the most recent EPC for the same postcode before the transaction date- preventing any future data from leaking into training.

                      </p>
                      <p className='text-sm'>
                        <span className='text-green-400 font-bold'>Feature engineering-</span> Property type was one-hot encoded; floor area, habitable rooms and floor-area-per-room were log-transformed to reduce skew; energy rating was mapped ordinally (A=7 to G=1); and property age was estimated from construction age band midpoints. Missing values were explicity flagged rather than dropped. Lag features capturing median prices from 1,2, and 4 quarters prior were added to help model learn price momentum. Data was then aggregated to MSOA level per quarter to smooth noise. 

                      </p>
                      <p className='text-sm'>
                        <span className='text-green-400 font-bold'>Training and Validation-</span> An XGBoost model was trained on 2021-2023 quaterly MSOA data using expanding window cross-validation-- training on all quarters up to a point and validating on the next unseen quarter. Sales volume was used as sample weight. 

                      </p>
                      <p className='text-sm'>
                        <span className='text-green-400 font-bold'>Prediction-</span> 2024 prices are predicted at MSOA level per quarter, then aggregated to postcode district using a sales-weighted average to produce final estimate.

                      </p>
                      
                      
                    </div>
                    
                  )}
                  <button
                        onClick={() => setShowInfo(false)}
                        className="mt-6 w-full bg-green-500 text-zinc-950 font-bold py-3 px-4 rounded-lg hover:bg-green-400 transition-all duration-200"
                      >
                      Got it!
                  </button>

                </div>


              </div>

            </div>

          </div>
        )}

        {/* Right panel - Map */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            {kentData ? (
              <MapContainer
                center={[51.29, 0.9]}
                zoom={8.5}
                style={{ height: '600px', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <GeoJSON 
                  ref = {geoJsonRef}
                  data={kentData} 
                  onEachFeature={onEachFeature} 
                  style={{color:'#555555', weight:0 , fillOpacity:0,opacity:0}}
                  
                />
                
                {/* Mock price data markers */}
                {Postcode_Postions.map((location, idx) => (
                  <CircleMarker
                    key={idx}
                    center={[location.lat, location.lng]}
                    radius={7}
                    fillColor="#22c55e"
                    color="#166534"
                    weight={1}
                    opacity={1}
                    fillOpacity={1}
                    eventHandlers={{
                      click: () => handleMapPostcodeSelect(location.postcode),
                    }}
                  >
                    <Popup>
                      <div>
                        <strong>Location: {location.name}</strong>
                        <br />
                        Postcode:{location.postcode}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {estimatedPrices.map((item, index) => {
                  const locationInfo = Postcode_Postions.find(
                    (location) => location.postcode === item.postcode
                  );

                  if (!locationInfo) return null;

                  return (
                    <Marker
                      key={`selected-pin-${item.postcode}`}
                      position={[locationInfo.lat, locationInfo.lng]}
                      icon={createSelectionPinIcon(item.color, getSeriesLabel(index))}
                      zIndexOffset={1000}
                    >
                      <Popup>
                        <div>
                          <strong>Location: {item.name}</strong>
                          <br />
                          Postcode:{item.postcode}
                          <br />
                          Price: £{Math.round(item.price).toLocaleString()}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            ) : (
              <div className="h-96 flex items-center justify-center text-zinc-400">
                Loading map...
              </div>
            )}
          </div>

          {/* Trend chart */}
          <div className='mt-6 bg-zinc-900 p-6 rounded-xl border border-zinc-800'>
            <h3 className='text-white font-bold mb-4 text-center'>Median Price Trend Over Years</h3>
            {estimatedPrices.length > 0 ? (
              <ResponsiveContainer width= "100%" height={350}>
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="4 4" stroke='#636367' strokeWidth={1}/>
                  <XAxis dataKey="year" stroke='#FFFFFF' label={{ value: 'Year', position: 'middle', offset: -5, fill: '#FFFFFF' }}/>
                  <YAxis stroke="#FFFFFF" tickFormatter={formatCompactCurrency} label={{ value: 'Price (£)', angle: -90, position: 'insideLeft', fill: '#FFFFFF' }}/>
                  {estimatedPrices.flatMap((item, index) => [
                    <Line
                      key={`price-${item.postcode}`}
                      type="monotone"
                      dataKey={`price_${index}`}
                      name={`${item.postcode} historical`}
                      stroke={item.color}
                      strokeWidth={3}
                      dot={false}
                    />,
                    <Line
                      key={`predicted-${item.postcode}`}
                      type="monotone"
                      dataKey={`predicted_${index}`}
                      name={`${item.postcode} predicted`}
                      stroke={item.color}
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      connectNulls={false}
                      dot={{ fill: item.color, strokeDasharray: '0' }}
                    />,
                  ])}
                  <Tooltip
                    contentStyle={{backgroundColor : '#ffff', border:'1px solid #000000', borderRadius: '8px'}}
                    labelStyle={{color:'#fffff', fontWeight:'bold'}}
                    itemStyle={{color:'#000000'}}
                    //fixing the point overlapping and deduplication issue in the trend chart so that 2023 only shows one actual value
                    content={({active, payload,label})=>{
                      if(!active || !payload ?.length) return null;
                      const validEntries = payload.filter(e=>e.value!=null)
                      //Get indicies of the year that has historical values only 
                      const historicalIndices = new Set(
                        validEntries
                          .filter(e=>e.dataKey.startsWith('price_'))
                          .map(e=>e.dataKey.match(/_(\d+)$/)?.[1])
                      );
                      //Keep historical entries, and only keep predicted if no historical exists for that the index
                      const filtered = validEntries.filter(e=>{
                        const idx = e.dataKey.match(/_(\d+)$/)?.[1];
                        const isPredicted = e.dataKey.startsWith('predicted_');
                        return !(isPredicted && historicalIndices.has(idx));
                      });
                      return (
                        <div style={{backgroundColor : '#ffff', border:'1px solid #000000', borderRadius: '8px',padding:'10px'}}>
                          <p style={{fontWeight:'bold', marginBottom:4}}>{label}</p>
                          {filtered.map((e) => {
                            const labelText = e.name.replace('historical', '').replace('predicted', '').trim();
                            return (
                              <p key={e.dataKey} style={{ color: '#000', margin: 0 }}>
                                {labelText}: £{formatCompactCurrency(e.value)}
                              </p>
                            );
                          })}
                        </div>

                      );
                    }}
                    
                  />

                </LineChart>
              </ResponsiveContainer>
            ):(
              <p className='text-zinc-500 text-sm'> 
              No postcode selected yet</p>

            )}

          </div>
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
                  <h3 className="text-lg font-semibold text-green-400 mb-2">1. Input a postcode into the search field</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Enter a postcode in the form and click <span className="font-semibold text-white">Estimate Price</span>. You will get an estimated value plus trend chart so you can quickly understand how the area has moved over time.
                  </p>
                </div>
              ) : tutorialStep === 2 ? (
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">2. Click i for more information</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Click the <span className="font-semibold text-white">i</span> button in the Search panel to open a full explanation of how the housing estimate is produced.
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">3. The map is interactive</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Click any marker or postcode region on the map to auto-fill the postcode search, then estimate again. The map will also zoom to the selected area so you can explore locations faster.
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
    </div>
  )
}
