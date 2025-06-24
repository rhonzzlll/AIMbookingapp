import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdEmail, MdLock } from 'react-icons/md';
import AIMLogo from '../../images/AIM_Logo.png';
import AIMlogotest from '../../images/AIM_bldg.jpg';
import { AuthContext } from '../../context/AuthContext';
import { useMsal } from "@azure/msal-react";

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); // <-- Add error message state
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);
  const { instance } = useMsal();

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
    setErrorMsg(''); // Clear previous error
    try {
      // Use Vite environment variable for API base URI
      const url = `${import.meta.env.VITE_API_URI}/auth`;
      console.log('API URI:', import.meta.env.VITE_API_URI);
      console.log('ALL ENV:', import.meta.env);
      const { data: res } = await axios.post(url, formData);

      // Save auth details in context
      setAuth({
        userId: res.userId,
        token: res.token,
        role: res.role,
      });

      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      // Navigate by role
      const userRole = res.role ? res.role.toLowerCase() : '';
      if (userRole === 'admin' || userRole === 'superadmin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } catch (error) {
      setErrorMsg(
        error.response?.data?.message ||
        'Sorry, your username or password is incorrect. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
const handleMicrosoftLogin = () => {
  instance.loginPopup({
    scopes: ["user.read"],
  }).then(async (response) => {
    try {
      console.log("MSAL login response:", response);
      const { data: res } = await axios.post(
        `${import.meta.env.VITE_API_URI}/auth/microsoft`,
        { idToken: response.idToken }
      );
      console.log("Backend response:", res);
      
      // Ensure we're storing the correct user ID format
      const userId = res.userId || res._id || res.id;
      
      // Store in localStorage manually to ensure it's saved
      localStorage.setItem('userId', userId);
      localStorage.setItem('token', res.token);
      localStorage.setItem('role', res.role);
      
      // Also set in context
      setAuth({
        userId: userId,
        token: res.token,
        role: res.role,
      });
      
      const userRole = res.role ? res.role.toLowerCase() : '';
      if (userRole === 'admin' || userRole === 'superadmin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/home');
      }
    } catch (err) {
      setErrorMsg("Microsoft login failed. Please try again.");
      console.error("Backend error:", err);
    }
  }).catch((error) => {
    setErrorMsg("Microsoft login failed. Please try again.");
    console.error("MSAL error:", error);
  });
};
  return (
    <div className="absolute inset-0 bg-cover bg-center z-0r" style={{ backgroundImage: `url(${AIMlogotest})` }}>
      <div className="flex items-center justify-center min-h-screen bg-black/50">
        <div className="flex rounded-lg shadow-lg overflow-hidden bg-white/80 backdrop-blur-md">
          {/* Left: Logo */}
          <div className="hidden md:flex w-1/2 items-center justify-center bg-gradient-to-br from-blue-300 to-blue-100 shadow-lg">
            <div className="flex flex-col items-center space-y-4 p-6">
              <img src={AIMLogo} alt="Logo" className="w-72 h-auto object-contain" />
              <h2 className="text-xl font-bold text-gray-700">Welcome to AIM </h2>
              <h2 className="text-xl font-bold text-gray-700"> Room Reservation Portal</h2>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="flex w-full md:w-1/2 items-center justify-center px-4 py-6">
            <div className="w-full max-w-md">
              <div className="bg-white rounded-2xl shadow-xl p-10">
                <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-4">Log In</h1>
                <p className="text-gray-500 text-center mb-8">Enter your credentials to access your account</p>
                {/* Error Message */}
                {errorMsg && (
                  <div className="mb-6">
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
                      <strong className="font-bold block mb-1">Sign In Error</strong>
                      <span className="block">{errorMsg}</span>
                    </div>
                  </div>
                )}
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

                  {/* Microsoft 365 SSO Button */}
                  <button
                    type="button"
                    onClick={handleMicrosoftLogin}
                    className="w-full mt-4 bg-white border border-blue-600 text-blue-600 py-3 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 hover:bg-blue-50 transition"
                  >
                    <img src="https://img.icons8.com/color/28/000000/microsoft.png" alt="Microsoft" className="w-6 h-6" />
                    Sign in with Microsoft
                  </button>

                  {/* Forgot Password */}
             
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