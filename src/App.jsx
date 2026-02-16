import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom'; // Required for OAuth landing page
import { useGHLContext } from './hooks/useGHLContext';
import { useGeoLocation } from './hooks/useGeoLocation';
import { useNearbyContacts } from './hooks/useNearbyContacts';
import { ghlService } from './services/ghlApi';
import { AnchorSearch } from './components/AnchorSearch';
import { GeocodeBatchProcessor } from './components/GeocodeBatchProcessor';
import OAuthCallback from './components/OAuthCallback'; // Import the new callback component
import { 
  MapPin, Search, Filter, ChevronDown 
} from 'lucide-react';

// --- 1. YOUR ORIGINAL APP LOGIC (Now as a Sub-Component) ---
function RadiusSearchApp() {
  const { locationId, isLoading: isGhlLoading } = useGHLContext();
  const geo = useGeoLocation();

  const [anchorCoords, setAnchorCoords] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [radius, setRadius] = useState(10);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showBatchTools, setShowBatchTools] = useState(false);

  const CUSTOM_FIELD_IDS = { lat: "contact.custom_lat", lng: "contact.custom_lng" };
  const searchPoint = anchorCoords || geo.coordinates;

  const nearbyContacts = useNearbyContacts(
    { loaded: !!searchPoint?.lat, coordinates: searchPoint }, 
    contacts, 
    radius, 
    CUSTOM_FIELD_IDS
  );

  const loadData = async () => {
    // MODIFIED: Look for the OAuth token instead of an API Key
    const token = localStorage.getItem('ghl_token');
    if (!locationId || !token) return; 

    setIsSyncing(true);
    try {
      const response = await ghlService.getContacts(locationId, token);
      setContacts(response.contacts);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [locationId]);

  // --- 2. THE NEW OAUTH CONNECT LOGIC ---
  const handleConnect = () => {
    const scopes = ['contacts.readonly', 'contacts.write', 'locations.readonly'].join('%20');
    const authUrl = `https://app.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${import.meta.env.VITE_GHL_CLIENT_ID}&scope=${scopes}&redirect_uri=${import.meta.env.VITE_REDIRECT_URI}`;
    window.location.href = authUrl;
  };

  if (isGhlLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-[#2b998e]">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header with OAuth Status */}
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

          {/* Connect Button: Only shows if not authenticated */}
          {!localStorage.getItem('ghl_token') ? (
            <button 
              onClick={handleConnect}
              className="bg-[#2b998e] hover:bg-[#238278] text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-[#2b998e]/20"
            >
              Connect HighLevel
            </button>
          ) : (
            <div className="text-[10px] text-slate-500 font-mono bg-slate-900/50 px-3 py-1 rounded-full border border-slate-800">
              ID: {locationId}
            </div>
          )}
        </div>

        {/* Existing Configuration Section */}
        <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-300">
              <Filter className="w-5 h-5 text-[#2b998e]" />
              <span className="font-bold uppercase tracking-wider text-sm">Configuration</span>
            </div>
            <button onClick={() => setShowBatchTools(!showBatchTools)} className="text-xs text-[#2b998e] hover:underline">
              {showBatchTools ? 'Hide Batch Tools' : 'Open Batch Tools'}
            </button>
          </div>
          
          {showBatchTools && (
            <div className="mt-4">
              <GeocodeBatchProcessor 
                locationId={locationId} 
                contacts={contacts} 
                customFieldIds={CUSTOM_FIELD_IDS} 
                onComplete={loadData} 
              />
            </div>
          )}
        </div>

        {/* --- YOUR ORIGINAL SEARCH PARAMETERS & RESULTS LIST CODE GOES HERE --- */}
        {/* (Keep the Search card and Results List exactly as you have them) */}

      </div>
    </div>
  );
}

// --- 3. THE MAIN APP COMPONENT (The Router) ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The main app lives at the root URL */}
        <Route path="/" element={<RadiusSearchApp />} />
        
        {/* The OAuth landing page lives at /callback */}
        <Route path="/callback" element={<OAuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}