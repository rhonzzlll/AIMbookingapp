import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'dashboard', icon: '📊', text: 'Dashboard', path: '/admin/dashboard' },
    { id: 'calendar', icon: '📅', text: 'Calendar', path: '/admin/calendar' },
    { id: 'rooms', icon: '🏢', text: 'Rooms', path: '/admin/rooms' },
    { id: 'bookings', icon: '📝', text: 'Bookings', path: '/admin/bookings' },
    { id: 'users', icon: '👥', text: 'Users', path: '/admin/users' },
  ];

  return (
    <div className="fixed top-0 left-0 h-screen w-64 bg-gray-800 text-white flex flex-col shadow-lg">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-center">AIM Booking App</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-grow overflow-y-auto">
        <ul className="space-y-1 py-4">
          {navItems.map((item) => (
            <li key={item.id}>
              <Link
                to={item.path}
                className={`flex items-center px-6 py-3 text-gray-300 hover:bg-blue-600 hover:text-white transition-colors ${activeTab === item.id ? 'bg-blue-700 text-white' : ''
                  }`}
                onClick={() => setActiveTab(item.id)}
              >
                <span className="mr-4 text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center">
          <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
            A
          </div>
          <div>
            <div className="text-sm font-medium">Admin</div>
            <div className="text-xs text-gray-400">System Administrator</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;