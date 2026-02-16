import React, { useEffect, useState, useMemo } from 'react';
import { useGHLContext } from './hooks/useGHLContext';
import { useGeoLocation } from './hooks/useGeoLocation';
import { useNearbyContacts } from './hooks/useNearbyContacts';
import { ghlService } from './services/ghlApi';
import { AnchorSearch } from './components/AnchorSearch';
import { GeocodeBatchProcessor } from './components/GeocodeBatchProcessor';
import { 
  MapPin, Phone, MessageSquare, Navigation, 
  Search, Filter, ChevronDown, RefreshCw, AlertTriangle 
} from 'lucide-react';

function App() {
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
    if (!locationId) return;
    setIsSyncing(true);
    try {
      const response = await ghlService.getContacts(locationId, 200);
      setContacts(response.contacts);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [locationId]);

  if (isGhlLoading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-[#2b998e]">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="bg-[#2b998e] p-3 rounded-2xl shadow-lg shadow-[#2b998e]/20">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Radius Search</h1>
            <p className="text-slate-400 text-sm">Find HighLevel contacts within a geographic area</p>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-[#1e293b] border border-slate-800 rounded-3xl p-8 shadow-xl">
          <div className="flex items-center gap-2 mb-6 text-slate-300">
            <Filter className="w-5 h-5 text-[#2b998e]" />
            <span className="font-bold uppercase tracking-wider text-sm">Configuration</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-400">
             <div>Location ID: <span className="text-slate-200">{locationId}</span></div>
             <div className="text-right">
               <button onClick={() => setShowBatchTools(!showBatchTools)} className="text-xs text-[#2b998e] hover:underline">
                 {showBatchTools ? 'Close Batch Tools' : 'Open Batch Tools'}
               </button>
             </div>
          </div>
          {showBatchTools && (
            <div className="mt-4">
              <GeocodeBatchProcessor locationId={locationId} contacts={contacts} customFieldIds={CUSTOM_FIELD_IDS} onComplete={loadData} />
            </div>
          )}
        </div>

        {/* Search Parameters */}
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
                </select>
                <ChevronDown className="absolute right-4 top-5 text-slate-500 pointer-events-none" size={20} />
              </div>
            </div>

            <button onClick={loadData} className="w-full bg-[#2b998e] hover:bg-[#238278] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#2b998e]/20 transition-all uppercase tracking-wide flex justify-center items-center gap-2">
              <Search size={20} /> Search Contacts
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-4">
           {nearbyContacts.map(contact => (
             <div key={contact.id} className="bg-[#1e293b] p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
               <div>
                 <div className="font-bold text-lg">{contact.firstName} {contact.lastName}</div>
                 <div className="text-slate-400 text-sm">{contact.address1}</div>
               </div>
               <div className="text-[#2b998e] font-bold">{contact.distance?.toFixed(1)} mi</div>
             </div>
           ))}
        </div>

        <div className="text-center text-slate-500 text-xs mt-12 pb-8">
          Powered by Mapbox Geocoding • HighLevel API v2
        </div>
      </div>
    </div>
  );
} // THIS WAS LIKELY MISSING

export default App;