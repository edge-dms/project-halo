import React from 'react';
import { MapPin, ExternalLink, LogIn, ChevronRight } from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans flex flex-col">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="bg-[#2b998e] p-2 rounded-lg">
             <MapPin className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">LOCALIST</span>
        </div>
        
        <div className="flex items-center gap-6">
          <a href="#" className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            App Marketplace <ExternalLink size={14} />
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
      <main className="flex-grow flex items-center justify-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2b998e]/10 border border-[#2b998e]/20 text-[#2b998e] text-xs font-bold uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2b998e] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2b998e]"></span>
                </span>
                Seamless CRM Integration
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold leading-tight">
              Find Your Contacts <br />
              <span className="text-[#2b998e]">By Location</span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-lg leading-relaxed">
              EdgeLocalist is a powerful radius search tool that finds your CRM contacts within any geographic area. Target locally, act precisely.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onGetStarted}
                className="bg-[#2b998e] hover:bg-[#238278] text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 shadow-xl shadow-[#2b998e]/20 transition-all"
              >
                Get Started <ChevronRight size={20} />
              </button>
              
              <button className="border border-slate-700 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl text-lg font-bold flex items-center justify-center gap-2 transition-all">
                View on Marketplace <ExternalLink size={20} />
              </button>
            </div>
          </div>
          
          {/* --- UPDATED IMAGE SECTION --- */}
          <div className="flex justify-center relative scale-125 lg:scale-150 origin-center">
             {/* Glow Effect: Increased from w-64 to w-[32rem] (Doubled) */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-[#2b998e]/20 blur-[100px] rounded-full -z-10"></div>
             
             {/* Robot Image: Changed max-w-sm to max-w-3xl (Doubled width limit) */}
             <img 
               src="/robot-mascot.png" 
               alt="App Mascot" 
               className="w-full max-w-3xl drop-shadow-2xl animate-pulse"
               onError={(e) => e.target.style.display = 'none'} 
             />
          </div>
          {/* ----------------------------- */}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} EdgeLocalist. All rights reserved.</p>
      </footer>
    </div>
  );
}