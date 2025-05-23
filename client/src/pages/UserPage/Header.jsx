import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import FacilityModal from '../../components/FacilityModal';
import AIMLogo from "../../images/AIM_Logo.png";

const Header = () => {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate(); // For redirection after logout
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // NEW: State for buildings data
  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    // NEW: Fetch buildings when Header mounts
    const fetchBuildings = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/buildings');
        if (!response.ok) throw new Error('Failed to fetch buildings');
        const data = await response.json();
        setBuildings(data);
      } catch (err) {
        console.error('Error fetching buildings:', err);
      }
    };
    fetchBuildings();
  }, []);

  const isActive = (path) => {
    return location.pathname === path
      ? 'border-b-2 border-blue-500 text-blue-500'
      : 'text-gray-600 hover:text-blue-500';
  };

  const handleLogout = () => {
    localStorage.removeItem('user'); // Clear user data
    localStorage.removeItem('userId'); // Clear user ID
    localStorage.removeItem('token'); // Clear token
    navigate('/login'); // Redirect to login page
  };

  return (
    <>
      <header className="bg-white shadow-md h-20 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center">
          {/* Navigation */}
          <nav className="flex">
            <Link to="/home" className={`mr-8 pb-2 ${isActive('/home')}`}>
              Dashboard
            </Link>
            <Link to="/profile" className={`mr-8 pb-2 ${isActive('/profile')}`}>
              Profile
            </Link>
          </nav>

          {/* Center: Logo */}
          <div className="flex flex-1 justify-center">
            <img
              src={AIMLogo}
              alt="Company Logo"
              className="h-24 object-contain"
            />
          </div>

          {/* User Profile Section */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFacilityModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Book Now
            </button>

            <div className="relative">
              {/* Profile Button */}
              <button
                className="text-blue-400 p-2 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="User Menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.121 17.804A10.942 10.942 0 0112 15c2.5 0 4.847.832 6.879 2.228M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>

              {userMenuOpen && (
                <div className="absolute right-[12px] mt-[16px] bg-white border border-blue-200 rounded-md shadow-lg w-48 z-10">
                  <div
                    className="px-4 py-2 hover:bg-blue-100 text-blue-800 cursor-pointer"
                    onClick={handleLogout}
                  >
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200"></div>

        {/* NEW: Pass buildings to FacilityModal */}
        {showFacilityModal && (
          <FacilityModal buildings={buildings} onClose={() => setShowFacilityModal(false)} />
        )}
      </header>
    </>
  );
};

export default Header;
