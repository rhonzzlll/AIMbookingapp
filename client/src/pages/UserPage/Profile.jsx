import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Header from './Header';
import home from "../../images/home.png";
import imageCompression from 'browser-image-compression';
import { FaEye, FaEyeSlash } from "react-icons/fa"; // Add this import at the top

const API_BASE_URL = import.meta.env.VITE_API_URI; // Use env variable

const Profile = () => {
  // Grouped options for toggleable select
  const departmentGroups = [
    { label: "Schools", options: ['ASITE', 'WSGSB', 'SZGSDM', 'SEELL', 'Other Units', 'External'] },
    { label: "Departments", options: ["SRF", "IMCG", "Marketing", "ICT", "HR", "Finance", "Registrars", "Others"] }
  ];

  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role");
  
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    birthdate: '',
    department: '',
    email: '',
    profileImage: '',
    role: ''
  });

  const [profileImageFile, setProfileImageFile] = useState(null);
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
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = response.data;
        setUser({
          firstName: userData.firstName,
          lastName: userData.lastName,
          department: userData.department || '',
          birthdate: userData.birthdate || '',
          email: userData.email,
          profileImage: userData.profileImage || '',
          role: userData.role || userRole || '',
        });

        // Set preview image with proper URL path
        if (userData.profileImage) {
          setPreviewImage(`${API_BASE_URL}/uploads/${userData.profileImage}`);
        }
      } catch (error) {
        setUseLocalData(true);

        const firstName = localStorage.getItem('firstName') || '';
        const lastName = localStorage.getItem('lastName') || '';
        const email = localStorage.getItem('email') || '';

        setUser({
          firstName,
          lastName,
          email,
          department: 'ICT',
          role: userRole || 'User',
          profileImage: '',
          birthdate: '',
        });

        setError('Could not fetch profile data from server. Using available local data.');
      }
    };

    if (userId) {
      fetchUserData();
    } else {
      setError('User ID not found. Please log in again.');
    }
  }, [userId, token, userRole, API_BASE_URL]);

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

  // Handle profile image selection with compression
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setError('Image file is too large. Please select an image under 10MB.');
          setLoading(false);
          return;
        }

        setProfileImageFile(file);

        // Compress image for preview
        const previewOptions = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.8,
        };

        const compressedFile = await imageCompression(file, previewOptions);

        // Generate preview
        const reader = new FileReader();
        reader.onload = () => {
          setPreviewImage(reader.result);
        };
        reader.readAsDataURL(compressedFile);
      } catch (error) {
        setError('Failed to process image. Please try a different file.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Handle form submission - updated for image upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!userId) {
        toast.error("User ID is missing. Please log in again.");
        setLoading(false);
        return;
      }

      let uploadedImageName = user.profileImage;

      // 1. If a new image is selected, upload it first
      if (profileImageFile) {
        const formData = new FormData();
        formData.append('profileImage', profileImageFile);

        const uploadRes = await fetch(`${API_BASE_URL}/users/${userId}/upload-profile-image`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (uploadRes.ok) {
          const data = await uploadRes.json();
          uploadedImageName = data.filename;
        } else {
          const err = await uploadRes.json().catch(() => null);
          toast.error(err?.error || "Failed to upload image");
          setLoading(false);
          return;
        }
      }

      // 2. Now update the user profile with the new image filename
      const payload = {
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department,
        birthdate: user.birthdate,
        profileImage: uploadedImageName,
      };

      if (userRole && userRole.toLowerCase() === "admin") {
        payload.role = user.role;
        if (user.isActive !== undefined) payload.isActive = user.isActive;
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        if (uploadedImageName) {
          setPreviewImage(`${API_BASE_URL}/uploads/${uploadedImageName}`);
        }
        // Update localStorage so HomePage can use the latest image
        localStorage.setItem('profileImage', uploadedImageName || '');
        localStorage.setItem('firstName', updatedUser.firstName || '');
        localStorage.setItem('lastName', updatedUser.lastName || '');
        // Notify HomePage to refresh user info
        window.dispatchEvent(new Event('userProfileUpdated'));
        toast.success("Profile updated successfully!");
        setSuccess("Profile updated successfully!");

        // Clear the success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error("Something went wrong! Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle password change - updated for Sequelize model
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validate password match
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.put(
        `${API_BASE_URL}/auth/update-password`,
        {
          email: user.email,
          currentPassword: passwords.oldPassword,
          newPassword: passwords.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        toast.success('Password changed successfully');
        setSuccess('Password changed successfully!');
        setPasswords({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        toast.error('Failed to change password. Please try again.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
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
    <div className="relative w-full overflow-x-auto">
      {/* Fixed Background Image and Overlay */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${home})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-10" />
      </div>

      {/* Scrollable Foreground Layer */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
          <Header />
        </header>

        <div className="container mx-auto px-4 pt-24 pb-8">
          <h1 className="text-2xl font-bold mb-6">Profile Information</h1>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
          {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>}
          {useLocalData && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              Using data from local storage. Some information may not be up to date.
            </div>
          )}

          <div className="bg-white bg-opacity-90 shadow-md rounded-lg p-6 mb-6">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">School / Department</label>
                    <select
                      name="department"
                      value={user.department}
                      onChange={handleInputChange}
                      className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select School or Department</option>
                      {departmentGroups.flatMap(group =>
                        group.options.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))
                      )}
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
          <div className="bg-white bg-opacity-90 shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
            {/* Success message for password change */}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}
            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type={showPassword.old ? "text" : "password"}
                  name="oldPassword"
                  value={passwords.oldPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                />
                <span
                  className="absolute right-3 top-9 cursor-pointer"
                  onClick={() => setShowPassword({ ...showPassword, old: !showPassword.old })}
                >
                  {showPassword.old ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type={showPassword.new ? "text" : "password"}
                  name="newPassword"
                  value={passwords.newPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                />
                <span
                  className="absolute right-3 top-9 cursor-pointer"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                >
                  {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                </span>
              </div>

              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type={showPassword.confirm ? "text" : "password"}
                  name="confirmPassword"
                  value={passwords.confirmPassword}
                  onChange={handlePasswordChange}
                  className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                  required
                />
                <span
                  className="absolute right-3 top-9 cursor-pointer"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                >
                  {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                </span>
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
    </div>       
  );
};

export default Profile;