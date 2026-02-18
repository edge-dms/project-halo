import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { 
  Search, MapPin, Database, Loader2, LogOut, 
  Navigation, Phone, MessageSquare, Send, Pause, Play 
} from 'lucide-react';
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
      </div>
    </div>
  );
}

// --- COMPONENT: DASHBOARD ---
function Dashboard({ onLogout }) {
  // --- STATE MANAGEMENT ---
  const [contacts, setContacts] = useState([]); 
  window.contacts = contacts; // <--- This unlocks the data for the Console
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [centerAddress, setCenterAddress] = useState('');
  const [radius, setRadius] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  
  // --- THE MISSING PIECE (Fixed Crash) ---
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false); 
  
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  
  const [geoProgress, setGeoProgress] = useState(0); 
  const [geoCount, setGeoCount] = useState({ current: 0, total: 0 });
  
  const [nameFilter, setNameFilter] = useState('');
  const [sortBy, setSortBy] = useState('distance');

  // Persistence: Recent Searches
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('recent_searches');
    return saved ? JSON.parse(saved) : [];
  });

  // --- CONFIG: FIELD IDs ---
  // USE THE "SCAN FIELD IDs" BUTTON IN THE APP TO FIND THESE!
  // REPLACE THESE PLACEHOLDERS WITH YOUR ACTUAL LONG ID STRINGS
  const LAT_KEY = 'contact.custom_lat'; 
  const LNG_KEY = 'contact.custom_lng';
  
  const LIFETIME_VAL_KEY = 'contact.lifetime_value'; 
  const ORDER_DATE_KEY = 'contact.last_order_date';

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  // --- HELPERS ---
  
  // The "Sanitizer" - Strips dollar signs ($) so math works
  const getCustomValue = (contact, identifier) => {
    // Check both Key and ID
    const field = contact.customFields?.find(f => f.key === identifier || f.id === identifier);
    if (!field || !field.value) return null;
    // Remove anything that isn't a number, decimal, or minus sign
    return field.value.toString().replace(/[^\d.-]/g, '');
  };

  const addToHistory = (address, searchRadius, currentSort) => {
    const newSearch = { address, radius: searchRadius, sortBy: currentSort, timestamp: Date.now() };
    const updated = [newSearch, ...recentSearches.filter(s => s.address !== address)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent_searches', JSON.stringify(updated));
  };

  // --- API ACTIONS ---
  const geocodeAddress = async (address) => {
    const url = `https://services.leadconnectorhq.com/hooks/hXcSSA35KVSLC2674wFT/webhook-trigger/02dc931c-4313-44a4-89b7-a8435c4b8889`;
    const resp = await fetch(url);
    const data = await resp.json();
    return data.features?.length > 0 ? { lat: data.features[0].center[1], lng: data.features[0].center[0] } : null;
  };

  const fetchContacts = async () => {
    setIsLoading(true);
    setStatus('Syncing HighLevel Contacts...');
    const token = localStorage.getItem('ghl_token');
    const locationId = localStorage.getItem('ghl_location_id');

    try {
      let allContacts = [];
      let nextUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=100`;
      let hasMore = true;

      while (hasMore) {
        const response = await fetch(nextUrl, {
          headers: { 'Authorization': `Bearer ${token}`, 'Version': '2021-07-28' }
        });
        const data = await response.json();
        const batch = data.contacts || [];
        allContacts = [...allContacts, ...batch];
        
        if (data.meta?.nextPageUrl && batch.length === 100) {
          nextUrl = data.meta.nextPageUrl;
        } else {
          hasMore = false;
        }
        setStatus(`Syncing... (${allContacts.length} loaded)`);
      }
      setContacts(allContacts);
      setStatus(`Ready: ${allContacts.length} contacts synced.`);
    } catch (err) { 
      setError("Sync failed. Check token."); 
      console.error(err);
    } finally { 
      setIsLoading(false); 
    }
  };

 // --- WEBHOOK VERSION (Paste this over the old geocodeAllContacts) ---
  const geocodeAllContacts = async () => {
    // ⚠️ PASTE YOUR WEBHOOK URL HERE ⚠️
    const WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/hXcSSA35KVSLC2674wFT/webhook-trigger/d1473715-1d82-4389-9edf-b7bc69446b8d'; 
    
    // Filter contacts: Must have address, but NO Latitude yet
    const targets = contacts.filter(c => c.address1 && !getCustomValue(c, LAT_KEY));
    const total = targets.length;
    
    if (total === 0) return setStatus("Already fully geocoded!");

    setIsLoading(true);
    setIsPaused(false);
    isPausedRef.current = false;

    for (let i = 0; i < total; i++) {
      // PAUSE CHECK
      if (isPausedRef.current) {
        setStatus(`Paused at ${i} of ${total}`);
        setIsLoading(false);
        return; 
      }

      const c = targets[i];
      const addr = `${c.address1}, ${c.city || ''} ${c.state || ''}`;
      
      try {
        const coords = await geocodeAddress(addr);
        if (coords) {
          // SEND TO WEBHOOK
          // We send the raw numbers. Your GHL Workflow will map them to the fields.
          await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contact_id: c.id,
              name: `${c.firstName} ${c.lastName}`,
              email: c.email,
              phone: c.phone,
              address: addr,
              latitude: coords.lat,
              longitude: coords.lng
            })
          });
        }
        // A slightly longer delay (250ms) is better for Webhooks to prevent skipping
        await new Promise(r => setTimeout(r, 250));
      } catch (err) { 
        console.error("Webhook Error:", err); 
      }
      
      setGeoCount({ current: i + 1, total });
      setGeoProgress(Math.round(((i + 1) / total) * 100));
    }
    
    setIsLoading(false);
    setStatus("Batch sent to Webhook! Check GHL Automation.");
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return setError("GPS not supported.");
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.features?.[0]) {
        setCenterAddress(data.features[0].place_name);
        filterContactsByRadius(latitude, longitude);
      }
      setIsLoading(false);
    });
  };

  const handleSearch = async () => {
    if (!centerAddress) return setError("Enter an address.");
    setIsLoading(true);
    const coords = await geocodeAddress(centerAddress);
    if (coords) {
      addToHistory(centerAddress, radius, sortBy);
      filterContactsByRadius(coords.lat, coords.lng);
    } else {
      setError("Location not found.");
      setIsLoading(false);
    }
  };

  const filterContactsByRadius = (centerLat, centerLon) => {
    let results = contacts.map(c => {
      // Use the Sanitizer to handle dollar signs or text
      const lat = getCustomValue(c, LAT_KEY);
      const lng = getCustomValue(c, LNG_KEY);
      
      if (!lat || !lng) return null;
      
      const dist = getDistanceFromLatLonInMiles(centerLat, centerLon, parseFloat(lat), parseFloat(lng));
      return { ...c, distance: parseFloat(dist.toFixed(1)) };
    }).filter(c => c && c.distance <= radius);

    results.sort((a, b) => {
      if (sortBy === 'distance') return a.distance - b.distance;
      
      const valA = getCustomValue(a, sortBy);
      const valB = getCustomValue(b, sortBy);
      
      // Sort numbers descending, dates descending
      if (sortBy === LIFETIME_VAL_KEY) return (parseFloat(valB) || 0) - (parseFloat(valA) || 0);
      return new Date(valB || 0) - new Date(valA || 0);
    });

    setFilteredContacts(results);
    setIsLoading(false);
  };

  useEffect(() => { fetchContacts(); }, []);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-4">
             <img src="/robot-mascot.png" alt="Edgar" className="h-16 w-auto hover:scale-105 transition-transform" />
             <div>
               <h1 className="text-xl font-black text-white tracking-tighter">EDGE<span className="text-[#2b998e]">LOCALIST</span></h1>
               <p className="text-[10px] text-slate-400 font-mono">{status}</p>
             </div>
          </div>
          <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-red-900/40 rounded-lg text-sm transition-all"><LogOut size={16} /> Logout</button>
        </div>

        {/* BATCH TOOLS */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Database Geocoder {geoCount.total > 0 && `(${geoCount.current}/${geoCount.total})`}
            </h3>
            <button 
              onClick={() => {
                console.log("--- SCANNING FIELDS ---");
                console.table(contacts[0]?.customFields?.map(f => ({ Name: f.key, ID: f.id, Value: f.value })));
                alert("Check your Browser Console (F12) for the ID Table!");
              }}
              className="text-[10px] text-[#2b998e] bg-slate-900 px-3 py-1 rounded hover:bg-[#2b998e] hover:text-white transition-all"
            >
              Scan Field IDs (F12)
            </button>
          </div>

          {geoProgress > 0 && (
            <div className="w-full bg-slate-900 rounded-full h-2 mb-4">
              <div 
                className={`h-full rounded-full transition-all ${isPaused ? 'bg-yellow-500' : 'bg-[#2b998e]'}`} 
                style={{ width: `${geoProgress}%` }} 
              />
            </div>
          )}
          
          <div className="flex gap-2">
            {!isLoading && !isPaused ? (
              <button onClick={geocodeAllContacts} className="flex-1 py-4 bg-white text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 flex justify-center gap-2">
                <Database size={16} /> Geocode Database
              </button>
            ) : (
              <>
                {isLoading && (
                  <button 
                    onClick={() => { isPausedRef.current = true; setIsPaused(true); }} 
                    className="flex-1 py-4 bg-yellow-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-700 flex justify-center gap-2"
                  >
                    <Pause size={16} /> Pause Edgar
                  </button>
                )}
                {isPaused && (
                  <button 
                    onClick={() => { setIsPaused(false); isPausedRef.current = false; geocodeAllContacts(); }} 
                    className="flex-1 py-4 bg-[#2b998e] text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#238278] flex justify-center gap-2"
                  >
                    <Play size={16} /> Resume Edgar
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* SEARCH ENGINE */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2 relative">
              <label className="text-xs font-bold text-slate-400 uppercase">Center Search</label>
              <div className="relative">
                <input type="text" value={centerAddress} onChange={(e) => setCenterAddress(e.target.value)} placeholder="Enter Start Address..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 pr-12 outline-none focus:ring-2 focus:ring-[#2b998e]" />
                <button onClick={handleUseMyLocation} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-[#2b998e]"><Navigation size={20} /></button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase">Radius</label>
              <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 outline-none focus:ring-2 focus:ring-[#2b998e]">
                <option value={10}>10 Miles</option><option value={25}>25 Miles</option><option value={50}>50 Miles</option>
              </select>
            </div>
          </div>

          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((s, i) => (
                <button key={i} onClick={() => { setCenterAddress(s.address); setRadius(s.radius); setSortBy(s.sortBy || 'distance'); }} className="text-[10px] bg-slate-900 border border-slate-700 px-3 py-1 rounded-full hover:border-[#2b998e] transition-all flex items-center gap-1"><MapPin size={10} /> {s.address}</button>
              ))}
            </div>
          )}

          <button onClick={handleSearch} disabled={isLoading} className="w-full bg-[#2b998e] py-5 rounded-xl font-bold text-lg hover:bg-[#238278] transition-all flex items-center justify-center gap-3">
            {isLoading ? <Loader2 className="animate-spin" /> : <Search size={22} />} Find Nearby Contacts
          </button>
        </div>

        {/* RESULTS SECTION */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-700 flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="font-bold text-lg">Results <span className="text-[#2b998e]">{filteredContacts.length}</span></h3>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-[#2b998e] outline-none">
                <option value="distance">Nearest</option>
                <option value={LIFETIME_VAL_KEY}>Lifetime $</option>
                <option value={ORDER_DATE_KEY}>Last Order</option>
              </select>
            </div>
            <input type="text" placeholder="Filter names..." className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-1 text-xs outline-none" onChange={(e) => setNameFilter(e.target.value)} />
          </div>

          <div className="divide-y divide-slate-700 max-h-[600px] overflow-y-auto">
            {filteredContacts.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(nameFilter.toLowerCase())).map(contact => (
              <div key={contact.id} className="p-5 hover:bg-slate-700/40 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-white text-lg">{contact.firstName} {contact.lastName}</h4>
                    <p className="text-xs text-slate-400">{contact.address1}, {contact.city}</p>
                    <p className="text-[10px] text-[#2b998e] mt-1 font-mono uppercase">{sortBy !== 'distance' ? `${sortBy.split('.').pop()}: ${getCustomValue(contact, sortBy)}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-black text-[#2b998e]">{contact.distance}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Miles</span>
                  </div>
                </div>
                
                {/* ACTION GRID */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <a href={`tel:${contact.phone}`} className="flex items-center justify-center gap-1 py-2 bg-slate-900 rounded-lg text-[9px] font-bold uppercase hover:bg-blue-600"><Phone size={12}/> Personal Call</a>
                  <button className="flex items-center justify-center gap-1 py-2 bg-slate-900 rounded-lg text-[9px] font-bold uppercase hover:bg-teal-600"><Phone size={12}/> GHL Call</button>
                  <a href={`sms:${contact.phone}`} className="flex items-center justify-center gap-1 py-2 bg-slate-900 rounded-lg text-[9px] font-bold uppercase hover:bg-indigo-600"><MessageSquare size={12}/> Personal SMS</a>
                  <button className="flex items-center justify-center gap-1 py-2 bg-slate-900 rounded-lg text-[9px] font-bold uppercase hover:bg-purple-600"><Send size={12}/> GHL SMS</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP ---
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

  if (isCheckingAuth) return <div className="min-h-screen bg-slate-900" />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={isAuthenticated ? <Dashboard onLogout={() => { localStorage.clear(); window.location.href = '/'; }} /> : <LandingPage onGetStarted={handleLogin} />} />
        <Route path="/callback" element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}
