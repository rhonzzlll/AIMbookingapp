import React, { useState, useEffect } from 'react';
import TopBar from '../../components/AdminComponents/TopBar'; // Adjust the path as needed

const Users = () => {
  const [users, setUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    department: '',
    password: '',
    confirmPassword: '',
    isActive: true,
    role: 'user',
  });
  const [errors, setErrors] = useState({});

  const departments = ['ICT', 'HR', 'Finance', 'Marketing', 'Operations'];

  // Fetch users from the backend when the component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/users', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error.message);
        alert(error.message);
      }
    };

    fetchUsers();
  }, []);

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
      role: 'user',
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
      role: user.role.toLowerCase(),
      password: '',
      confirmPassword: '',
    });
    setErrors({});
    setShowEditModal(true);
  };

  // Save new user
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
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
        role: 'user',
      });
      setErrors({});
    } catch (error) {
      console.error('Error adding user:', error.message);
      alert(error.message);
    }
  };

  // Update existing user
  const handleUpdateUser = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${currentUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user');
      }

      const updatedUser = await response.json();
      setUsers((prevUsers) =>
        prevUsers.map((user) => (user._id === updatedUser._id ? updatedUser : user))
      );
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating user:', error.message);
      alert(error.message);
    }
  };

  // Toggle user active status
  const toggleUserStatus = async (userId) => {
    const user = users.find((u) => u._id === userId);
    if (!user) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user status');
      }

      const updatedUser = await response.json();
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u._id === updatedUser._id ? updatedUser : u))
      );
    } catch (error) {
      console.error('Error toggling user status:', error.message);
      alert(error.message);
    }
  };

  return (
    <div>
      <TopBar />
      <div className="p-4 bg-gray-100 min-h-screen w-full flex flex-col" style={{ marginTop: '60px' }}>
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
                <th className="px-4 py-2 border-b w-1/6">First Name</th>
                <th className="px-4 py-2 border-b w-1/6">Last Name</th>
                <th className="px-4 py-2 border-b w-1/4">Email</th>
                <th className="px-4 py-2 border-b w-1/6">Department</th>
                <th className="px-4 py-2 border-b w-1/6">Status</th>
                <th className="px-4 py-2 border-b w-1/6">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
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
                        onClick={() => toggleUserStatus(user._id)}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 ${user.isActive ? 'bg-green-600' : 'bg-gray-300'
                          }`}
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
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
                <label className="block mb-1 font-medium">Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.department ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
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
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
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

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdateUser();
            }}>
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
                <label className="block mb-1 font-medium">Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${errors.department ? 'border-red-500' : ''}`}
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
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
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                {errors.role && <p className="text-red-500 text-sm mt-1">{errors.role}</p>}
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
    </div>
  );
};

export default Users;