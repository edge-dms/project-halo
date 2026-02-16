import React, { useState } from 'react';
import { Search, MapPin, Navigation } from 'lucide-react';
import { mapboxService } from '../services/mapbox';

export const AnchorSearch = ({ onAnchorChange, currentGeo }) => {
  const [input, setInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeMode, setActiveMode] = useState('gps');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!input) return;
    setIsSearching(true);
    const coords = await mapboxService.getGeocode(input);
    setIsSearching(false);
    if (coords) {
      setActiveMode('custom');
      onAnchorChange(coords);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full">
      <input 
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="123 Main St, New York, NY or 10001"
        className="w-full pl-12 pr-4 py-4 bg-[#0f172a] border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#2b998e] focus:ring-1 focus:ring-[#2b998e] transition-all"
      />
      <Search className="absolute left-4 top-4.5 text-slate-500 w-5 h-5" />
      {isSearching && (
        <div className="absolute right-4 top-4">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#2b998e]"></div>
        </div>
      )}
    </form>
  );
};