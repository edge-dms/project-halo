import React, { useState } from 'react';
import { ghlService } from '../services/ghlApi';
import { mapboxService } from '../services/mapbox';

export const GeocodeBatchProcessor = ({ locationId, contacts, onComplete }) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, updated: 0 });

  const startBatch = async () => {
    setProcessing(true);
    // filter contacts that have an address but NO lat/long custom fields
    // NOTE: You need to replace these IDs with your actual GHL Custom Field IDs
    const LAT_FIELD_ID = "contact.custom_lat"; 
    const LNG_FIELD_ID = "contact.custom_lng";

    const toProcess = contacts.filter(c => c.address1 && c.city); // basic check
    
    setProgress({ current: 0, total: toProcess.length, updated: 0 });

    for (let i = 0; i < toProcess.length; i++) {
      const contact = toProcess[i];
      
      // Update progress bar
      setProgress(prev => ({ ...prev, current: i + 1 }));

      // 1. Construct Address String
      const fullAddress = `${contact.address1}, ${contact.city}, ${contact.state || ''} ${contact.postalCode || ''}`;
      
      // 2. Call Mapbox
      // We add a small delay to be nice to the APIs
      await new Promise(r => setTimeout(r, 200)); 
      const coords = await mapboxService.getGeocode(fullAddress);

      if (coords) {
        // 3. Save back to GHL
        await ghlService.updateContact(contact.id, {
          customFields: [
            { id: LAT_FIELD_ID, value: coords.lat },
            { id: LNG_FIELD_ID, value: coords.lng }
          ]
        });
        
        setProgress(prev => ({ ...prev, updated: prev.updated + 1 }));
      }
    }

    setProcessing(false);
    if (onComplete) onComplete();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
      <h3 className="font-bold text-lg mb-2">Initial Setup: Location Sync</h3>
      <p className="text-sm text-slate-500 mb-4">
        We need to scan your {contacts.length} contacts to find their GPS coordinates.
        This allows the "Nearby" feature to work.
      </p>

      {!processing ? (
        <button 
          onClick={startBatch}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          Start Geocoding Database
        </button>
      ) : (
        <div className="w-full">
          <div className="flex justify-between text-xs mb-1">
            <span>Processing... {progress.current} / {progress.total}</span>
            <span>{Math.round((progress.current / progress.total) * 100)}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          <p className="text-xs text-green-600 mt-2">Successfully located: {progress.updated} addresses</p>
        </div>
      )}
    </div>
  );
};