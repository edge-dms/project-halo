const axios = require('axios');

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { code } = JSON.parse(event.body);

    const response = await axios.post('https://services.leadconnectorhq.com/oauth/token', 
      new URLSearchParams({
        client_id: process.env.VITE_GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        user_type: 'Location',
        redirect_uri: process.env.VITE_REDIRECT_URI
      }), 
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Token Exchange Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify(error.response?.data || { message: 'Internal Server Error' })
    };
  }
};