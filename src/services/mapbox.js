const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export const mapboxService = {
  getGeocode: async (address) => {
    if (!address) return null;
    
    // Mapbox Geocoding API endpoint
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        // Mapbox returns [longitude, latitude]
        const [lng, lat] = data.features[0].center;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error("Geocoding failed", error);
      return null;
    }
  }
};