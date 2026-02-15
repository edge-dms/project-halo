import { useState, useEffect } from 'react';

/**
 * Hook to capture GHL session data from the URL
 * Expected GHL URL format: 
 * https://your-app.com/?location_id=XYZ&user_id=123
 */
export const useGHLContext = () => {
  const [ghlData, setGhlData] = useState({
    locationId: null,
    userId: null,
    companyId: null,
    isLoading: true,
    isExternal: false
  });

  useEffect(() => {
    // Access browser URL parameters
    const params = new URLSearchParams(window.location.search);
    
    const locationId = params.get('location_id');
    const userId = params.get('user_id');
    const companyId = params.get('company_id');

    // If no locationId is found, we might be running locally in Vite
    if (!locationId) {
      setGhlData({
        locationId: 'DEVELOPMENT_LOCATION_ID', // Hardcode a test ID for local dev
        userId: 'DEV_USER',
        isLoading: false,
        isExternal: true
      });
      return;
    }

    setGhlData({
      locationId,
      userId,
      companyId,
      isLoading: false,
      isExternal: false
    });
  }, []);

  return ghlData;
};