import React, { useState } from 'react';
import { MapPin, Search, Users, Filter, Loader } from 'lucide-react';

export default function HighLevelRadiusSearch() {
  const [apiKey, setApiKey] = useState('');
  const [locationId, setLocationId] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [error, setError] = useState('');
  const [searchComplete, setSearchComplete] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // Delay helper to prevent rate limiting
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Haversine formula to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Geocode address using Nominatim with CORS proxy
  const geocodeAddress = async (address) => {
    try {
      // Try direct request first (works in production)
      let response;
      try {
        response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          {
            headers: {
              'User-Agent': 'HighLevelRadiusSearch/1.0'
            }
          }
        );
      } catch (err) {
        // If direct fails, use CORS proxy
        const corsProxy = 'https://corsproxy.io/?';
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        response = await fetch(corsProxy + encodeURIComponent(nominatimUrl));
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        };
      }
      throw new Error('Address not found');
    } catch (err) {
      throw new Error('Failed to geocode address');
    }
  };

  // Fetch contacts from HighLevel
  const fetchContacts = async () => {
    try {
      const response = await fetch(
        `https://services.leadconnectorhq.com/contacts/?locationId=${locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts. Check your API key and Location ID.');
      }
      
      const data = await response.json();
      return data.contacts || [];
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const handleSearch = async () => {
    if (!apiKey || !locationId || !searchAddress) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setSearchComplete(false);
    setDebugInfo(null);
    setProgress({ current: 0, total: 0 });
    
    const debug = {
      totalContacts: 0,
      contactsWithAddress: 0,
      contactsWithoutAddress: [],
      geocodedSuccessfully: 0,
      geocodeFailed: [],
      withinRadius: 0,
      outsideRadius: 0
    };
    
    try {
      // Geocode the search address
      const searchCoords = await geocodeAddress(searchAddress);
      
      // Fetch all contacts
      const allContacts = await fetchContacts();
      setContacts(allContacts);
      debug.totalContacts = allContacts.length;
      
      // Set progress total
      const contactsToGeocode = allContacts.filter(c => 
        `${c.address1 || ''} ${c.city || ''} ${c.state || ''} ${c.postalCode || ''}`.trim()
      );
      setProgress({ current: 0, total: contactsToGeocode.length });
      
      // Filter contacts by radius
      const filtered = [];
      let processedCount = 0;
      
      for (let i = 0; i < allContacts.length; i++) {
        const contact = allContacts[i];
        
        // Try to get coordinates from contact address
        const fullAddress = `${contact.address1 || ''} ${contact.city || ''} ${contact.state || ''} ${contact.postalCode || ''}`.trim();
        
        if (fullAddress) {
          debug.contactsWithAddress++;
          
          // Add delay to respect rate limits (1.5 seconds between requests)
          if (processedCount > 0) {
            await delay(1500);
          }
          
          processedCount++;
          setProgress({ current: processedCount, total: contactsToGeocode.length });
          
          try {
            const contactCoords = await geocodeAddress(fullAddress);
            debug.geocodedSuccessfully++;
            
            const distance = calculateDistance(
              searchCoords.lat,
              searchCoords.lon,
              contactCoords.lat,
              contactCoords.lon
            );
            
            if (distance <= radius) {
              debug.withinRadius++;
              filtered.push({
                ...contact,
                distance: distance.toFixed(2),
                coordinates: contactCoords
              });
            } else {
              debug.outsideRadius++;
            }
          } catch (err) {
            // Skip contacts we can't geocode
            debug.geocodeFailed.push({
              name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
              address: fullAddress,
              id: contact.id
            });
          }
        } else {
          debug.contactsWithoutAddress.push({
            name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unknown',
            id: contact.id
          });
        }
      }
      
      // Sort by distance
      filtered.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      
      setFilteredContacts(filtered);
      setDebugInfo(debug);
      setSearchComplete(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * {
          font-family: 'Outfit', sans-serif;
        }
        
        .mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        
        .animate-slide-down {
          animation: slideDown 0.5s ease-out;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        
        .stagger-1 {
          animation-delay: 0.1s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        
        .stagger-2 {
          animation-delay: 0.2s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        
        .stagger-3 {
          animation-delay: 0.3s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
        
        .glass-effect {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .glow-effect {
          box-shadow: 0 0 30px rgba(43, 153, 142, 0.3);
        }
        
        input:focus, select:focus {
          outline: none;
          border-color: #2b998e;
          box-shadow: 0 0 0 3px rgba(43, 153, 142, 0.1);
        }
        
        .contact-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .contact-card:hover {
          transform: translateX(8px);
          background: rgba(43, 153, 142, 0.1);
          border-left-color: #2b998e;
        }
      `}</style>
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12 animate-slide-down">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2b998e] to-[#248073] flex items-center justify-center glow-effect">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-1">Radius Search</h1>
              <p className="text-slate-400 text-lg">Find HighLevel contacts within a geographic area</p>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="glass-effect rounded-3xl p-8 mb-8 animate-slide-down stagger-1">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Filter className="w-5 h-5 text-[#2b998e]" />
            Configuration
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                HighLevel API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 transition-all"
                placeholder="Enter your API key"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Location ID
              </label>
              <input
                type="text"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 transition-all"
                placeholder="Enter location ID"
              />
            </div>
          </div>
        </div>

        {/* Search Panel */}
        <div className="glass-effect rounded-3xl p-8 mb-8 animate-slide-down stagger-2">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-[#2b998e]" />
            Search Parameters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Address or Zip Code
              </label>
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 transition-all"
                placeholder="123 Main St, New York, NY or 10001"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Radius (miles)
              </label>
              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white transition-all cursor-pointer"
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
            disabled={loading}
            className="mt-6 w-full bg-gradient-to-r from-[#2b998e] to-[#248073] text-white font-semibold py-4 px-6 rounded-xl hover:from-[#248073] hover:to-[#1f6b62] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 glow-effect"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                {progress.total > 0 ? (
                  `Geocoding contacts... ${progress.current}/${progress.total}`
                ) : (
                  'Searching...'
                )}
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search Contacts
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-effect rounded-2xl p-6 mb-8 border-l-4 border-red-500 animate-fade-in">
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Debug Information */}
        {debugInfo && (
          <div className="glass-effect rounded-3xl p-8 mb-8 animate-fade-in">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Filter className="w-5 h-5 text-[#2b998e]" />
              Search Details
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-800 bg-opacity-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-cyan-400 mb-1">{debugInfo.totalContacts}</div>
                <div className="text-sm text-slate-400">Total Contacts</div>
              </div>
              
              <div className="bg-slate-800 bg-opacity-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-green-400 mb-1">{debugInfo.contactsWithAddress}</div>
                <div className="text-sm text-slate-400">With Addresses</div>
              </div>
              
              <div className="bg-slate-800 bg-opacity-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-[#2b998e] mb-1">{debugInfo.geocodedSuccessfully}</div>
                <div className="text-sm text-slate-400">Geocoded</div>
              </div>
              
              <div className="bg-slate-800 bg-opacity-50 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-orange-400 mb-1">{debugInfo.withinRadius}</div>
                <div className="text-sm text-slate-400">Within Radius</div>
              </div>
            </div>
            
            {debugInfo.contactsWithoutAddress.length > 0 && (
              <div className="bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 rounded-xl p-4 mb-4">
                <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                  ⚠️ Contacts Without Addresses ({debugInfo.contactsWithoutAddress.length})
                </h3>
                <p className="text-sm text-slate-300 mb-2">These contacts don't have address information:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {debugInfo.contactsWithoutAddress.map((c, i) => (
                    <div key={i} className="text-sm text-slate-400 font-mono">
                      • {c.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {debugInfo.geocodeFailed.length > 0 && (
              <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-xl p-4">
                <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                  ❌ Failed to Geocode ({debugInfo.geocodeFailed.length})
                </h3>
                <p className="text-sm text-slate-300 mb-2">These addresses couldn't be found on the map:</p>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {debugInfo.geocodeFailed.map((c, i) => (
                    <div key={i} className="text-sm">
                      <div className="text-slate-300 font-medium">{c.name}</div>
                      <div className="text-slate-500 font-mono text-xs">{c.address}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {debugInfo.outsideRadius > 0 && (
              <div className="bg-slate-700 bg-opacity-30 rounded-xl p-4 mt-4">
                <p className="text-slate-400 text-sm">
                  <span className="font-semibold text-slate-300">{debugInfo.outsideRadius}</span> contacts were successfully located but fall outside your {radius}-mile radius.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {searchComplete && (
          <div className="glass-effect rounded-3xl p-8 animate-slide-down stagger-3">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#2b998e]" />
                Results
              </h2>
              <div className="bg-[#2b998e] bg-opacity-20 text-[#2b998e] px-4 py-2 rounded-full text-sm font-semibold mono">
                {filteredContacts.length} contacts found
              </div>
            </div>
            
            {filteredContacts.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No contacts found within {radius} miles</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredContacts.map((contact, index) => (
                  <div
                    key={contact.id}
                    className="contact-card bg-slate-800 bg-opacity-50 rounded-xl p-5 border-l-4 border-slate-700"
                    style={{
                      animation: `fadeIn 0.3s ease-out ${index * 0.05}s forwards`,
                      opacity: 0
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {contact.firstName} {contact.lastName}
                        </h3>
                        <div className="space-y-1 text-sm text-slate-400">
                          {contact.email && (
                            <p className="flex items-center gap-2">
                              <span className="text-slate-500">✉</span>
                              {contact.email}
                            </p>
                          )}
                          {contact.phone && (
                            <p className="flex items-center gap-2">
                              <span className="text-slate-500">☎</span>
                              {contact.phone}
                            </p>
                          )}
                          {(contact.address1 || contact.city) && (
                            <p className="flex items-center gap-2">
                              <span className="text-slate-500">📍</span>
                              {contact.address1} {contact.city} {contact.state} {contact.postalCode}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <div className="bg-[#2b998e] bg-opacity-20 text-[#2b998e] px-3 py-1 rounded-full text-xs font-semibold mono">
                          {contact.distance} mi
                        </div>
                        {contact.tags && contact.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-end">
                            {contact.tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Using OpenStreetMap Nominatim for geocoding • HighLevel API v2</p>
        </div>
      </div>
    </div>
  );
}
