import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Sidebar = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: 'dashboard', roles: ['user', 'therapist', 'admin'] },
    { name: 'AI Chatbot', path: '/chat', icon: 'chat', roles: ['user'] },
    { name: 'Voice Chat', path: '/voice', icon: 'mic', roles: ['user'] },
    { name: 'Video Analysis', path: '/video', icon: 'videocam', roles: ['user'] },
    { name: 'AI Journal', path: '/journal', icon: 'edit', roles: ['user'] },
    { name: 'Relaxation Center', path: '/relaxation', icon: 'self_improvement', roles: ['user'] },
    { name: 'Therapist Hub', path: '/therapist', icon: 'psychology', roles: ['therapist', 'admin'] },
    { name: 'Admin Panel', path: '/admin', icon: 'admin_panel_settings', roles: ['admin'] },
    { name: 'Settings', path: '/settings', icon: 'settings', roles: ['user', 'therapist', 'admin'] },
  ];

  const allowedItems = menuItems.filter(item => item.roles.includes(user?.role || 'user'));

  return (
    <aside className="w-64 glass-panel h-screen fixed left-0 top-0 flex flex-col justify-between border-r border-gray-800 z-30">
      <div className="flex flex-col">
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 border-b border-gray-800/80 gap-3">
          <span className="material-icons text-cyan-400 text-3xl">spa</span>
          <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
            MindEase
          </h1>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-4 bg-gray-800/40 rounded-xl border border-gray-700/30 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-semibold text-sm truncate text-gray-100">{user?.name || 'User'}</h4>
            <p className="text-xs text-cyan-400 capitalize">{user?.role || 'Patient'}</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)]">
          {allowedItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200 border border-transparent'
                }`
              }
            >
              <span className="material-icons text-[20px] transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </span>
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={() => {
            onLogout();
            navigate('/auth');
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/35 transition-all duration-200"
        >
          <span className="material-icons text-[18px]">logout</span>
          Logout
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
