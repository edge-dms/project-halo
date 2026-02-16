import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      // Call our secure Netlify function
      fetch('/.netlify/functions/ghl-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      .then(res => res.json())
      .then(data => {
        if (data.access_token) {
          localStorage.setItem('ghl_token', data.access_token);
          navigate('/'); // Send them back to the map!
        }
      })
      .catch(err => console.error("Auth Error:", err));
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2b998e] mx-auto"></div>
        <p className="text-slate-400">Finalizing HighLevel Connection...</p>
      </div>
    </div>
  );
}