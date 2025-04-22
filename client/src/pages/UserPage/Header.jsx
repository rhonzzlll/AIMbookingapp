import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Header = () => {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate(); // For redirection after logout

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const isActive = (path) => {
    return location.pathname === path
      ? 'border-b-2 border-blue-500 text-blue-500'
      : 'text-gray-600 hover:text-blue-500';
  };

  const handleLogout = () => {
    localStorage.removeItem('user'); // Clear user data
    localStorage.removeItem('_id'); // Clear user ID
    localStorage.removeItem('token'); // Clear token
    navigate('/login'); // Redirect to login page
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Navigation */}
          <nav className="flex">
            <Link to="/home" className={`mr-8 pb-2 ${isActive('/home')}`}>
              Dashboard
            </Link>
            <Link to="/profile" className={`mr-8 pb-2 ${isActive('/profile')}`}>
              Profile
            </Link>
          </nav>

          {/* User Profile Section */}
          <div className="flex items-center">
            {user && (
              <div className="mr-4 text-right">
                <p className="font-medium text-gray-800">
                  Welcome back, {user.firstName} {user.lastName}!
                </p>
                <p className="text-sm text-gray-500">Ready to book a room space?</p>
              </div>
            )}
          </div>

          {/* Logout Button */}
          <div className="flex justify-end">
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-200"></div>
    </header>
  );
};

export default Header;