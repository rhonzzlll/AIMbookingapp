import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Bookings from './pages/AdminPage/Bookings';
import Calendar from './pages/AdminPage/Calendar';
import Dashboard from './pages/AdminPage/DashBoard';
import Rooms from './pages/AdminPage/Rooms';
import Users from './pages/AdminPage/Users';
import AdminSidebar from './components/AdminComponents/admin-sidebar';
import AdminTopBar from './components/AdminComponents/TopBar';

import './style.css';

const AppContent = () => {
    const location = useLocation();

    return (
        <div>
            {/* Conditionally render AdminTopBar */}
            {location.pathname !== '/calendar' && <AdminTopBar />}

            <div style={{ display: 'flex' }}>
                {/* Admin Sidebar */}
                <AdminSidebar />

                {/* Main Content */}
                <div style={{ flex: 1, padding: '20px' }}>
                    <Routes>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/bookings" element={<Bookings />} />
                        <Route path="/calendar" element={<Calendar />} />
                        <Route path="/rooms" element={<Rooms />} />
                        <Route path="/users" element={<Users />} />
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