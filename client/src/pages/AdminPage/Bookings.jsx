import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { TextField } from '@mui/material';
import format from 'date-fns/format';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Utility functions for date handling
const calculateRecurringDates = (startDate, recurrenceType, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(new Date(currentDate).toISOString().split('T')[0]); // Format as YYYY-MM-DD

    if (recurrenceType === 'Daily') {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (recurrenceType === 'Weekly') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (recurrenceType === 'Monthly') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return dates;
};

const formatDate = (date) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

const parseISODate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

// Base API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Predefined options for dropdowns to avoid recreation
const DEPARTMENTS = ['Engineering', 'Marketing', 'HR', 'Finance', 'Sales', 'IT'];
const BUILDINGS = ['ACC Building', 'AIM Building'];

// Initial form state - extracted to avoid recreation on each render
const initialFormState = {
  title: '',
  firstName: '',
  lastName: '',
  department: '',
  category: '',
  room: '',
  building: '',
  date: '',
  startTime: null,
  endTime: null,
  notes: '',
  recurring: 'No',
  recurrenceEndDate: '',
  status: 'pending',
};

// Room categories by building - memoized map
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

const Bookings = () => {
  // State variables
  const [activeBookingTab, setActiveBookingTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [formError, setFormError] = useState({});
  const [formData, setFormData] = useState(initialFormState);

  const bookingsPerPage = 5;

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.get(`${API_BASE_URL}/bookings?userId=${userId}`, config); // Pass userId as a query parameter
      if (Array.isArray(response.data)) {
        setRecentBookings(response.data);
      } else {
        console.error("Unexpected bookings response format:", response.data);
        setRecentBookings([]);
      }
    } catch (err) {
      console.error("Error fetching bookings:", err);
      setError("Failed to load bookings. Please try again later.");
      setRecentBookings([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch rooms from the backend API - memoized
  const fetchRooms = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.get(`${API_BASE_URL}/rooms`, config);
      if (Array.isArray(response.data)) {
        setRooms(response.data);
      } else if (response.data.rooms && Array.isArray(response.data.rooms)) {
        setRooms(response.data.rooms);
      } else {
        console.error("Unexpected rooms response format:", response.data);
        setRooms([]);
      }
    } catch (err) {
      console.error("Error fetching rooms:", err);
      setRooms([]);
    }
  }, []);

  // Fetch users - memoized
  const fetchUsers = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const response = await axios.get(`${API_BASE_URL}/users`, config);
      let usersData = [];

      if (Array.isArray(response.data)) {
        usersData = response.data;
      } else if (response.data.users && Array.isArray(response.data.users)) {
        usersData = response.data.users;
      }

      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
      setUsers([]);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchBookings();
    fetchRooms();
    fetchUsers();
  }, [fetchBookings, fetchRooms, fetchUsers]);

  // Filter bookings based on the active tab - memoized
  const filteredBookings = useMemo(() => {
    if (!Array.isArray(recentBookings)) return [];

    return recentBookings.filter((booking) =>
      activeBookingTab === 'all'
        ? true
        : activeBookingTab === 'approved'
        ? booking.status === 'confirmed'
        : activeBookingTab === 'pending'
        ? booking.status === 'pending'
        : booking.status === 'declined'
    );
  }, [recentBookings, activeBookingTab]);

  // Pagination logic - memoized
  const currentBookings = useMemo(() => {
    const indexOfLastBooking = currentPage * bookingsPerPage;
    const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
    return filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking);
  }, [filteredBookings, currentPage, bookingsPerPage]);

  // Calculate total pages once
  const totalPages = useMemo(() =>
    Math.ceil(filteredBookings.length / bookingsPerPage),
    [filteredBookings.length, bookingsPerPage]
  );

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  }, [currentPage, totalPages]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(prevPage => prevPage - 1);
    }
  }, [currentPage]);

  // Memoized function for getting categories
  const getCategoriesForBuilding = useCallback((building) => {
    return BUILDING_CATEGORIES[building] || [];
  }, []);

  // Memoized function for getting rooms
  const getRoomsForBuildingAndCategory = useCallback((building, category) => {
    if (!building || !category) return [];
    return rooms.filter(
      (room) => room.building === building && room.category === category
    );
  }, [rooms]);

  // Memoized name validation
  const validateNameExists = useCallback((firstName, lastName) => {
    if (!firstName || !lastName) return false;
    return users.some(
      user => user.firstName?.toLowerCase() === firstName?.toLowerCase() &&
        user.lastName?.toLowerCase() === lastName?.toLowerCase()
    );
  }, [users]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  }, []);

  const handleTimeChange = useCallback((timeType, newTime) => {
    setFormData((prevData) => ({
      ...prevData,
      [timeType]: newTime,
    }));
  }, []);

  const validateForm = useCallback(() => {
    const errors = {};

    // Validate names if we have users data
    if (users.length > 0 && formData.firstName && formData.lastName) {
      if (!validateNameExists(formData.firstName, formData.lastName)) {
        errors.name = "This name doesn't match any existing account";
      }
    }

    // Validate time fields
    if (!formData.startTime || !formData.endTime) {
      errors.time = "Both start and end times are required";
    }

    setFormError(errors);
    return Object.keys(errors).length === 0;
  }, [formData.firstName, formData.lastName, formData.startTime, formData.endTime, users.length, validateNameExists]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      // Parse startTime and endTime strings into Date objects
      const today = new Date();
      const parseTime = (timeString) => {
        const [time, period] = timeString.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        const date = new Date(today);
        date.setHours(hours, minutes, 0, 0);
        return date;
      };

      const bookingData = {
        ...formData,
        startTime: parseTime(formData.startTime).toISOString(),
        endTime: parseTime(formData.endTime).toISOString(),
        userId: userId || '', // Include userId in the payload
      };

      if (isEditModalOpen && currentBooking) {
        await axios.put(`${API_BASE_URL}/bookings/${currentBooking._id}`, bookingData, config);
      } else {
        await axios.post(`${API_BASE_URL}/bookings`, bookingData, config);
      }

      fetchBookings();
      resetForm();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Error submitting booking:", err);
      setError(err.response?.data?.message || "Failed to save booking. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  }, [formData, validateForm, isEditModalOpen, currentBooking, fetchBookings]);

  const handleDeleteBooking = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to delete this booking?')) {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };

        await axios.delete(`${API_BASE_URL}/bookings/${id}`, config);
        fetchBookings(); // Refresh after delete
      } catch (err) {
        console.error("Error deleting booking:", err);
        setError(err.response?.data?.message || "Failed to delete booking");
      } finally {
        setLoading(false);
      }
    }
  }, [fetchBookings]);

  const resetForm = useCallback(() => {
    setFormData(initialFormState);
    setFormError({});
    setCurrentBooking(null);
  }, []);

  const handleEditClick = useCallback((booking) => {
    setCurrentBooking(booking);
    
    // Parse time string to set startTime and endTime
    let startTime = null;
    let endTime = null;
    
    if (booking.time) {
      const timeParts = booking.time.split(' - ');
      if (timeParts.length === 2) {
        // Create Date objects for today with the specified times
        const today = new Date();
        const startParts = timeParts[0].match(/(\d+):(\d+)\s*(am|pm)/i);
        const endParts = timeParts[1].match(/(\d+):(\d+)\s*(am|pm)/i);
        
        if (startParts && endParts) {
          // Parse start time
          let startHour = parseInt(startParts[1]);
          const startMinute = parseInt(startParts[2]);
          const startPeriod = startParts[3].toLowerCase();
          
          if (startPeriod === 'pm' && startHour < 12) startHour += 12;
          if (startPeriod === 'am' && startHour === 12) startHour = 0;
          
          startTime = new Date(today);
          startTime.setHours(startHour, startMinute, 0);
          
          // Parse end time
          let endHour = parseInt(endParts[1]);
          const endMinute = parseInt(endParts[2]);
          const endPeriod = endParts[3].toLowerCase();
          
          if (endPeriod === 'pm' && endHour < 12) endHour += 12;
          if (endPeriod === 'am' && endHour === 12) endHour = 0;
          
          endTime = new Date(today);
          endTime.setHours(endHour, endMinute, 0);
        }
      }
    }
    
    // Format date for the form input
    const formattedBooking = {
      ...booking,
      date: parseISODate(booking.date),
      startTime: startTime,
      endTime: endTime,
      recurrenceEndDate: booking.recurrenceEndDate ? parseISODate(booking.recurrenceEndDate) : ''
    };
    
    setFormData(formattedBooking);
    setIsEditModalOpen(true);
  }, []);

  const handleAddNewClick = useCallback(() => {
    resetForm();
    setIsAddModalOpen(true);
  }, [resetForm]);

  // Memoized BookingForm component to avoid unnecessary re-renders
  const BookingForm = React.memo(({ isEdit }) => {
    const categories = getCategoriesForBuilding(formData.building);
    const availableRooms = getRoomsForBuildingAndCategory(
      formData.building,
      formData.category
    );

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
                '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
                '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
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
                '12:00 AM', '12:30 AM', '1:00 AM', '1:30 AM', '2:00 AM', '2:30 AM', '3:00 AM', '3:30 AM',
                '4:00 AM', '4:30 AM', '5:00 AM', '5:30 AM', '6:00 AM', '6:30 AM', '7:00 AM', '7:30 AM',
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

  // TabButton component to reduce repetition
  const TabButton = React.memo(({ label, active, onClick }) => (
    <button
      className={`px-4 py-2 rounded-lg font-medium transition ${
        active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  ));

  return (
    <div>
      <div className="p-6 bg-gray-50 min-h-screen">
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
                <th className="px-4 py-2 border-b">Booking Title</th>
                <th className="px-4 py-2 border-b">First Name</th>
                <th className="px-4 py-2 border-b">Last Name</th>
                <th className="px-4 py-2 border-b">Department</th>
                <th className="px-4 py-2 border-b">Category</th>
                <th className="px-4 py-2 border-b">Room</th>
                <th className="px-4 py-2 border-b">Building</th>
                <th className="px-4 py-2 border-b">Date</th>
                <th className="px-4 py-2 border-b">Time</th>
                <th className="px-4 py-2 border-b">Notes</th>
                <th className="px-4 py-2 border-b">Status</th>
                <th className="px-4 py-2 border-b">Recurring</th>
                <th className="px-4 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!loading && currentBookings.length > 0 ? (
                currentBookings.map((booking) => (
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