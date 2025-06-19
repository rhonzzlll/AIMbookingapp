import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TopBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('_id');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="px-8 py-5 flex items-center justify-between shadow-md relative w-full text-black">
      {/* Search Box */}
      <div className="relative w-72">
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onSearch) {
              onSearch(searchTerm);
            }
          }}
          placeholder=""
          className="w-full px-4 py-2 pr-10 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
          aria-label="Search"
        />

        {/* Label as Placeholder */}
        {!searchTerm && (
          <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black pointer-events-none">
            Search
          </span>
        )}

        <span
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300"
          aria-hidden="true"
        >
          🔍
        </span>
      </div>

      {/* Logout Button (Icon + Logout) */}
      <button
        className="flex items-center gap-2 text-black p-2 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors"
        onClick={handleLogout}
      >
        {/* User Icon */}
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
        Logout
      </button>
    </div>
  );
};

export default TopBar;
