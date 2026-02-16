import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useGHLContext } from './hooks/useGHLContext';
import { useGeoLocation } from './hooks/useGeoLocation';
import { useNearbyContacts } from './hooks/useNearbyContacts';
import { ghlService } from './services/ghlApi';
import { AnchorSearch } from './components/AnchorSearch';
import { GeocodeBatchProcessor } from './components/GeocodeBatchProcessor';
import OAuthCallback from './components/OAuthCallback';
import LandingPage from './components/LandingPage'; // Import the new component
import { 
  MapPin, Phone, MessageSquare, Navigation, 
  Search, Filter, ChevronDown, RefreshCw, AlertTriangle 
} from 'lucide-react';

// --- SUB-COMPONENT: The Main App Logic ---
function RadiusSearchApp() {
  const { locationId, isLoading: isGhlLoading } = useGHLContext();
  const geo = useGeoLocation();

  // State Management
  const [anchorCoords, setAnchorCoords] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [radius, setRadius] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBatchTools, setShowBatchTools] = useState(false);

  // Configuration Constants
  const CUSTOM_FIELD_IDS = { lat: "contact.custom_lat", lng: "contact.custom_lng" };
  const searchPoint = anchorCoords || geo.coordinates;

  // Custom Hook for filtering contacts
  const nearbyContacts = useNearbyContacts(
    { loaded: !!searchPoint?.lat, coordinates: searchPoint }, 
    contacts, 
    radius, 
    CUSTOM_FIELD_IDS
  );

  // Data Loading (OAuth Aware)
  const loadData = async () => {
    const token = localStorage.getItem('ghl_token');
    
    // Only fetch if we have a Location ID and a valid OAuth Token
    if (!locationId || !token) return;

    setIsSyncing(true);
    try {
      const response = await ghlService.getContacts(locationId, token);
      setContacts(response.contacts || []);
    } catch (err) {
      console.error("Failed to load contacts:", err);
      // Optional: Auto-logout if token is invalid
      if (err.message.includes("401") || err.message.includes("Token")) {
        handleLogout();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Initial Load
  useEffect(() => {
    loadData();
  }, [locationId]);

  // --- OAuth Handlers ---

  const handleConnect = () => {
    function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* If user is NOT logged in, show LandingPage. If logged in, show App */}
        <Route 
          path="/" 
          element={
            localStorage.getItem('ghl_token') 
              ? <RadiusSearchApp /> 
              : <LandingPage onGetStarted={() => {
                  // Direct trigger of the OAuth flow
                  const GHL_AUTH_URL = 'https://app.gohighlevel.com/oauth/chooselocation';
                  const params = new URLSearchParams({
                    response_type: 'code',
                    client_id: import.meta.env.VITE_GHL_CLIENT_ID,
                    redirect_uri: import.meta.env.VITE_REDIRECT_URI,
                    scope: 'contacts.readonly contacts.write locations.readonly'
                  });
                  window.location.href = `${GHL_AUTH_URL}?${params.toString()}`;
                }} />
          } 
        />
        <Route path="/callback" element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}const GHL_AUTH_URL = 'https://app.gohighlevel.com/oauth/chooselocation';
    const params = new URLSearchParams();
    
    params.append('response_type', 'code');
    params.append('client_id', import.meta.env.VITE_GHL_CLIENT_ID);
    params.append('redirect_uri', import.meta.env.VITE_REDIRECT_URI);
    params.append('scope', 'contacts.readonly contacts.write locations.readonly');

    const fullUrl = `${GHL_AUTH_URL}?${params.toString()}`;
    console.log("🚀 Launching OAuth flow to:", fullUrl);
    window.location.href = fullUrl;
  };

  const handleLogout = () => {
    localStorage.removeItem('ghl_token');
    localStorage.removeItem('ghl_location_id');
    window.location.reload();
  };

  // Loading State
  if (isGhlLoading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-[#2b998e]">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2b998e]"></div>
        <p>Loading EdgeLocalist...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#2b998e] p-3 rounded-2xl shadow-lg shadow-[#2b998e]/20">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">EdgeLocalist</h1>
              <p className="text-slate-400 text-sm">Radius Search & Geocoding</p>
            </div>
          </div>

          {/* Authentication Status / Controls */}
          {!localStorage.getItem('ghl_token') ? (
            <button 
              onClick={handleConnect}
              className="bg-[#2b998e] hover:bg-[#238278] text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-[#2b998e]/20"
            >
              Connect HighLevel
            </button>
          ) : (
             <div className="flex items-center gap-3">
               <div className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
                 Connected: {locationId || 'Unknown'}
               </div>
               <button 
                 onClick={handleLogout}
                 className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1 rounded-lg transition-colors"
               >
                 Disconnect
               </button>
             </div>
          )}
        </div>

        {/* Configuration Card */}
        <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-300">
              <Filter className="w-5 h-5 text-[#2b998e]" />
              <span className="font-bold uppercase tracking-wider text-sm">Configuration</span>
            </div>
            <button 
              onClick={() => setShowBatchTools(!showBatchTools)} 
              className="text-xs text-[#2b998e] hover:underline"
            >
              {showBatchTools ? 'Close Batch Tools' : 'Open Batch Tools'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-400">
             <div>Location ID: <span className="text-slate-200">{locationId}</span></div>
          </div>

          {showBatchTools && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <GeocodeBatchProcessor 
                locationId={locationId} 
                contacts={contacts} 
                customFieldIds={CUSTOM_FIELD_IDS} 
                onComplete={loadData} 
              />
            </div>
          )}
        </div>

        {/* Search Parameters Card */}
        <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-6 text-slate-300">
            <Search className="w-5 h-5 text-[#2b998e]" />
            <span className="font-bold uppercase tracking-wider text-sm">Search Parameters</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">Address or Zip Code</label>
              <AnchorSearch onAnchorChange={setAnchorCoords} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-400">Radius (miles)</label>
              <div className="relative">
                <select 
                  value={radius}
                  onChange={(e) => setRadius(Number(e.target.value))}
                  className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-4 text-slate-200 focus:outline-none focus:border-[#2b998e] appearance-none cursor-pointer"
                >
                  <option value={5}>5 miles</option>
                  <option value={10}>10 miles</option>
                  <option value={25}>25 miles</option>
                  <option value={50}>50 miles</option>
                </select>
                <ChevronDown className="absolute right-4 top-5 text-slate-500 pointer-events-none" size={20} />
              </div>
            </div>

            <button 
              onClick={loadData} 
              disabled={isSyncing}
              className="w-full bg-[#2b998e] hover:bg-[#238278] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#2b998e]/20 transition-all uppercase tracking-wide flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? <RefreshCw className="animate-spin" /> : <Search size={20} />} 
              {isSyncing ? 'Syncing...' : 'Search Contacts'}
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-4 pb-12">
           {nearbyContacts.length > 0 ? (
             nearbyContacts.map(contact => (
               <div key={contact.id} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-800 flex justify-between items-center hover:border-[#2b998e]/50 transition-colors">
                 <div>
                   <div className="font-bold text-lg text-slate-100">{contact.firstName} {contact.lastName}</div>
                   <div className="text-slate-400 text-sm flex items-center gap-2">
                     <MapPin size={12} />
                     {contact.address1 || 'No Address Provided'}
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="text-[#2b998e] font-bold text-xl">{contact.distance?.toFixed(1)} mi</div>
                   <div className="text-slate-500 text-xs">away</div>
                 </div>
               </div>
             ))
           ) : (
             <div className="text-center text-slate-500 py-8 bg-[#1e293b]/50 rounded-2xl border border-slate-800 border-dashed">
               <p>No contacts found in this radius.</p>
               <p className="text-xs mt-2">Try increasing the radius or geocoding your list.</p>
             </div>
           )}
        </div>

        <div className="text-center text-slate-500 text-xs mt-12 pb-8 border-t border-slate-800 pt-8">
          Powered by EdgeLocalist • HighLevel API v2
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT (The Router) ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RadiusSearchApp />} />
        <Route path="/callback" element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;