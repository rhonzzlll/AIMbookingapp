import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdEmail, MdLock } from 'react-icons/md';
import AIMLogo from '../../images/AIM_Logo.png';
import AIMlogotest from '../../images/AIM_bldg.jpg';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setFormData((prev) => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = 'http://localhost:5000/api/auth';
      const { data: res } = await axios.post(url, formData);

      // Debug response
      console.log('Login response:', res);
      console.log('User role from server:', res.role);

      // Save auth details - updating to use userId instead of _id
      localStorage.setItem('userId', res.userId);
      localStorage.setItem('token', res.token);
      localStorage.setItem('role', res.role);

      // Debug saved role
      console.log('Role saved to localStorage:', res.role);
      
      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Navigate by role - using more explicit check for admin
      const userRole = res.role ? res.role.toLowerCase() : '';
      console.log('Normalized role for navigation check:', userRole);
      
      if (userRole === 'admin') {
        console.log('Navigating to admin dashboard');
        navigate('/admin/dashboard');
      } else {
        console.log('Navigating to home');
        navigate('/home');
      }
    } catch (error) {
      console.error('Error during login:', error.response?.data?.message || error.message);
      alert(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 bg-cover bg-center z-0r" style={{ backgroundImage: `url(${AIMlogotest})` }}>
      <div className="flex items-center justify-center min-h-screen bg-black/50">
      <div className="flex rounded-lg shadow-lg overflow-hidden bg-white/80 backdrop-blur-md">
      {/* Left: Logo */}
      <div className="hidden md:flex w-1/2 items-center justify-center bg-gradient-to-br from-blue-300 to-blue-100 shadow-lg">
        <div className="flex flex-col items-center space-y-4 p-6">
          <img src={AIMLogo} alt="Logo" className="w-72 h-auto object-contain" />
          <h2 className="text-xl font-bold text-gray-700">Welcome to AIM Portal!</h2>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="flex w-full md:w-1/2 items-center justify-center px-4 py-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-10">
            <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-4">Log In</h1>
            <p className="text-gray-500 text-center mb-8">Enter your credentials to access your account</p>
            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <div className="flex items-center border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="pl-4 text-gray-400 text-xl">
                    <MdEmail />
                  </span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full p-4 pl-2 outline-none rounded-r-lg"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="flex items-center border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-blue-500">
                  <span className="pl-4 text-gray-400 text-xl">
                    <MdLock />
                  </span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    className="w-full p-4 pl-2 outline-none rounded-r-lg"
                    required
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center mb-6">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="mr-2"
                />
                <label htmlFor="remember" className="text-sm text-gray-600">Remember me</label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold text-lg transition-transform duration-200 transform hover:scale-105 shadow-md"
              >
                {loading ? 'Logging in...' : 'Log In'}
              </button>

              {/* Forgot Password */}
              <div className="text-center mt-4">
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline font-medium">
                  Forgot Password?
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
};

export default Login;

