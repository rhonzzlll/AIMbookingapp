import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const TopBar = ({ openModal }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  const toggleUserMenu = () => {
    setUserMenuOpen(prev => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('_id');
    localStorage.removeItem('token');
    navigate('/login');
  };

  // 🔽 Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white px-8 py-5 flex items-center justify-between shadow-md relative w-full">      {/* Search Bar */}
      <div className="relative w-72">
        <input
          type="text"
          placeholder="Search"
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Search"
        />
        <span
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        >
          🔍
        </span>
      </div>

      {/* Top Bar Actions */}
      <div className="flex items-center gap-4 relative" ref={menuRef}>
        <button
          className="text-gray-600 p-1 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          onClick={toggleUserMenu}
          aria-label="User Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.121 17.804A9.001 9.001 0 0112 15a9.001 9.001 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>

        {userMenuOpen && (
          <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg w-48 z-10">
            <div
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => console.log('Profile clicked')}
            >
              Profile
            </div>
            <div
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={handleLogout}
            >
              Logout
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopBar;
