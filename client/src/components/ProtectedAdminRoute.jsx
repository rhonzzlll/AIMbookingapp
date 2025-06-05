import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedAdminRoute = ({ children }) => {
  const { token, role } = useAuth();

  // Not logged in or not admin? Redirect to login
  if (!token || !role || role.toLowerCase() !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  // Otherwise, render the children (admin page)
  return children;
};

export default ProtectedAdminRoute;