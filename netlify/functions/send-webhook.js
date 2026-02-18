// netlify/functions/send-webhook.js
//
// This function proxies the geocoded contact data to the GHL webhook.
// It runs server-side on Netlify so there are no CORS restrictions —
// the webhook receives a clean JSON POST with the correct Content-Type.
//
// Place this file at: netlify/functions/send-webhook.js

const WEBHOOK_URL =
  'https://services.leadconnectorhq.com/hooks/hXcSSA35KVSLC2674wFT/webhook-trigger/24ed47d5-279b-443f-93c5-1d228a8d277d';

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON body' })
    };
  }

  // Validate that we have the minimum required fields
  if (!payload.contact_id || payload.latitude == null || payload.longitude == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: contact_id, latitude, longitude' })
    };
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any auth headers your GHL webhook requires here, e.g.:
        // 'Authorization': `Bearer ${process.env.GHL_WEBHOOK_SECRET}`
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`GHL webhook returned ${response.status}: ${responseText}`);
      return {
        statusCode: 502,
        body: JSON.stringify({
          error: 'GHL webhook returned an error',
          status: response.status,
          detail: responseText
        })
      };
    }

    console.log(`Webhook sent for contact ${payload.contact_id} — ${response.status}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, contact_id: payload.contact_id })
    };

  } catch (err) {
    console.error('Error calling GHL webhook:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal error calling webhook', detail: err.message })
    };
  }
};
