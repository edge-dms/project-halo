import * as React from 'react';
import { Map, Marker, NavigationControl } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export const ResultsMap = ({ contacts, anchor, CUSTOM_FIELD_IDS }) => {
  if (!anchor?.lat || !anchor?.lng) return (
    <div className="h-[400px] w-full rounded-3xl bg-[#0f172a] border border-slate-800 flex items-center justify-center text-slate-500">
      Acquiring Satellite Position...
    </div>
  );

  return (
    <div className="h-[400px] w-full rounded-3xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <Map
        initialViewState={{
          latitude: anchor.lat,
          longitude: anchor.lng,
          zoom: 12
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl position="top-right" />

        {/* Anchor Point (Teal Glow) */}
        <Marker latitude={anchor.lat} longitude={anchor.lng} anchor="bottom">
          <div className="bg-[#2b998e] p-2 rounded-full border-2 border-white shadow-[0_0_15px_#2b998e] animate-pulse">
            <MapPin size={16} className="text-white" />
          </div>
        </Marker>

        {/* Contact Pins */}
        {contacts.map((contact) => {
          const lat = contact.customFields?.find(f => f.id === CUSTOM_FIELD_IDS.lat)?.value;
          const lng = contact.customFields?.find(f => f.id === CUSTOM_FIELD_IDS.lng)?.value;

          if (!lat || !lng) return null;

          return (
            <Marker 
              key={contact.id} 
              latitude={parseFloat(lat)} 
              longitude={parseFloat(lng)}
              anchor="bottom"
            >
              <div className="group relative cursor-pointer">
                <MapPin size={24} className="text-slate-400 group-hover:text-[#2b998e] transition-colors" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#1e293b] text-white text-[10px] font-bold px-2 py-1 rounded border border-slate-700 shadow-xl whitespace-nowrap z-50">
                  {contact.firstName} {contact.lastName}
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>
    </div>
  );
};