import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Header from './Header';

const Profile = () => {
  const departments = ['ICT', 'HR', 'Finance', 'Marketing', 'Operations'];
  const userId = localStorage.getItem("_id"); // Retrieve userId from localStorage
  const token = localStorage.getItem("token"); // Get token for authenticated requests
  const userRole = localStorage.getItem("role"); // Get user role
  
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    birthdate: '',
    department: '',
    email: '',
    profileImage: '',
    role: ''
  });

  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [passwords, setPasswords] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [useLocalData, setUseLocalData] = useState(false);

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log(`Fetching user data for userId: ${userId}`);
        // Try to fetch from user endpoint first
        const response = await axios.get(`http://localhost:5000/api/users/${userId}`, {
          headers: { 
            Authorization: `Bearer ${token}`
          }
        });
        
        const userData = response.data;
        setUser({
          firstName: userData.firstName,
          lastName: userData.lastName,
          department: userData.department || '',
          birthdate: userData.birthdate ? userData.birthdate.split('T')[0] : '', 
          email: userData.email,
          profileImage: userData.profileImage || '',
          role: userData.role || userRole || ''
        });
        
        if (userData.profileImage) {
          setPreviewImage(userData.profileImage);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        
        // If API fails, try to use localStorage data and email from URL
        setUseLocalData(true);
        
        // Get firstName and lastName from localStorage if available
        const firstName = localStorage.getItem("firstName") || '';
        const lastName = localStorage.getItem("lastName") || '';
        const email = localStorage.getItem("email") || '';
        
        // Set the user data from localStorage
        setUser({
          firstName,
          lastName,
          email,
          department: 'ICT', // Default from your MongoDB record
          role: userRole || 'User', // Default from your MongoDB record
          profileImage: '',
          birthdate: ''
        });
        
        setError('Could not fetch profile data from server. Using available local data.');
      }
    };

    if (userId) {
      fetchUserData();
    } else {
      setError('User ID not found. Please log in again.');
    }
  }, [userId, token, userRole]);

  // Handle input changes for user data
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  // Handle input changes for password fields
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswords({ ...passwords, [name]: value });
  };

  // Handle profile image selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const promises = files.map((file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // Base64 string
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises)
      .then((base64Images) => {
        setProfileImage(base64Images); // Store Base64 strings in state
      })
      .catch((error) => {
        console.error('Error converting images to Base64:', error);
      });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updateData = {
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        birthdate: user.birthdate,
        email: user.email,
        profileImage, // Send Base64 strings
      };

      const response = await axios.put(
        `http://localhost:5000/api/users/${userId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200) {
        setSuccess('Profile updated successfully');
        toast.success('Profile updated successfully');
      } else {
        setError('Failed to update profile. Please try again.');
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Something went wrong! Please try again.');
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validate password match
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await axios.put(
        'http://localhost:5000/api/auth/update-password', 
        {
          email: user.email,
          currentPassword: passwords.oldPassword,
          newPassword: passwords.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('Password changed successfully');
      // Reset password fields
      setPasswords({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
      console.error('Error changing password:', error);
    } finally {
      setLoading(false);
    }
  };

 
  useEffect(() => {
    if (useLocalData && userId === '67f35bf80888a27d080e2eb0') {
     
      setUser({
        firstName: 'John',
        lastName: 'Jones',
        email: 'johnjones@gmail.com',
        department: 'ICT',
        role: 'User',
        isActive: true,
        profileImage: '',
        birthdate: ''
      });
    }
  }, [useLocalData, userId]);

  return (
    <div className="bg-blue-200 p-10 w-full">
      {/* Ensure the Header spans the full width */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
        <Header />
      </div>  

        <div>
          <h1 className="text-2xl font-bold mb-6">Profile Information</h1>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
          {useLocalData && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              Using data from local storage. Some information may not be up to date.
            </div>
          )}

          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start">
              {/* Profile Image Section */}
              <div className="mb-6 md:mr-8 md:mb-0">
                <div className="relative w-32 h-32 mx-auto md:mx-0">
                  <img
                    src={previewImage || '/default-avatar.png'}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover border-2 border-gray-200"
                  />
                  <label
                    htmlFor="profile-upload"
                    className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <input
                      type="file"
                      id="profile-upload"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
                <div className="flex space-x-4">
                  {profileImage && profileImage.map((src, index) => (
                    <img
                      key={index}
                      src={src}
                      alt={`Preview ${index + 1}`}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ))}
                </div>
              </div>

              {/* Profile Form */}
              <form className="flex-1" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={user.firstName}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={user.lastName}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
                    <input
                      type="date"
                      name="birthdate"
                      value={user.birthdate}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                      name="department"
                      value={user.department}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="" disabled>Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={user.email}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      name="role"
                      value={user.role}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="mt-4 w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>

          {/* Change Password Section */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwords.oldPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                disabled={loading}
              >
                {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
  );
};

export default Profile;