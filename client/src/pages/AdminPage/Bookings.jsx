import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import TopBar from '../../components/AdminComponents/TopBar';

const formatDate = (date) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

const parseISODate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

// Format time between 12-hour and 24-hour formats
const convertTo24HourFormat = (time12h) => {
  if (!time12h) return '';
  
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  
  if (hours === '12') {
    hours = modifier === 'PM' ? '12' : '00';
  } else {
    hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours.padStart(2, '0');
  }
  
  return `${hours}:${minutes}`;
};
 

// Base API URL
const API_BASE_URL = 'http://localhost:5000/api';

// Predefined options for dropdowns
const DEPARTMENTS = ['Engineering', 'Marketing', 'HR', 'Finance', 'Sales', 'IT', 'ICT'];
const BUILDINGS = ['ACC Building', 'AIM Building'];

// Room categories by building
const BUILDING_CATEGORIES = {
  'ACC Building': [
    'Hybrid Caseroom',
    'Regular Caseroom',
    'Flat Room',
    'Meeting Room',
    'Ministudio',
  ],
  'AIM Building': [
    'Hybrid Caseroom',
    'Flat Room',
    'Open Area',
    'Meeting Room',
  ]
};

// Initial form state
const initialFormState = {
  title: '',
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  category: '',
  room: '',
  building: '',
  date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  startTime: null,
  endTime: null,
  notes: '',
  recurring: 'No',
  recurrenceEndDate: '',
  status: 'pending',
};

// Time options for dropdowns
const TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
];

