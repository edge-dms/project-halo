// This runs on the server, keeping your Client Secret hidden
export const handler = async (event) => {
  const { code } = JSON.parse(event.body);

  const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GHL_CLIENT_ID,
      client_secret: process.env.GHL_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: code,
      user_type: 'Location',
      redirect_uri: 'https://project-halo.netlify.app/callback'
    })
  });

  const data = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};