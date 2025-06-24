import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from "react-icons/fa";
import TopBar from '../../components/AdminComponents/TopBar';

// Use env variable for API base
const API_BASE = import.meta.env.VITE_API_URI;

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    oldPassword: '',
    password: '',
    confirmPassword: '',
    isActive: true,
    role: 'User', // <-- Capital U
  });
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [passwordFields, setPasswordFields] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const departments = [
    { label: "Schools", options: ['ASITE', 'WSGSB', 'SZGSDM', 'SEELL', 'Other Units', 'External'] },
    { label: "Departments", options: ["SRF", "IMCG", "Marketing", "ICT", "HR", "Finance", "Registrars"] }
  ];

<<<<<<< HEAD
  const departments = ['ASITE', 'WSGSB', 'SZGSDM', 'SEELL', 'Other Units', 'External'];
=======
useEffect(() => {
  const role = localStorage.getItem('role');
  if (!role || (role.toLowerCase() !== 'admin' && role.toLowerCase() !== 'superadmin')) {
    navigate('/login');
    return;
  }
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c

  fetchUsers();
}, [navigate]);

  // Fetch users with proper auth header
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');

      const response = await fetch(`${API_BASE}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.role) newErrors.role = 'Role is required';

    if (!currentUser) {
      if (!formData.password) newErrors.password = 'Password is required';
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Open add user modal
  const handleAddUser = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      password: '',
      confirmPassword: '',
      isActive: true,
      role: 'User', // <-- Capital U
    });
    setErrors({});
    setShowAddModal(true);
  };

  // Open edit user modal
  const handleEditUser = (user) => {
    setCurrentUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department,
      isActive: user.isActive,
      role: user.role, // <-- Do not use .toLowerCase()
      password: '',
      confirmPassword: '',
      oldPassword: '',
    });
    setErrors({});
    setShowPasswordFields(false);
    setShowEditModal(true);
  };

  // Save new user
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');

      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add user');
      }

      const newUser = await response.json();
      setUsers((prevUsers) => [...prevUsers, newUser.user]);
      setShowAddModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        department: '',
        password: '',
        confirmPassword: '',
        isActive: true,
        role: 'User',
      });
      setErrors({});
    } catch (error) {
      console.error('Error adding user:', error.message);
      alert(error.message);
    }
  };

  // Update existing user
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Authentication token missing');

      const response = await fetch(`${API_BASE}/users/${currentUser.userId || currentUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      const updatedUser = await response.json();
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          (user.userId || user._id) === (updatedUser.userId || updatedUser._id) ? updatedUser : user
        )
      );
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating user:', error.message);
      alert(error.message);
    }
  };

  // Toggle user active status
  const toggleUserStatus = async (userId) => {
    const user = users.find((u) => u._id === userId || u.userId === userId);
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update user status');
      }

      const updatedUser = await response.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) => ((u._id === userId || u.userId === userId) ? updatedUser : u))
      );
    } catch (error) {
      console.error('Error toggling user status:', error.message);
      alert(error.message);
    }
  };

  // Reset password handler (calls the /api/auth/reset-password/:id endpoint)
  const handleResetPassword = async () => {
    if (!resetUser) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/auth/reset-password/${resetUser.userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset password');
      }
      setShowResetModal(false);
      setResetUser(null);
      alert('Password reset successfully. The new password is 123456.');
    } catch (error) {
      alert(error.message); 
    }
  };

  useEffect(() => {
    if (showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [showAddModal]);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedUsers = [...users].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;

    const valA = a[key];
    const valB = b[key];

    // Sort numbers or strings
    if (typeof valA === 'number' && typeof valB === 'number') {
      return direction === 'asc' ? valA - valB : valB - valA;
    }

    return direction === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh' }}>
      <TopBar onSearch={setSearchTerm} />
      <div className="p-4 bg-gray-100 w-full flex flex-col">
        {/* Header with Add User button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">User Management</h1>
          <button
            onClick={handleAddUser}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            + Add User
          </button>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 w-full overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th onClick={() => handleSort('firstName')} className="cursor-pointer px-4 py-2 border-b w-1/6">
                  First Name {sortConfig.key === 'firstName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('lastName')} className="cursor-pointer px-4 py-2 border-b w-1/6">
                  Last Name {sortConfig.key === 'lastName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('email')} className="cursor-pointer px-4 py-2 border-b w-1/4">
                  Email {sortConfig.key === 'email' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('department')} className="cursor-pointer px-4 py-2 border-b w-1/6">
                  School {sortConfig.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-2 border-b w-1/6">Status</th>
                <th className="px-4 py-2 border-b w-1/6">Actions</th>
              </tr>
            </thead>

            <tbody>
              {sortedUsers
                .filter(user =>
                  `${user.firstName} ${user.lastName} ${user.email} ${user.department}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 border-b">{user.firstName}</td>
                    <td className="px-4 py-2 border-b">{user.lastName}</td>
                    <td className="px-4 py-2 border-b">{user.email}</td>
                    <td className="px-4 py-2 border-b">{user.department}</td>
                    <td className="px-4 py-2 border-b">
                      <div className="flex items-center">
                        <span className={`mr-2 ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => toggleUserStatus(user._id || user.userId)}
                          className={`relative inline-flex items-center h-6 rounded-full w-11 ${user.isActive ? 'bg-green-600' : 'bg-gray-300'}`}
                        >
                          <span
                            className={`absolute ${user.isActive ? 'translate-x-6' : 'translate-x-1'
                              } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-800 hover:underline mr-2"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block mb-1 font-medium">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.firstName ? 'border-red-500' : ''}`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.lastName ? 'border-red-500' : ''}`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div className="mb-4">
<<<<<<< HEAD
                <label className="block mb-1 font-medium">School</label>
=======
                <label className="block mb-1 font-medium">School / Department</label>
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.department ? 'border-red-500' : ''}`}
                >
<<<<<<< HEAD
                  <option value="">Select School</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
=======
                  <option value="">Select School or Department</option>
                  {departments.flatMap(group =>
                    group.options.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))
                  )}
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
                </select>
                {errors.department && (
                  <p className="text-red-500 text-sm mt-1">{errors.department}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Role</label>
                <select
                  className={`w-full p-2 border rounded ${errors.role ? 'border-red-500' : ''}`}
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="SuperAdmin">Super Admin</option>
                </select>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.password ? 'border-red-500' : ''}`}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.confirmPassword ? 'border-red-500' : ''}`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span>Active User</span>
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit User</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="mb-4">
                <label className="block mb-1 font-medium">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.firstName ? 'border-red-500' : ''}`}
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.lastName ? 'border-red-500' : ''}`}
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.email ? 'border-red-500' : ''}`}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              <div className="mb-4">
<<<<<<< HEAD
                <label className="block mb-1 font-medium">School</label>
=======
                <label className="block mb-1 font-medium">School / Department</label>
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.department ? 'border-red-500' : ''}`}
                >
<<<<<<< HEAD
                  <option value="">Select School</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
=======
                  <option value="">Select School or Department</option>
                  {departments.flatMap(group =>
                    group.options.map(opt => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))
                  )}
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
                </select>
                {errors.department && (
                  <p className="text-red-500 text-sm mt-1">{errors.department}</p>
                )}
              </div>

              <div className="mb-4">
                <label className="block mb-1 font-medium">Role</label>
                <select
                  className={`w-full p-2 border rounded ${errors.role ? 'border-red-500' : ''}`}
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                  <option value="SuperAdmin">Super Admin</option> {/* <-- Add this line */}
                </select>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
              </div>

              <div className="mb-4 justify-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showPasswordFields}
                    onChange={() => setShowPasswordFields(!showPasswordFields)}
                    className="mr-2"
                  />
                  <span>Forgot Password</span>
                </label>
              </div>

              {showPasswordFields && (
                <div className="mb-4 border rounded p-3">
                  <h3 className="font-semibold mb-2">Change Password</h3>
                  {passwordSuccess && (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded mb-2">
                      {passwordSuccess}
                    </div>
                  )}
                  <div className="mb-2 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type={showPassword.old ? "text" : "password"}
                      name="oldPassword"
                      value={passwordFields.oldPassword}
                      onChange={e => setPasswordFields({ ...passwordFields, oldPassword: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded pr-10"
                      autoComplete="current-password"
                    />
                    <span
                      className="absolute right-3 top-9 cursor-pointer"
                      onClick={() => setShowPassword({ ...showPassword, old: !showPassword.old })}
                    >
                      {showPassword.old ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                  <div className="mb-2 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type={showPassword.new ? "text" : "password"}
                      name="newPassword"
                      value={passwordFields.newPassword}
                      onChange={e => setPasswordFields({ ...passwordFields, newPassword: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded pr-10"
                      autoComplete="new-password"
                    />
                    <span
                      className="absolute right-3 top-9 cursor-pointer"
                      onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                    >
                      {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                  <div className="mb-2 relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      name="confirmPassword"
                      value={passwordFields.confirmPassword}
                      onChange={e => setPasswordFields({ ...passwordFields, confirmPassword: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded pr-10"
                      autoComplete="new-password"
                    />
                    <span
                      className="absolute right-3 top-9 cursor-pointer"
                      onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                    >
                      {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="w-full mt-2 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    disabled={passwordLoading}
                    onClick={async () => {
                      // Password change logic
                      if (passwordFields.newPassword !== passwordFields.confirmPassword) {
                        setPasswordSuccess("");
                        setErrors({ ...errors, confirmPassword: "New passwords do not match" });
                        return;
                      }
                      setPasswordLoading(true);
                      setErrors({});
                      try {
                        const token = localStorage.getItem("token");
                        const response = await fetch(`${API_BASE}/auth/update-password`, {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            email: formData.email,
                            currentPassword: passwordFields.oldPassword,
                            newPassword: passwordFields.newPassword,
                          }),
                        });
                        if (response.ok) {
                          setPasswordSuccess("Password changed successfully!");
                          setPasswordFields({
                            oldPassword: "",
                            newPassword: "",
                            confirmPassword: "",
                          });
                          setTimeout(() => setPasswordSuccess(""), 3000);
                        } else {
                          const errorData = await response.json();
                          setErrors({ ...errors, oldPassword: errorData.message || "Failed to change password" });
                        }
                      } catch (err) {
                        setErrors({ ...errors, oldPassword: "Failed to change password" });
                      } finally {
                        setPasswordLoading(false);
                      }
                    }}
                  >
                    {passwordLoading ? "Changing..." : "Change Password"}
                  </button>
                </div>
              )}

              <div className="mb-4">
                <button
                  type="button"
                  className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
                  onClick={() => {
                    setShowResetModal(true);
                    setResetUser(currentUser);
                  }}
                >
                  Reset Password
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Reset Password</h3>
            <p className="mb-6">Are you sure you want to reset this account's password?</p>
            <div className="flex justify-end">
              <button
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400 transition"
                onClick={() => {
                  setShowResetModal(false);
                  setResetUser(null);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                onClick={handleResetPassword}
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;