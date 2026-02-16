// netlify/functions/auth.js
// This runs on the server, keeping your secrets safe.

exports.handler = async function(event, context) {
  const { code } = event.queryStringParameters;
  
  if (!code) {
    // If no code, redirect user to GHL Login Page
    const redirectUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&redirect_uri=${process.env.REDIRECT_URI}&client_id=${process.env.GHL_CLIENT_ID}&scope=contacts.readonly`;
    return {
      statusCode: 302,
      headers: { Location: redirectUrl }
    };
  }

  // If code exists, exchange it for an Access Token
  // ... (We would write the token exchange logic here)
};