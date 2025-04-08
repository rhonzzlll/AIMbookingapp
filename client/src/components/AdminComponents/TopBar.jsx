import React, { useState } from 'react';

const TopBar = ({ openModal }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleUserMenu = () => {
    setUserMenuOpen(!userMenuOpen);
  };

  return (
    <div className="bg-white py-4 flex items-center justify-between shadow-md relative w-full">
      {/* Search Bar */}
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
      <div className="flex items-center gap-4">
        {/* Add Booking Button */}
        <button
          className="text-gray-600 text-xl p-1 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          onClick={() => openModal('bookingModal')}
          aria-label="Add Booking"
        >
          ➕
        </button>

        {/* User Menu Toggle */}
        <button
          className="text-gray-600 text-xl p-1 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          onClick={toggleUserMenu}
          aria-label="User Menu"
        >
          👤
        </button>

        {/* User Menu */}
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
              onClick={() => console.log('Logout clicked')}
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


