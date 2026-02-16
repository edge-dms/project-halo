import { useState, useEffect } from 'react';
import { getDistanceFromLatLonInMiles } from '../utils/geo';

export const useNearbyContacts = (userLocation, contacts, radiusMiles = 5) => {
  const [nearby, setNearby] = useState([]);

  useEffect(() => {
    if (!userLocation.loaded || !contacts.length) return;

    // REPLACE THESE with your specific Agency's Custom Field IDs
    // You find these in GHL Settings -> Custom Fields
    const LAT_FIELD_ID = "contact.custom_lat"; 
    const LNG_FIELD_ID = "contact.custom_lng";

    const filtered = contacts.filter(contact => {
      // Find the specific custom fields in the contact object
      const latField = contact.customFields?.find(f => f.id === LAT_FIELD_ID);
      const lngField = contact.customFields?.find(f => f.id === LNG_FIELD_ID);

      // If they haven't been geocoded by the setup batch yet, skip them
      if (!latField || !lngField) return false;

      const distance = getDistanceFromLatLonInMiles(
        userLocation.coordinates.lat,
        userLocation.coordinates.lng,
        parseFloat(latField.value),
        parseFloat(lngField.value)
      );

      contact.distance = distance;
      return distance <= radiusMiles;
    });

    filtered.sort((a, b) => a.distance - b.distance);
    setNearby(filtered);

  }, [userLocation, contacts, radiusMiles]);

  return nearby;
};