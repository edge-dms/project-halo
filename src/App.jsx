import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Database, Loader2, LogOut } from 'lucide-react';
import LandingPage from './components/LandingPage';

// --- HELPER: MATH FOR RADIUS CALCULATION ---
function getDistanceFromLatLonInMiles(lat1, lon1, lat2, lon2) {
  const R = 3959; // Radius of the earth in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// --- COMPONENT: OAUTH CALLBACK ---
function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('Connecting to CRM...');
  const code = searchParams.get('code');

  useEffect(() => {
    async function exchangeCode() {
      if (!code) return;
      try {
        const response = await fetch('/.netlify/functions/get-token', {
          method: 'POST',
          body: JSON.stringify({ code })
        });
        if (!response.ok) throw new Error('Token exchange failed');
        const data = await response.json();
        
        localStorage.setItem('ghl_token', data.access_token);
        localStorage.setItem('ghl_location_id', data.locationId);
        
        window.location.href = '/'; 
      } catch (err) {
        console.error(err);
        setStatus('Error connecting. Please try again.');
      }
    }
    exchangeCode();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#2b998e] mx-auto" />
        <h2 className="text-xl font-bold">{status}</h2>
        <p className="text-slate-400">Please wait while we secure your connection.</p>
      </div>
    </div>
  );
}

// --- COMPONENT: DASHBOARD ---
function Dashboard({ onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [centerAddress, setCenterAddress] = useState('');
  const [radius, setRadius] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showBatchTools, setShowBatchTools] = useState(true);
  const [geoProgress, setGeoProgress] = useState(0); 
  const [geoCount, setGeoCount] = useState({ current: 0, total: 0 });

  // Update these to match your HighLevel Custom Field Keys exactly
  const LAT_KEY = 'contact.custom_lat'; 
  const LNG_KEY = 'contact.custom_lng';
  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  // Helper: Geocode via Mapbox
  const geocodeAddress = async (address) => {
    if (!MAPBOX_TOKEN) throw new Error("Mapbox Token Missing");
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    return null;
  };

  const fetchContacts = async () => {
    setIsLoading(true);
    setStatus('Syncing HighLevel Contacts...');
    setError('');
    const token = localStorage.getItem('ghl_token');
    const locationId = localStorage.getItem('ghl_location_id');

    if (!token || !locationId) {
      setError('Session expired. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      let allContacts = [];
      let nextUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`;
      let hasMore = true;

      while (hasMore) {
        setStatus(`Fetching... (${allContacts.length} loaded)`);
        const response = await fetch(nextUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Version': '2021-07-28',
            'Accept': 'application/json'
          }
        });
        if (!response.ok) throw new Error('API Sync Failed');
        const data = await response.json();
        const batch = data.contacts || [];
        allContacts = [...allContacts, ...batch];

        if (data.meta && data.meta.nextPageUrl && batch.length === 100) {
          nextUrl = data.meta.nextPageUrl;
        } else {
          hasMore = false;
        }
      }
      setContacts(allContacts);
      setStatus(`Ready: ${allContacts.length} contacts synced.`);
    } catch (err) {
      setError(`Sync Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const geocodeAllContacts = async () => {
    const token = localStorage.getItem('ghl_token');
    // Filter contacts that have an address but no Lat/Lng in their custom fields
    const targets = contacts.filter(c => {
        const hasLat = c.customFields?.find(f => f.key === LAT_KEY)?.value;
        return c.address1 && !hasLat;
    });

    const total = targets.length;
    if (total === 0) {
      setStatus("Database is already fully geocoded!");
      return;
    }

    setIsLoading(true);
    setGeoProgress(0);
    setGeoCount({ current: 0, total });

    for (let i = 0; i < total; i++) {
      const contact = targets[i];
      const fullAddress = `${contact.address1}, ${contact.city || ''} ${contact.state || ''} ${contact.postalCode || ''}`;
      
      try {
        const coords = await geocodeAddress(fullAddress);
        if (coords) {
          await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customFields: [
                { key: LAT_KEY, value: coords.lat.toString() },
                { key: LNG_KEY, value: coords.lng.toString() }
              ]
            })
          });
        }
        await new Promise(r => setTimeout(r, 110)); // Safe Mapbox rate limit
      } catch (err) {
        console.error(`Geocode failed for ${contact.id}`, err);
      }

      setGeoCount({ current: i + 1, total });
      setGeoProgress(Math.round(((i + 1) / total) * 100));
    }

    setStatus(`Success: Processed ${total} contacts.`);
    setIsLoading(false);
    fetchContacts(); // Refresh local list with new coordinates
  };

  const handleSearch = async () => {
    if (!centerAddress) return setError("Enter a center point first.");
    setIsLoading(true);
    setStatus(`Locating ${centerAddress}...`);
    try {
      const coords = await geocodeAddress(centerAddress);
      if (coords) {
        filterContactsByRadius(coords.lat, coords.lng);
      } else {
        throw new Error("Address not found.");
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const filterContactsByRadius = (centerLat, centerLon) => {
    const results = contacts.map(contact => {
      const latVal = contact.customFields?.find(f => f.key === LAT_KEY)?.value;
      const lngVal = contact.customFields?.find(f => f.key === LNG_KEY)?.value;
      if (!latVal || !lngVal) return null;

      const dist = getDistanceFromLatLonInMiles(centerLat, centerLon, parseFloat(latVal), parseFloat(lngVal));
      return { ...contact, distance: dist.toFixed(1) };
    }).filter(c => c !== null && parseFloat(c.distance) <= radius);

    results.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    setFilteredContacts(results);
    setStatus(`Found ${results.length} results within ${radius} miles.`);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-[#2b998e] p-2 rounded-lg"><MapPin className="text-white w-6 h-6" /></div>
              <div>
                <h1 className="text-2xl font-bold">EdgeLocalist</h1>
                <p className="text-slate-400 text-sm">Built By Reps, For Reps</p>
              </div>
            </div>
            <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-all"><LogOut size={16} /> Logout</button>
          </div>

          {showBatchTools && (
            <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-700 mb-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Initial Setup: Batch Geocoding</h3>
              {isLoading && geoCount.total > 0 && (
                <div className="mb-6">
                  <div className="flex justify-between mb-2 text-sm font-mono text-[#2b998e]">
                    <span>PROGRESS</span>
                    <span>{geoProgress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-3 border border-slate-700">
                    <div className="bg-[#2b998e] h-full rounded-full transition-all duration-300 shadow-[0_0_15px_rgba(43,153,142,0.4)]" style={{ width: `${geoProgress}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-3 text-center italic">Processing {geoCount.current.toLocaleString()} / {geoCount.total.toLocaleString()} - Keep tab open</p>
                </div>
              )}
              <button onClick={geocodeAllContacts} disabled={isLoading} className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-white text-slate-900 hover:bg-slate-200 disabled:bg-slate-700 transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Database size={16} />} 
                {isLoading ? 'Processing Large Batch...' : 'Geocode My Database'}
              </button>
            </div>
          )}

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Center Search</label>
                <input type="text" value={centerAddress} onChange={(e) => setCenterAddress(e.target.value)} placeholder="Enter Start Address..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#2b998e] outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase">Radius</label>
                <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 focus:ring-2 focus:ring-[#2b998e] outline-none">
                  <option value={10}>10 Miles</option>
                  <option value={25}>25 Miles</option>
                  <option value={50}>50 Miles</option>
                </select>
              </div>
            </div>
            <button onClick={handleSearch} disabled={isLoading} className="w-full bg-[#2b998e] py-5 rounded-xl font-bold text-lg hover:bg-[#238278] transition-all flex items-center justify-center gap-3">
              {isLoading ? <Loader2 className="animate-spin" /> : <Search size={22} />} Find Nearby Contacts
            </button>
            {status && <div className="p-4 bg-slate-900/80 rounded-lg border border-slate-700 text-slate-400 text-xs font-mono">{status}</div>}
            {error && <div className="p-4 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg text-sm">{error}</div>}
          </div>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
            <h3 className="font-bold text-lg">Results <span className="text-[#2b998e] ml-2">{filteredContacts.length}</span></h3>
          </div>
          <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-16 text-center text-slate-600 font-medium italic"><p>No contacts found in this radius.</p></div>
            ) : (
              filteredContacts.map(contact => (
                <div key={contact.id} className="p-5 hover:bg-slate-700/40 transition-all flex justify-between items-center group">
                  <div>
                    <h4 className="font-bold text-white text-lg group-hover:text-[#2b998e] transition-colors">{contact.firstName} {contact.lastName}</h4>
                    <p className="text-sm text-slate-400">{contact.address1}</p>
                    <p className="text-xs text-slate-500 mt-1">{contact.city}, {contact.state}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-3xl font-black text-[#2b998e]">{contact.distance}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Miles Away</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest font-bold">EdgeDMS • Radius Logic v1.2</p>
      </div>
    </div>
  );
}

// --- MAIN APP (The Router) ---
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ghl_token');
    setIsAuthenticated(!!token);
    setIsCheckingAuth(false);
  }, []);

  const handleLogin = () => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: import.meta.env.VITE_GHL_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_REDIRECT_URI,
      scope: 'contacts.readonly contacts.write locations.readonly'
    });
    window.location.href = `https://marketplace.leadconnectorhq.com/oauth/chooselocation?${params.toString()}`;
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  if (isCheckingAuth) return <div className="min-h-screen bg-slate-900" />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Dashboard onLogout={handleLogout} /> : <LandingPage onGetStarted={handleLogin} />} />
        <Route path="/callback" element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}