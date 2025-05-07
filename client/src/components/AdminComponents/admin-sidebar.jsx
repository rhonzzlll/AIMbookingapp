import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';

const AdminSidebar = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('');

  useEffect(() => {
    // Set active tab based on current location
    const currentPath = location.pathname;
    const matchingItem = navItems.find(item => 
      currentPath === item.path || 
      (item.children && item.children.some(child => currentPath === child.path))
    );
    
    if (matchingItem) {
      setActiveTab(matchingItem.id);
      
      // If it's a child route, expand the parent
      if (matchingItem.children) {
        setExpandedItems(prev => ({
          ...prev,
          [matchingItem.id]: true
        }));
      }
      
      // Check for child routes
      if (!matchingItem.children) {
        const parentItem = navItems.find(item => 
          item.children && item.children.some(child => currentPath === child.path)
        );
        
        if (parentItem) {
          const childItem = parentItem.children.find(child => currentPath === child.path);
          if (childItem) {
            setActiveTab(childItem.id);
            setExpandedItems(prev => ({
              ...prev,
              [parentItem.id]: true
            }));
          }
        }
      }
    }
  }, [location.pathname]);

  useEffect(() => {
    // Fetch user details using token authentication
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId'); // Changed from '_id' to 'userId'
        
        if (!token || !userId) {
          console.error('No authentication token or user ID found');
          setLoading(false);
          return;
        }

        const response = await axios.get(`http://localhost:5000/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        setUser(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user details:', error);
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const toggleDropdown = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const navItems = [
    { id: 'dashboard', icon: '📊', text: 'Dashboard', path: '/admin/dashboard' },
    { id: 'calendar', icon: '📅', text: 'Calendar', path: '/admin/calendar' },
    {
      id: 'rooms',
      icon: '🏢',
      text: 'Rooms',
      path: '/admin/rooms',
      children: [
        {
          id: 'building',
          text: 'Building',
          path: '/admin/building',
        },
        {
          id: 'category',
          text: 'Category',
          path: '/admin/category',
        },
        
      ],
    },
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
              {item.children ? (
                <div>
                  <div 
                    className={`flex items-center justify-between px-6 py-3 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer ${
                      activeTab === item.id ? 'bg-blue-700 text-white' : 'text-gray-300'
                    }`}
                  >
                    <Link
                      to={item.path}
                      className="flex items-center flex-grow"
                      onClick={() => setActiveTab(item.id)}
                    >
                      <span className="mr-4 text-lg">{item.icon}</span>
                      <span className="text-sm font-medium">{item.text}</span>
                    </Link>
                    <span 
                      className="text-xs ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDropdown(item.id);
                      }}
                    >
                      {expandedItems[item.id] ? '▼' : '►'}
                    </span>
                  </div>
                  
                  {/* Dropdown items */}
                  {expandedItems[item.id] && (
                    <ul className="bg-gray-700 py-2">
                      {item.children.map(child => (
                        <li key={child.id}>
                          <Link
                            to={child.path}
                            className={`flex items-center pl-14 pr-6 py-2 text-gray-300 hover:bg-blue-600 hover:text-white transition-colors ${
                              activeTab === child.id ? 'bg-blue-600 text-white' : ''
                            }`}
                            onClick={() => setActiveTab(child.id)}
                          >
                            <span className="text-sm font-medium">{child.text}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center px-6 py-3 text-gray-300 hover:bg-blue-600 hover:text-white transition-colors ${
                    activeTab === item.id ? 'bg-blue-700 text-white' : ''
                  }`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <span className="mr-4 text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.text}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* Sidebar Footer */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center">
          <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center mr-3">
            {user?.firstName?.charAt(0).toUpperCase() || (loading ? '...' : '?')}
          </div>
          <div>
            {loading ? (
              <div className="text-sm font-medium">Loading...</div>
            ) : (
              <>
                <div className="text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : 'User not found'}
                </div>
                <div className="text-xs text-gray-400">{user?.role || ''}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;