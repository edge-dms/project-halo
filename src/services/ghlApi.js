/**
 * GHL API Service Layer
 * This module handles all communication with GoHighLevel.
 */

const BASE_URL = import.meta.env.VITE_GHL_API_BASE_URL;
const ACCESS_TOKEN = import.meta.env.VITE_GHL_ACCESS_TOKEN;

/**
 * Generic fetch wrapper for GHL requests
 * @param {string} endpoint - The API endpoint (e.g., '/contacts/')
 * @param {object} options - Fetch options (method, body, etc.)
 */
async function ghlFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Version': '2021-07-28', // GHL requires a version header
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'GHL API Request Failed');
    }

    return await response.json();
  } catch (error) {
    console.error('GHL API Error:', error.message);
    throw error;
  }
}

// Specific API methods
export const ghlService = {
  // Fetch contacts for a specific location
  getContacts: (locationId) => {
    return ghlFetch(`/contacts/?locationId=${locationId}`);
  },

  // Create a new contact
  createContact: (contactData) => {
    return ghlFetch('/contacts/', {
      method: 'POST',
      body: JSON.stringify(contactData),
    });
  },

  // Get current user info (useful for highlevel SaaS context)
  getUsers: (locationId) => {
    return ghlFetch(`/users/?locationId=${locationId}`);
  }
};