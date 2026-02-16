const API_BASE_URL = import.meta.env.VITE_GHL_API_BASE_URL || 'https://services.leadconnectorhq.com';

export const ghlService = {
  /**
   * Fetch contacts for a specific location.
   * @param {string} locationId - The sub-account ID.
   * @param {string} token - The OAuth Access Token (User's Passport).
   * @param {number} limit - Number of contacts to fetch (default 100).
   */
  getContacts: async (locationId, token, limit = 100) => {
    if (!token) throw new Error("Missing OAuth Token. Please reconnect HighLevel.");

    const url = `${API_BASE_URL}/contacts/?locationId=${locationId}&limit=${limit}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`, // <--- Vital Space here!
          'Version': '2021-07-28',            // <--- Mandatory for v2 API
          'Accept': 'application/json'
        }
      });

      if (response.status === 401) {
        throw new Error("Token Expired or Invalid. Please logout and reconnect.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GHL API Error: ${response.status} ${errorData.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
      throw error;
    }
  },

  /**
   * Update a contact's custom fields (e.g., Latitude/Longitude).
   * @param {string} contactId - The specific contact ID to update.
   * @param {object} data - The fields to update (e.g., { customFields: [...] }).
   * @param {string} token - The OAuth Access Token.
   */
  updateContact: async (contactId, data, token) => {
    if (!token) throw new Error("Missing OAuth Token.");

    const url = `${API_BASE_URL}/contacts/${contactId}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Update Failed: ${response.status} - ${errorData.message}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error updating contact ${contactId}:`, error);
      throw error;
    }
  }
};