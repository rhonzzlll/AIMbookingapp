import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

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
                        <Route path="/admin/dashboard" element={<Dashboard />} />
                        <Route path="/admin/bookings" element={<Bookings />} />
                        <Route path="/admin/calendar" element={<Calendar />} />
                        {/* Admin Routes */}
<Route path="/admin/rooms" element={<Rooms />} />           // Parent: rooms path="/admin/rooms"
<Route path="/admin/building" element={<Buildings />} />    // Child: building path="/admin/building"
<Route path="/admin/category" element={<Categories />} />   // Child: category path="/admin/category" 
    // Child: room path="/admin/room"
                        <Route path="/admin/users" element={<Users />} />   

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