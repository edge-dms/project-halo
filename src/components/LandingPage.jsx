import React from 'react';
import { MapPin, ExternalLink, LogIn, ChevronRight } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          {/* Your Robot Logo would go here */}
          <div className="bg-[#2b998e] p-2 rounded-lg">
             <MapPin className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">LOCALIST</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            GHL App Store <ExternalLink size={14} />
          </a>
          <button 
            onClick={onGetStarted}
            className="bg-[#2b998e] hover:bg-[#238278] text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
          >
            <LogIn size={16} /> Login
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2b998e]/10 border border-[#2b998e]/20 text-[#2b998e] text-xs font-bold uppercase tracking-widest">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2b998e] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2b998e]"></span>
            </span>
            Built for GoHighLevel
          </div>
          
          <h1 className="text-6xl lg:text-7xl font-extrabold leading-tight">
            Find Your Contacts <br />
            <span className="text-[#2b998e]">By Location</span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
            EdgeLocalist is a powerful radius search tool that finds your GoHighLevel contacts within any geographic area. Target locally, act precisely.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button 
              onClick={onGetStarted}
              className="bg-[#2b998e] hover:bg-[#238278] text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 shadow-xl shadow-[#2b998e]/20 transition-all"
            >
              Get Started <ChevronRight size={20} />
            </button>
            <button className="border border-slate-700 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 transition-all">
              View on GHL App Store <ExternalLink size={20} />
            </button>
          </div>
        </div>

        {/* Visual/Image Area */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-md aspect-square bg-gradient-to-br from-[#2b998e]/20 to-transparent rounded-full blur-3xl absolute -z-10 animate-pulse"></div>
          {/* Replace this with your robot mascot image */}
          <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-[3rem] backdrop-blur-sm shadow-2xl">
             <img 
               src="/robot-mascot.png" 
               alt="EdgeLocalist Robot" 
               className="w-full max-w-sm drop-shadow-2xl"
             />
          </div>
        </div>
      </main>

      {/* Footer / Features teaser */}
      <footer className="border-t border-slate-800 py-20 px-6">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <h2 className="text-3xl font-bold italic">
            Everything You Need for <span className="text-[#2b998e]">Location-Based Outreach</span>
          </h2>
          <p className="text-slate-500 max-w-2xl mx-auto">
            Leverage geographic intelligence to connect with the contacts that matter most to your business.
          </p>
        </div>
      </footer>
    </div>
  );
}