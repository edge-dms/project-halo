import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Navigation, Database, Loader2, LogOut } from 'lucide-react';
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
  return R * c; // Distance in miles
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
        
        // Save the real access token and location ID
        localStorage.setItem('ghl_token', data.access_token);
        localStorage.setItem('ghl_location_id', data.locationId);
        
        window.location.href = '/'; // Go to dashboard
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

// --- COMPONENT: DASHBOARD (The Main App) ---
function Dashboard({ onLogout }) {
  // UI State
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [centerAddress, setCenterAddress] = useState('');
  const [radius, setRadius] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showBatchTools, setShowBatchTools] = useState(true);

  // 1. Fetch Contacts from HighLevel
  const fetchContacts = async () => {
    setIsLoading(true);
    setStatus('Connecting to HighLevel API...');
    setError('');
    
    const token = localStorage.getItem('ghl_token');
    const locationId = localStorage.getItem('ghl_location_id');

    if (!token || !locationId) {
      setError('Missing authentication. Please log in again.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28', 
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data.contacts || []);
      setStatus(`Successfully loaded ${data.contacts?.length || 0} real contacts.`);
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(`API Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Geocode ALL Contacts (The Batch Tool)
  const geocodeAllContacts = async () => {
    setIsLoading(true);
    setStatus('Scanning CRM for contacts needing geocoding...');
    
    const token = localStorage.getItem('ghl_token');
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    
    const LAT_KEY = 'contact.custom_lat'; 
    const LNG_KEY = 'contact.custom_lng';

    // Identify contacts that have an address but NO Latitude coordinates yet
    const targets = contacts.filter(c => {
      const latVal = c.customFields?.find(f => f.id === LAT_KEY || f.key === LAT_KEY)?.value;
      return c.address && (!latVal || latVal === "");
    });

    if (targets.length === 0) {
      setStatus('All current contacts have coordinates!');
      setIsLoading(false);
      return;
    }

    let updated = 0;
    for (const contact of targets) {
      try {
        setStatus(`Geocoding (${updated + 1}/${targets.length}): ${contact.name}...`);
        
        const mapboxResp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(contact.address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`
        );
        const mapboxData = await mapboxResp.json();

        if (mapboxData.features?.length > 0) {
          const [lng, lat] = mapboxData.features[0].center;

          await fetch(`https://services.leadconnectorhq.com/contacts/${contact.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Version': '2021-07-28',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              customFields: [
                { key: LAT_KEY, value: lat.toString() },
                { key: LNG_KEY, value: lng.toString() }
              ]
            })
          });
          updated++;
        }
        await new Promise(r => setTimeout(r, 100)); // Rate limit safety
      } catch (err) {
        console.error(`Failed on ${contact.name}:`, err);
      }
    }

    setStatus(`Success: Geocoded ${updated} contacts.`);
    setIsLoading(false);
    fetchContacts(); 
  };

  // 3. Handle the Radius Search (Single Address)
  const handleSearch = async () => {
    if (!centerAddress) {
      setError("Please enter a center address or zip code.");
      return;
    }

    setIsLoading(true);
    setStatus(`Geocoding center point: ${centerAddress}...`);
    setError('');

    try {
      // Use Nominatim for the center point search (free)
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(centerAddress)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const centerLat = parseFloat(data[0].lat);
        const centerLon = parseFloat(data[0].lon);
        
        setStatus('Filtering contacts by radius...');
        filterContactsByRadius(centerLat, centerLon);
      } else {
        setError("Could not find coordinates for that address.");
        setIsLoading(false);
      }
    } catch (err) {
      setError("Geocoding failed. " + err.message);
      setIsLoading(false);
    }
  };

  // 4. Filter Logic (Uses the Custom Fields)
  const filterContactsByRadius = (centerLat, centerLon) => {
    const LAT_KEY = 'contact.custom_lat'; 
    const LNG_KEY = 'contact.custom_lng';

    const results = contacts.map(contact => {
      const latValue = contact.customFields?.find(f => f.id === LAT_KEY || f.key === LAT_KEY)?.value;
      const lngValue = contact.customFields?.find(f => f.id === LNG_KEY || f.key === LNG_KEY)?.value;

      if (!latValue || !lngValue) return null;

      const distance = getDistanceFromLatLonInMiles(
        centerLat, 
        centerLon, 
        parseFloat(latValue), 
        parseFloat(lngValue)
      );
      
      return { ...contact, distance: distance.toFixed(1) };
    }).filter(c => c !== null && parseFloat(c.distance) <= radius);

    results.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

    setFilteredContacts(results);
    setStatus(`Found ${results.length} contacts within ${radius} miles.`);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-[#2b998e] p-2 rounded-lg">
                <MapPin className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">EdgeLocalist</h1>
                <p className="text-slate-400 text-sm">Radius Search & Geocoding</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
            >
              <LogOut size={16} /> Log Out
            </button>
          </div>

          {/* BATCH TOOLS SECTION - ADDED BACK IN */}
          {showBatchTools && (
             <div className="pt-4 border-t border-slate-700 flex flex-col gap-3">
               <div className="flex items-center justify-between text-sm">
                 <span className="text-slate-400 font-medium flex items-center gap-2">
                   <Database size={16} /> Database Tools
                 </span>
                 <button 
                   onClick={() => setShowBatchTools(false)}
                   className="text-xs text-[#2b998e] hover:underline"
                 >
                   Hide
                 </button>
               </div>
               
               <div className="bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-600 flex items-center justify-between">
                 <p className="text-xs text-slate-400 max-w-md">
                   Scan your {contacts.length} contacts to find and save GPS coordinates. 
                   Required for "Nearby" search.
                 </p>
                 <button
                   onClick={geocodeAllContacts}
                   disabled={isLoading}
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                 >
                   {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Navigation size={14} />}
                   Run Geocoder
                 </button>
               </div>
             </div>
          )}
        </div>

        {/* Search Panel */}
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-700 space-y-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Search className="text-[#2b998e]" /> Search Parameters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-slate-300">Center Address or Zip</label>
              <input
                type="text"
                value={centerAddress}
                onChange={(e) => setCenterAddress(e.target.value)}
                placeholder="e.g. 123 Main St, New York, NY"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2b998e] focus:border-transparent outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Radius (Miles)</label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#2b998e] outline-none"
              >
                <option value={5}>5 miles</option>
                <option value={10}>10 miles</option>
                <option value={25}>25 miles</option>
                <option value={50}>50 miles</option>
                <option value={100}>100 miles</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full bg-[#2b998e] hover:bg-[#238278] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#2b998e]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : <Search size={20} />}
            {isLoading ? 'Processing...' : 'Search Contacts'}
          </button>

          {/* Status Messages */}
          {status && (
            <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700 text-slate-300 text-sm flex items-center gap-2">
              <Database size={14} /> {status}
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Results List */}
        <div className="bg-slate-800 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <h3 className="font-bold text-lg">Results ({filteredContacts.length})</h3>
            <span className="text-xs text-slate-500 bg-slate-900 px-3 py-1 rounded-full">
              Sorted by Distance
            </span>
          </div>
          
          <div className="divide-y divide-slate-700 max-h-[500px] overflow-y-auto">
            {filteredContacts.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No contacts found in this area.</p>
                <p className="text-xs mt-1">Try increasing the radius or checking your contact addresses.</p>
              </div>
            ) : (
              filteredContacts.map(contact => (
                <div key={contact.id} className="p-4 hover:bg-slate-700/50 transition-colors flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white">{contact.name}</h4>
                    <p className="text-sm text-slate-400">{contact.address}</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-bold text-[#2b998e]">{contact.distance}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">Miles</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="text-center text-xs text-slate-600 py-4">
          Powered by EdgeDMS • Built By Reps, For Reps
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP (The Router) ---
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    // Check local storage for the "token" we set in OAuthCallback
    const token = localStorage.getItem('ghl_token');
    setIsAuthenticated(!!token);
    setIsCheckingAuth(false);
  }, []);

  const handleLogin = () => {
    // We switch to the newer, more direct OAuth entry point
    const GHL_AUTH_URL = 'https://app.gohighlevel.com/oauth/chooselocation'; 
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: import.meta.env.VITE_GHL_CLIENT_ID,
      redirect_uri: import.meta.env.VITE_REDIRECT_URI,
      scope: 'contacts.readonly contacts.write locations.readonly'
    });
    window.location.href = `${GHL_AUTH_URL}?${params.toString()}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('ghl_token');
    setIsAuthenticated(false);
    window.location.href = '/';
  };

  if (isCheckingAuth) {
    return <div className="min-h-screen bg-[#0f172a]" />; // Prevent flash of landing page
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Dashboard onLogout={handleLogout} /> 
            ) : (
              <LandingPage onGetStarted={handleLogin} />
            )
          } 
        />
        <Route path="/callback" element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}