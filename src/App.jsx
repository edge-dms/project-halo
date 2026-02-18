import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { 
  Search, MapPin, Database, Loader2, LogOut, 
  Navigation, Phone, MessageSquare, Send, Pause, Play, 
  SlidersHorizontal, X 
} from 'lucide-react';
import LandingPage from './components/LandingPage';

// --- HELPER: MATH FOR RADIUS CALCULATION ---
// Calculates distance between two coordinates in miles
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
// Handles the redirect from HighLevel login
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
        
        // Save tokens to browser storage
        localStorage.setItem('ghl_token', data.access_token);
        localStorage.setItem('ghl_location_id', data.locationId);
        if (data.refresh_token) {
          localStorage.setItem('ghl_refresh_token', data.refresh_token);
        }
        
        window.location.href = '/'; 
      } catch (err) {
        console.error(err);
        setStatus('Error connecting. Please try again.');
      }
    }
    exchangeCode();
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white px-4">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-[#2b998e] mx-auto" />
        <h2 className="text-xl font-bold">{status}</h2>
      </div>
    </div>
  );
}

// --- COMPONENT: MAIN DASHBOARD ---
function Dashboard({ onLogout }) {
  // --- STATE MANAGEMENT ---
  const [contacts, setContacts] = useState([]);
  if (import.meta.env.DEV) window.contacts = contacts;
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [centerAddress, setCenterAddress] = useState('');
  const [radius, setRadius] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  
  // Pause/Resume Logic
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const pausedAtRef = useRef(0);
  
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  
  // Progress Bar State
  const [geoProgress, setGeoProgress] = useState(0); 
  const [geoCount, setGeoCount] = useState({ current: 0, total: 0 });
  
  const [nameFilter, setNameFilter] = useState('');
  const [sortBy, setSortBy] = useState('distance');
  const [geocoderOpen, setGeocoderOpen] = useState(false);

  // Recent Searches (Persisted)
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem('recent_searches');
    return saved ? JSON.parse(saved) : [];
  });

  // --- CRITICAL CONFIG: FIELD IDs ---
  // Verified IDs from your screenshots (using root ID, no suffix)
  // ✅ CORRECT (Found in your console scan)
  const LAT_KEY = 'HZ3a5NDSTgp1YqWMf2zL'; 
  const LNG_KEY = '35gNK2RBej8dduGBJ64T';
  
  // Metric Keys (Optional - for sorting)
  const LIFETIME_VAL_KEY = 'contact.lifetime_value'; 
  const ORDER_DATE_KEY = 'contact.last_order_date';

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

  // --- HELPERS ---
  
  // The "Sanitizer" - Strips dollar signs/text to return pure numbers
  const getCustomValue = (contact, identifier) => {
    const field = contact.customFields?.find(f => f.key === identifier || f.id === identifier);
    if (!field || field.value === undefined || field.value === null) return null;
    
    // Convert to string and strip non-numeric characters (allows decimals & negatives)
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
    const encoded = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    const resp = await fetch(url);
    const data = await resp.json();
    return data.features?.length > 0 
      ? { lat: data.features[0].center[1], lng: data.features[0].center[0] } 
      : null;
  };

  const fetchContacts = async () => {
    const token = localStorage.getItem('ghl_token');
    const locationId = localStorage.getItem('ghl_location_id');
    
    if (!token || !locationId) {
      setError("Not authenticated. Please log in again.");
      return;
    }

    setIsLoading(true);
    setStatus('Syncing HighLevel Contacts...');

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

  const geocodeAllContacts = async (startIndex = 0) => {
    // UNLEASHED: Filter out contacts that already have a Latitude value
    // This allows you to run the full database without wasting credits on done records
    const targets = contacts.filter(c => c.address1 && !getCustomValue(c, LAT_KEY));
    const total = targets.length;

    if (total === 0) {
      setStatus("All contacts with addresses are already geocoded!");
      setIsLoading(false);
      return;
    }

    setStatus(`Geocoding ${total} contacts...`);
    setError('');
    setIsLoading(true);
    setIsPaused(false);
    isPausedRef.current = false;

    let successCount = 0;
    let failCount = 0;

    for (let i = startIndex; i < total; i++) {
      // PAUSE CHECK
      if (isPausedRef.current) {
        pausedAtRef.current = i;
        setStatus(`Paused at ${i + 1}/${total} — ${successCount} sent so far.`);
        setIsLoading(false);
        return; 
      }

      const c = targets[i];
      const addr = `${c.address1}, ${c.city || ''} ${c.state || ''}`.trim();
      
      try {
        const coords = await geocodeAddress(addr);

        if (coords) {
          // Send to Netlify Proxy (Bypasses CORS issues)
          const response = await fetch('/.netlify/functions/send-webhook', {
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

          if (response.ok) {
            successCount++;
            console.log(`✓ Sent: ${c.firstName} ${c.lastName}`);
          } else {
            failCount++;
            console.error(`✗ Failed for ${c.firstName}: ${response.statusText}`);
          }
        } else {
          failCount++;
          console.warn(`No coords found for: ${addr}`);
        }

        // Update UI & Throttle slightly
        setStatus(`Geocoding... ${i + 1}/${total} — ${successCount} sent`);
        await new Promise(r => setTimeout(r, 300));

      } catch (err) { 
        failCount++;
        console.error('Geocode/Webhook Error:', err); 
      }
      
      setGeoCount({ current: i + 1, total });
      setGeoProgress(Math.round(((i + 1) / total) * 100));
    }
    
    pausedAtRef.current = 0;
    setStatus(`✓ Run Complete: ${successCount} geocoded. Refreshing data...`);
    
    // Wait for GHL to process, then reload contacts
    await new Promise(r => setTimeout(r, 4000));
    fetchContacts();
    setIsLoading(false);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return setError("GPS not supported.");
    setError('');
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
    }, (err) => {
      console.error("Geolocation error:", err);
      setError("Location access denied. Enter an address manually.");
      setIsLoading(false);
    });
  };

  const handleSearch = async () => {
    setError('');
    if (!centerAddress) return setError("Enter an address.");
    setIsLoading(true);
    const coords = await geocodeAddress(centerAddress);
    if (coords) {
      addToHistory(centerAddress, radius, sortBy);
      filterContactsByRadius(coords.lat, coords.lng);
    } else {
      setError("Location not found. Try a more specific address.");
      setIsLoading(false);
    }
  };

  const filterContactsByRadius = (centerLat, centerLon) => {
    // Debugging logs to verify keys
    console.log('--- SEARCH DEBUG ---');
    console.log(`Center: ${centerLat}, ${centerLon} | Radius: ${radius}`);
    console.log(`LAT_KEY: ${LAT_KEY} | LNG_KEY: ${LNG_KEY}`);

    let withCoords = 0;
    let results = contacts.map(c => {
      const lat = getCustomValue(c, LAT_KEY);
      const lng = getCustomValue(c, LNG_KEY);
      
      if (lat && lng) withCoords++;
      if (!lat || !lng) return null;
      
      const dist = getDistanceFromLatLonInMiles(centerLat, centerLon, parseFloat(lat), parseFloat(lng));
      return { ...c, distance: parseFloat(dist.toFixed(1)) };
    }).filter(c => c && c.distance <= radius);

    console.log(`Contacts with Coords found: ${withCoords}`);
    console.log(`Results within radius: ${results.length}`);

    // Sorting Logic
    results.sort((a, b) => {
      if (sortBy === 'distance') return a.distance - b.distance;
      const valA = getCustomValue(a, sortBy);
      const valB = getCustomValue(b, sortBy);
      if (sortBy === LIFETIME_VAL_KEY) return (parseFloat(valB) || 0) - (parseFloat(valA) || 0);
      return new Date(valB || 0) - new Date(valA || 0);
    });

    setFilteredContacts(results);
    setIsLoading(false);
  };

  // WEBHOOK ACTIONS (Call/SMS)
  const handleGHLAction = async (contact, actionType) => {
    // NOTE: Replace these with your actual Workflow Webhook URLs if different from the Geocoder
    // For now, these are placeholders.
    alert(`Triggering ${actionType.toUpperCase()} for ${contact.firstName}... (Feature pending Workflow setup)`);
  };

  useEffect(() => { fetchContacts(); }, []);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-3 md:p-8 pb-8">
      <div className="max-w-4xl mx-auto space-y-4">
        
        {/* HEADER */}
        <div className="bg-slate-800 px-4 py-4 md:p-6 rounded-2xl shadow-xl border border-slate-700 flex justify-between items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
             <img src="/robot-mascot.png" alt="Edgar" className="h-10 w-auto md:h-16 flex-shrink-0 hover:scale-105 transition-transform" />
             <div className="min-w-0">
               <h1 className="text-base md:text-xl font-black text-white tracking-tighter leading-tight">EDGE<span className="text-[#2b998e]">LOCALIST</span></h1>
               <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px] md:max-w-none">{status || 'Ready'}</p>
             </div>
          </div>
          <button onClick={onLogout} className="flex-shrink-0 flex items-center gap-2 px-3 py-2 md:px-4 bg-slate-700 hover:bg-red-900/40 active:bg-red-900/60 rounded-xl text-sm transition-all">
            <LogOut size={16} /> <span className="hidden md:inline">Logout</span>
          </button>
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl text-sm flex justify-between items-start gap-3">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-white flex-shrink-0 p-1 -mt-0.5"><X size={16} /></button>
          </div>
        )}

        {/* BATCH TOOLS (GEOCODER) */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
          <button 
            onClick={() => setGeocoderOpen(o => !o)}
            className="w-full flex justify-between items-center px-4 py-4 md:px-6 md:pointer-events-none"
          >
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Database Geocoder {geoCount.total > 0 && <span className="ml-2 text-[#2b998e]">({geoCount.current}/{geoCount.total})</span>}
            </h3>
            <span className={`text-slate-500 text-xs transition-transform duration-200 md:hidden ${geocoderOpen ? 'rotate-180' : ''}`}>▼</span>
          </button>

          <div className={`px-4 pb-4 md:px-6 md:pb-6 space-y-4 ${geocoderOpen ? 'block' : 'hidden md:block'}`}>
            <div className="flex gap-2 justify-end">
              <button onClick={fetchContacts} className="text-xs text-slate-400 bg-slate-900 px-4 py-2.5 rounded-lg hover:bg-slate-700 active:bg-slate-600 transition-all">
                ↻ Refresh Contacts
              </button>
              <button 
                onClick={() => {
                  console.log("--- SCANNING FIELDS ---");
                  contacts.slice(0, 3).forEach(c => console.log(c.firstName, c.customFields));
                  console.log(`Configured LAT_KEY: ${LAT_KEY}`);
                  console.log(`Configured LNG_KEY: ${LNG_KEY}`);
                  alert("Check Console (F12) for Field Data");
                }}
                className="text-xs text-[#2b998e] bg-slate-900 px-4 py-2.5 rounded-lg hover:bg-[#2b998e] hover:text-white active:bg-[#238278] transition-all"
              >
                Scan Field IDs (F12)
              </button>
            </div>

            {geoProgress > 0 && (
              <div className="w-full bg-slate-900 rounded-full h-2">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${isPaused ? 'bg-yellow-500' : 'bg-[#2b998e]'}`} 
                  style={{ width: `${geoProgress}%` }} 
                />
              </div>
            )}
            
            {!isLoading && !isPaused ? (
              <button onClick={() => geocodeAllContacts(0)} className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 active:bg-slate-300 flex justify-center items-center gap-2 transition-all">
                <Database size={16} /> Geocode Database (All Records)
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                {isLoading && (
                  <button 
                    onClick={() => { isPausedRef.current = true; setIsPaused(true); }} 
                    className="flex-1 py-4 bg-yellow-600 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-yellow-700 active:bg-yellow-800 flex justify-center items-center gap-2 transition-all"
                  >
                    <Pause size={16} /> Pause Edgar
                  </button>
                )}
                {isPaused && (
                  <button 
                    onClick={() => { setIsPaused(false); isPausedRef.current = false; geocodeAllContacts(pausedAtRef.current); }} 
                    className="flex-1 py-4 bg-[#2b998e] text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-[#238278] active:bg-[#1d6e65] flex justify-center items-center gap-2 transition-all"
                  >
                    <Play size={16} /> Resume Edgar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* SEARCH ENGINE */}
        <div className="bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-700 space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Center Search</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={centerAddress} 
                  onChange={(e) => setCenterAddress(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter Start Address..." 
                  className="w-full text-base bg-slate-900 border border-slate-700 rounded-xl px-4 py-4 pr-14 outline-none focus:ring-2 focus:ring-[#2b998e] transition-all" 
                />
                <button onClick={handleUseMyLocation} className="absolute right-2 top-1/2 -translate-y-1/2 p-3 text-slate-400 hover:text-[#2b998e] active:text-[#2b998e] transition-colors">
                  <Navigation size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Radius</label>
              <div className="grid grid-cols-5 gap-2"> 
                {/* Updated Radius Options: 5, 10, 25, 50, 100 */}
                {[5, 10, 25, 50, 100].map(r => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className={`py-3 rounded-xl text-xs font-bold transition-all ${
                      radius === r
                        ? 'bg-[#2b998e] text-white'
                        : 'bg-slate-900 border border-slate-700 text-slate-400 hover:border-[#2b998e] active:bg-slate-700'
                    }`}
                  >
                    {r} mi
                  </button>
                ))}
              </div>
            </div>
          </div>

          {recentSearches.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {recentSearches.map((s, i) => (
                <button 
                  key={i} 
                  onClick={() => { setCenterAddress(s.address); setRadius(s.radius); setSortBy(s.sortBy || 'distance'); }} 
                  className="flex-shrink-0 text-xs bg-slate-900 border border-slate-700 px-3 py-2 rounded-full hover:border-[#2b998e] active:bg-slate-700 transition-all flex items-center gap-1.5 whitespace-nowrap"
                >
                  <MapPin size={11} className="text-[#2b998e]" /> {s.address.length > 28 ? s.address.slice(0, 28) + '…' : s.address}
                </button>
              ))}
            </div>
          )}

          <button onClick={handleSearch} disabled={isLoading} className="w-full bg-[#2b998e] py-4 rounded-xl font-bold text-base md:text-lg hover:bg-[#238278] active:bg-[#1d6e65] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <Loader2 className="animate-spin" size={22} /> : <Search size={22} />} Find Nearby Contacts
          </button>
        </div>

        {/* RESULTS SECTION */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
          <div className="p-4 md:p-6 border-b border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-base md:text-lg">Results <span className="text-[#2b998e]">{filteredContacts.length}</span></h3>
                <div className="relative">
                  <SlidersHorizontal size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#2b998e] pointer-events-none" />
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg pl-7 pr-3 py-2 text-sm text-[#2b998e] outline-none focus:ring-2 focus:ring-[#2b998e] appearance-none">
                    <option value="distance">Nearest</option>
                    <option value={LIFETIME_VAL_KEY}>Lifetime $</option>
                    <option value={ORDER_DATE_KEY}>Last Order</option>
                  </select>
                </div>
              </div>
              <input type="search" placeholder="Filter names..." className="w-full sm:w-48 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-base sm:text-sm outline-none focus:ring-2 focus:ring-[#2b998e]" onChange={(e) => setNameFilter(e.target.value)} />
            </div>
          </div>

          <div className="divide-y divide-slate-700 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 420px)', minHeight: '120px' }}>
            {filteredContacts.length === 0 && (
              <div className="p-10 text-center text-slate-500 text-sm">
                No contacts found. Run a search to see results here.
              </div>
            )}
            {filteredContacts.filter(c => `${c.firstName} ${c.lastName}`.toLowerCase().includes(nameFilter.toLowerCase())).map(contact => (
              <div key={contact.id} className="p-4 md:p-5 hover:bg-slate-700/40 active:bg-slate-700/60 transition-all">
                <div className="flex justify-between items-start mb-3 gap-3">
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-base md:text-lg leading-tight truncate">{contact.firstName} {contact.lastName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{contact.address1}, {contact.city}</p>
                    {sortBy !== 'distance' && (
                      <p className="text-xs text-[#2b998e] mt-1 font-mono uppercase">
                        {sortBy.split('.').pop()}: {getCustomValue(contact, sortBy)}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="block text-2xl font-black text-[#2b998e] leading-none">{contact.distance}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Miles</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <a href={`tel:${contact.phone}`} className="flex items-center justify-center gap-2 py-3 bg-slate-900 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-blue-600 active:bg-blue-700 transition-colors">
                    <Phone size={14}/> Call
                  </a>
                  <button onClick={() => handleGHLAction(contact, 'call')} className="flex items-center justify-center gap-2 py-3 bg-slate-900 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-teal-600 active:bg-teal-700 transition-colors">
                    <Phone size={14}/> GHL Call
                  </button>
                  <a href={`sms:${contact.phone}`} className="flex items-center justify-center gap-2 py-3 bg-slate-900 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-indigo-600 active:bg-indigo-700 transition-colors">
                    <MessageSquare size={14}/> SMS
                  </a>
                  <button onClick={() => handleGHLAction(contact, 'sms')} className="flex items-center justify-center gap-2 py-3 bg-slate-900 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-purple-600 active:bg-purple-700 transition-colors">
                    <Send size={14}/> GHL SMS
                  </button>
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

  const handleLogout = () => {
    localStorage.removeItem('ghl_token');
    localStorage.removeItem('ghl_location_id');
    localStorage.removeItem('ghl_refresh_token');
    localStorage.removeItem('recent_searches');
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