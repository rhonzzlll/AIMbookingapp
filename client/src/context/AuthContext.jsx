import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({
    userId: localStorage.getItem('userId'),
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role'),
  });

  // Keep localStorage in sync with context
  useEffect(() => {
    if (auth.token) {
      localStorage.setItem('userId', auth.userId);
      localStorage.setItem('token', auth.token);
      localStorage.setItem('role', auth.role);
    } else {
      localStorage.removeItem('userId');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
    }
  }, [auth]);

  return (
    <AuthContext.Provider value={{ ...auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};