import React, { useState, useEffect } from 'react';

const Navbar = ({ user }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-20 border-b border-gray-800 bg-[#0b0f19]/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-20 w-full pl-72">
      <div>
        <h2 className="text-lg font-bold text-gray-100">
          Hello, {user?.name || 'Friend'} 👋
        </h2>
        <p className="text-xs text-gray-400">Welcome to your mental wellness space</p>
      </div>

      <div className="flex items-center gap-6">
        {/* Date Time Widget */}
        <div className="hidden md:flex items-center gap-2 bg-gray-800/40 border border-gray-700/30 px-3.5 py-1.5 rounded-full text-xs text-gray-300">
          <span className="material-icons text-cyan-400 text-sm">schedule</span>
          <span>{formattedDate}</span>
        </div>

        {/* Support Hotline Info Badge */}
        <a
          href="/relaxation"
          className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 px-4 py-1.5 rounded-full text-xs text-rose-300 font-semibold transition-all duration-200"
        >
          <span className="material-icons text-rose-400 text-sm">emergency_share</span>
          <span>Crisis Support</span>
        </a>

        {/* Language preference display */}
        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700 text-xs text-gray-300 select-none uppercase">
          {user?.preferred_language ? user.preferred_language.substring(0, 2) : 'en'}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
