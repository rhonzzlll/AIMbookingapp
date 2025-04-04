import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

// Admin Pages
import Bookings from './pages/AdminPage/Bookings';
import Calendar from './pages/AdminPage/Calendar';
import Dashboard from './pages/AdminPage/DashBoard';
import Rooms from './pages/AdminPage/RoomManagement';
import Users from './pages/AdminPage/Users';
import AdminSidebar from './components/AdminComponents/admin-sidebar';

// User Pages
import Home from './pages/UserPage/Home';
import Profile from './pages/UserPage/Profile';
import AccRooms from './pages/UserPage/AccRooms';
import AimRooms from './pages/UserPage/AimRooms';
import Forms from './pages/UserPage/Forms';
import Login from './pages/UserPage/Login'; // Import the Login component

import './style.css';

const AppContent = () => {
    const location = useLocation();

    // Check if the current route is for admin pages
    const isAdminRoute = location.pathname.startsWith('/admin');

    return (
        <div>
            <div style={{ display: 'flex' }}>
                {/* Conditionally render AdminSidebar for admin routes */}
                {isAdminRoute && <AdminSidebar />}

                {/* Main Content */}
                <div style={{ flex: 1, padding: '20px' }}>
                    <Routes>
                        {/* Admin Routes */}
                        <Route path="/admin/dashboard" element={<Dashboard />} />
                        <Route path="/admin/bookings" element={<Bookings />} />
                        <Route path="/admin/calendar" element={<Calendar />} />
                        <Route path="/admin/rooms" element={<Rooms />} />
                        <Route path="/admin/users" element={<Users />} />

                        {/* User Routes */}
                        <Route path="/Home" element={<Home />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/acc-rooms" element={<AccRooms />} />
                        <Route path="/aim-rooms" element={<AimRooms />} />
                        <Route path="/forms" element={<Forms />} />
                        <Route path="/login" element={<Login />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    return (
        <Router>
            <AppContent />
        </Router>
    );
};

export default App;