// Tab Button Component
const TabButton = ({ label, active, onClick }) => (
  <button
    className={`px-4 py-2 font-medium rounded-lg transition ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

const Bookings = () => {
  // State for bookings data and filtering
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeBookingTab, setActiveBookingTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // State for modal controls
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBookingId, setEditBookingId] = useState(null);
  
  // State for room data
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Get token from localStorage
  const token = localStorage.getItem('token');

  // Fetch bookings data
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch rooms data
  const fetchRooms = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(response.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  }, [token]);

  // Fetch users data
  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  }, [token]);

  // Initialize data on component mount
  useEffect(() => {
    fetchBookings();
    fetchRooms();
    fetchUsers();
  }, [fetchBookings, fetchRooms, fetchUsers]);

  // Filter bookings based on active tab
  const filteredBookings = useMemo(() => {
    if (activeBookingTab === 'all') return bookings;
    
    return bookings.filter(booking => {
      if (activeBookingTab === 'pending') return booking.status === 'pending';
      if (activeBookingTab === 'approved') return booking.status === 'confirmed';
      if (activeBookingTab === 'declined') return booking.status === 'declined';
      return true;
    });
  }, [bookings, activeBookingTab]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const indexOfLastBooking = currentPage * itemsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking);

  // Pagination handlers
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Modal handlers
  const handleAddNewClick = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const handleEditClick = (booking) => {
    setFormData({
      ...booking,
      date: parseISODate(booking.date),
      startTime: new Date(booking.startTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      endTime: new Date(booking.endTime).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      recurring: booking.recurring || 'No',
      recurrenceEndDate: booking.recurrenceEndDate ? parseISODate(booking.recurrenceEndDate) : '',
    });
    
    setEditBookingId(booking._id);
    setIsEditModalOpen(true);
    
    // Update available rooms based on selected building and category
    if (booking.building) {
      setCategories(BUILDING_CATEGORIES[booking.building] || []);
      
      if (booking.category) {
        const availableRooms = rooms.filter(
          room => room.building === booking.building && room.category === booking.category
        );
        setAvailableRooms(availableRooms);
      }
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) {
      return;
    }
    
    try {
      await axios.delete(`${API_BASE_URL}/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBookings(); // Refresh the bookings list
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError('Failed to delete booking. Please try again.');
    }
  };

  // Form states
  const [formData, setFormData] = useState({ ...initialFormState });
  const [formError, setFormError] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);

  // Reset form to initial state
  const resetForm = () => {
    setFormData({ ...initialFormState });
    setFormError({});
    setCategories([]);
    setAvailableRooms([]);
  };

  // Form input handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Reset dependent fields when changing building or category
    if (name === 'building') {
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        category: '',
        room: ''
      }));
      
      // Update available categories
      setCategories(BUILDING_CATEGORIES[value] || []);
      setAvailableRooms([]);
    } 
    else if (name === 'category') {
      setFormData(prev => ({ 
        ...prev,
        [name]: value,
        room: ''
      }));
      
      // Update available rooms
      if (formData.building && value) {
        const filteredRooms = rooms.filter(
          room => room.building === formData.building && room.category === value
        );
        setAvailableRooms(filteredRooms);
      }
    }
    
    // Clear related errors
    if (name === 'firstName' || name === 'lastName') {
      setFormError(prev => ({ ...prev, name: '' }));
    }
  };

  // Handle time selection
  const handleTimeChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate start time before end time
    if (field === 'startTime' && formData.endTime) {
      const start = convertTo24HourFormat(value);
      const end = convertTo24HourFormat(formData.endTime);
      
      if (start >= end) {
        setFormError(prev => ({ 
          ...prev, 
          time: 'Start time must be before end time' 
        }));
      } else {
        setFormError(prev => ({ ...prev, time: '' }));
      }
    }
    
    if (field === 'endTime' && formData.startTime) {
      const start = convertTo24HourFormat(formData.startTime);
      const end = convertTo24HourFormat(value);
      
      if (start >= end) {
        setFormError(prev => ({ 
          ...prev, 
          time: 'End time must be after start time' 
        }));
      } else {
        setFormError(prev => ({ ...prev, time: '' }));
      }
    }
  };

  // Handle user selection
  const handleUserSelect = (user) => {
    setFormData(prev => ({
      ...prev,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department || ''
    }));
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    setFormError({});
    
    // Form validation
    let hasError = false;
    const errors = {};
    
    if (!formData.firstName || !formData.lastName) {
      errors.name = 'First name and last name are required';
      hasError = true;
    }
    
    if (!formData.startTime || !formData.endTime) {
      errors.time = 'Start and end times are required';
      hasError = true;
    } else {
      const start = convertTo24HourFormat(formData.startTime);
      const end = convertTo24HourFormat(formData.endTime);
      
      if (start >= end) {
        errors.time = 'Start time must be before end time';
        hasError = true;
      }
    }
    
    if (formData.recurring !== 'No' && !formData.recurrenceEndDate) {
      errors.recurrence = 'Recurrence end date is required for recurring bookings';
      hasError = true;
    }
    
    if (hasError) {
      setFormError(errors);
      setSubmitLoading(false);
      return;
    }
    
    try {
      // Retrieve userId from localStorage
      const userId = localStorage.getItem('userId');

      // Fetch user data using the API if userId exists
      let userData = {};
      if (userId) {
        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        userData = response.data;
      }

      // Format dates for API
      const startTime24 = convertTo24HourFormat(formData.startTime);
      const endTime24 = convertTo24HourFormat(formData.endTime);

      const startDateTime = new Date(`${formData.date}T${startTime24}:00`);
      const endDateTime = new Date(`${formData.date}T${endTime24}:00`);

      // Prepare payload
      const payload = {
        ...formData,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        recurrenceEndDate: formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate).toISOString() : null,
        userId: userId || null, // Include userId if it exists, otherwise set to null
        bookedBy: userData.name || 'Admin', // Use fetched user data or default to 'Admin'
      };

      let responseBooking;

      if (isEditModalOpen && editBookingId) {
        // Update existing booking
        responseBooking = await axios.put(
          `${API_BASE_URL}/bookings/${editBookingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new booking
        responseBooking = await axios.post(
          `${API_BASE_URL}/bookings`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      // Reset and refresh
      resetForm();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      fetchBookings();
    } catch (err) {
      console.error('Error submitting booking:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to save booking. Please try again.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // User search functionality
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return [];
    
    return users.filter(user => 
      user.firstName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
    ).slice(0, 5); // Limit to 5 results
  }, [users, userSearchQuery]);
  
  // BookingForm component
  const BookingForm = React.memo(({ isEdit }) => {
     
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {formError.name && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{formError.name}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking Title</label>
            <input
  type="text"
  name="title"
  defaultValue={formData.title} // Use defaultValue for uncontrolled input
  onBlur={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} // Update state on blur
  onFocus={(e) => e.target.select()} // Retain focus
  required
  placeholder="Enter booking title"
  autoComplete="off"
  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
  type="text"
  name="firstName"
  defaultValue={formData.firstName} // Use defaultValue for uncontrolled input
  onBlur={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))} // Update state on blur
  required
  placeholder="Enter first name"
  autoComplete="off"
  className={`w-full p-2 border ${formError.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
  type="text"
  name="lastName"
  defaultValue={formData.lastName} // Use defaultValue for uncontrolled input
  onBlur={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))} // Update state on blur
  required
  placeholder="Enter last name"
  autoComplete="off"
  className={`w-full p-2 border ${formError.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
            <select
              name="building"
              value={formData.building}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Building</option>
              {BUILDINGS.map(building => (
                <option key={building} value={building}>{building}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
              disabled={!formData.building}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select
              name="room"
              value={formData.room}
              onChange={handleInputChange}
              required
              disabled={!formData.category}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Room</option>
              {availableRooms.map((room) => (
                <option key={room._id || room.id} value={room.roomName}>
                  {room.roomName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <select
              value={formData.startTime || ''}
              onChange={(e) => handleTimeChange('startTime', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select Start Time</option>
              {[
        
                '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
                '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
                '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
              ].map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {formError.time && <p className="text-red-500 text-xs mt-1">{formError.time}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <select
              value={formData.endTime || ''}
              onChange={(e) => handleTimeChange('endTime', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Select End Time</option>
              {[
                 
                
                 '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
                 '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
                 '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
                 '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
              ].map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recurring</label>
            <select
              name="recurring"
              value={formData.recurring}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="No">No</option>
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          {formData.recurring !== 'No' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence End Date</label>
              <input
                type="date"
                name="recurrenceEndDate"
                value={formData.recurrenceEndDate}
                onChange={handleInputChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
  name="notes"
  defaultValue={formData.notes} // Use defaultValue for uncontrolled input
  onBlur={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} // Update state on blur
  rows="3"
  placeholder="Add any additional notes here"
  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
></textarea>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              resetForm();
            }}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            disabled={submitLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${submitLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
            disabled={submitLoading}
          >
            {submitLoading ? 'Processing...' : isEdit ? 'Update Booking' : 'Create Booking'}
          </button>
        </div>
      </form>
    );
  });

  // Memoized Modal component
  const Modal = React.memo(({ isOpen, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-screen overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">{title}</h3>
          {children}
        </div>
      </div>
    );
  });

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
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
  
  const sortedBookings = [...currentBookings].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;
  
    const valA = a[key];
    const valB = b[key];
  
    // Handle dates, numbers, or strings
    const aVal = typeof valA === 'string' || valA instanceof Date ? String(valA) : valA;
    const bVal = typeof valB === 'string' || valB instanceof Date ? String(valB) : valB;
  
    return direction === 'asc'
      ? aVal.localeCompare(bVal)
      : bVal.localeCompare(aVal);
  });
 

  return (
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh'}}>
      <TopBar />
      <div className="p-2 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Bookings</h2>
          <button
            onClick={handleAddNewClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Add New Booking
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            {['All', 'Pending', 'Approved', 'Declined'].map((status) => (
              <TabButton
                key={status}
                label={status}
                active={activeBookingTab === status.toLowerCase()}
                onClick={() => {
                  setActiveBookingTab(status.toLowerCase());
                  setCurrentPage(1); // Reset to first page when switching tabs
                }}
              />
            ))}
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && <div className="text-center py-4">Loading bookings...</div>}
        {error && <div className="text-center py-4 text-red-500">{error}</div>}

        {/* Bookings Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
              <th onClick={() => handleSort('title')} className="cursor-pointer px-4 py-2 border-b">
                Booking Title {sortConfig.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('firstName')} className="cursor-pointer px-4 py-2 border-b">
                First Name {sortConfig.key === 'firstName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('lastName')} className="cursor-pointer px-4 py-2 border-b">
                Last Name {sortConfig.key === 'lastName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('department')} className="cursor-pointer px-4 py-2 border-b">
                Department {sortConfig.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('category')} className="cursor-pointer px-4 py-2 border-b">
                Category {sortConfig.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('room')} className="cursor-pointer px-4 py-2 border-b">
                Room {sortConfig.key === 'room' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('building')} className="cursor-pointer px-4 py-2 border-b">
                Building {sortConfig.key === 'building' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('date')} className="cursor-pointer px-4 py-2 border-b">
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('startTime')} className="cursor-pointer px-4 py-2 border-b">
                Time {sortConfig.key === 'startTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('notes')} className="cursor-pointer px-4 py-2 border-b">
                Notes {sortConfig.key === 'notes' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('status')} className="cursor-pointer px-4 py-2 border-b">
                Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('recurring')} className="cursor-pointer px-4 py-2 border-b">
                Recurring {sortConfig.key === 'recurring' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && currentBookings.length > 0 ? (
                sortedBookings.map((booking) => (
                  <tr key={booking._id || booking.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 border-b">{booking.title}</td>
                    <td className="px-4 py-2 border-b">{booking.firstName}</td>
                    <td className="px-4 py-2 border-b">{booking.lastName}</td>
                    <td className="px-4 py-2 border-b">{booking.department}</td>
                    <td className="px-4 py-2 border-b">{booking.category}</td>
                    <td className="px-4 py-2 border-b">{booking.room}</td>
                    <td className="px-4 py-2 border-b">{booking.building}</td>
                    <td className="px-4 py-2 border-b">
                      {booking.recurring !== 'No' && booking.recurrenceEndDate ? (
                        <div>
                          {formatDate(booking.date)} - {formatDate(booking.recurrenceEndDate)} ({booking.recurring})
                        </div>
                      ) : (
                        <div>{formatDate(booking.date)}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 border-b">
                      {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                      {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2 border-b">{booking.notes}</td>
                    <td className="px-4 py-2 border-b">
                      <div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            booking.status === 'confirmed'
                              ? 'bg-green-100 text-green-600'
                              : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        <small className="block text-gray-500 mt-1">
                          Changed by {booking.bookedBy || ': '}
                        </small>
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b">{booking.recurring}</td>
                    <td className="px-4 py-2 border-b">
                      <div className="flex space-x-2">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => handleEditClick(booking)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleDeleteBooking(booking._id || booking.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                !loading && (
                  <tr>
                    <td colSpan="13" className="px-4 py-4 text-center text-gray-500">
                      No bookings found. Add a new booking to get started.
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredBookings.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="text-gray-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentPage === totalPages || totalPages === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white'
              }`}
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add Booking Modal */}
      <Modal isOpen={isAddModalOpen} title="Add New Booking">
        <BookingForm isEdit={false} />
      </Modal>

      {/* Edit Booking Modal */}
      <Modal isOpen={isEditModalOpen} title="Edit Booking">
        <BookingForm isEdit={true} />
      </Modal>
    </div>
  );
};

export default Bookings;