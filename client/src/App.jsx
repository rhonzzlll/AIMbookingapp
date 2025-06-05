import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

// Admin Pages
import Bookings from './pages/AdminPage/Bookings';
import Calendar from './pages/AdminPage/Calendar';
import Dashboard from './pages/AdminPage/DashBoard';
import Rooms from './pages/AdminPage/RoomManagement';
import Users from './pages/AdminPage/Users';


import Buildings from './pages/AdminPage/building';
import Categories from './pages/AdminPage/category';
 
import AdminSidebar from './components/AdminComponents/admin-sidebar';

// User Pages
import Home from './pages/UserPage/Home';
import Profile from './pages/UserPage/Profile';
import AccRooms from './pages/UserPage/AccRooms';
import AimRooms from './pages/UserPage/AimRooms';
import Forms from './pages/UserPage/Forms';
import Login from './pages/UserPage/Login'; // Import the Login component
import BuildingDetails from './pages/UserPage/BuildingDetails'; // Import the BuildingDetails component

import './style.css';

const AppContent = () => {
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith('/admin');

    return (
        <div>
            <div style={{ display: 'flex' }}>
                {isAdminRoute && <AdminSidebar />}

                <div style={{ flex: 1, padding: '20px' }}>
                    <Routes>
                        {/* Root path redirect to login */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        
                        {/* Admin Routes */}
                        <Route path="/admin/dashboard" element={
  <ProtectedAdminRoute><Dashboard /></ProtectedAdminRoute>
} />
<Route path="/admin/bookings" element={
  <ProtectedAdminRoute><Bookings /></ProtectedAdminRoute>
} />
<Route path="/admin/calendar" element={
  <ProtectedAdminRoute><Calendar /></ProtectedAdminRoute>
} />
<Route path="/admin/rooms" element={
  <ProtectedAdminRoute><Rooms /></ProtectedAdminRoute>
} />
<Route path="/admin/building" element={
  <ProtectedAdminRoute><Buildings /></ProtectedAdminRoute>
} />
<Route path="/admin/category" element={
  <ProtectedAdminRoute><Categories /></ProtectedAdminRoute>
} />
<Route path="/admin/users" element={
  <ProtectedAdminRoute><Users /></ProtectedAdminRoute>
} />

                        {/* User Routes */}
                        <Route path="/Home" element={<Home />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/building/:buildingId" element={<BuildingDetails />} /> {/* Add this new route */}
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
        <AuthProvider>
            <Router>
                <AppContent />
            </Router>
        </AuthProvider>
    );
};

export default App;