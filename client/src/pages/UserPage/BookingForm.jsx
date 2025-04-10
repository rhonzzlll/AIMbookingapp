import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import Header from './Header';

const API_BASE_URL = 'http://localhost:5000/api';

const BookingForm = ({ onBookingSubmit }) => {
  const location = useLocation();
  const bookingData = location.state?.bookingData;
  
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    building: '',
    category: '',
    room: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    department: '',
    isRecurring: false,
    recurrenceType: '',
    recurrenceDays: [],
    endRecurrenceDate: '',
    notes: '',
  });

  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useLocalData, setUseLocalData] = useState(false);

  const userId = localStorage.getItem('_id');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // Predefined departments array
  const departments = ['ICT', 'HR', 'Finance', 'Marketing', 'Operations'];

  // Apply booking data from AccRooms if available
  useEffect(() => {
    if (bookingData) {
      const { room, searchParams } = bookingData;
      
      // Parse dates and times from search params
      const fromDate = searchParams.fromDate || format(new Date(), 'yyyy-MM-dd');
      const fromTime = searchParams.fromTime || '09:00';
      const toTime = searchParams.toTime || '10:00';
      
      // Update form with booking data
      setFormData(prevFormData => ({
        ...prevFormData,
        building: room.building || '',
        category: room.category || '',
        room: room.roomName || '',
        date: fromDate,
        startTime: fromTime,
        endTime: toTime,
        isRecurring: searchParams.isRecurring || false
      }));
    }
  }, [bookingData]);

  // Fetch user data and populate the form
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log(`Fetching user data for userId: ${userId}`);
        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const userData = response.data;

        // Update form data with user information
        setFormData((prevFormData) => ({
          ...prevFormData,
          firstName: userData.firstName,
          lastName: userData.lastName,
          department: userData.department || '',
          email: userData.email,
        }));
      } catch (error) {
        console.error('Error fetching user data:', error);

        // If API fails, try to use localStorage data
        setUseLocalData(true);

        const firstName = localStorage.getItem('firstName') || '';
        const lastName = localStorage.getItem('lastName') || '';
        const email = localStorage.getItem('email') || '';

        setFormData((prevFormData) => ({
          ...prevFormData,
          firstName,
          lastName,
          email,
          department: 'ICT', // Default department
        }));

        setError('Could not fetch profile data from server. Using available local data.');
      }
    };

    if (userId) {
      fetchUserData();
    } else {
      setError('User ID not found. Please log in again.');
    }
  }, [userId, token, userRole]);

  // Fetch rooms data
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/rooms`);
        setRooms(response.data);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Failed to fetch rooms. Please try again.');
      }
    };

    fetchRooms();
  }, []);

  // Filter rooms based on building and category
  useEffect(() => {
    if (formData.building && formData.category) {
      const filtered = rooms.filter(
        (room) =>
          room.building === formData.building && room.category === formData.category
      );
      setFilteredRooms(filtered);
    } else {
      setFilteredRooms([]);
    }
  }, [formData.building, formData.category, rooms]);

  // Handle fallback to local data for testing
  useEffect(() => {
    if (useLocalData && userId === '67f35bf80888a27d080e2eb0') {
      setFormData((prevFormData) => ({
        ...prevFormData,
        firstName: 'John',
        lastName: 'Jones',
        email: 'johnjones@gmail.com',
        department: 'ICT',
      }));
    }
  }, [useLocalData, userId]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'building') {
      setFormData({
        ...formData,
        [name]: value,
        category: '',
        room: '',
      });
    } else if (name === 'category') {
      setFormData({
        ...formData,
        [name]: value,
        room: '',
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Combine startTime and endTime into a single time field
    const time = `${formData.startTime} - ${formData.endTime}`;

    const bookingPayload = {
      ...formData,
      time, // Add the combined time field
    };

    onBookingSubmit(bookingPayload);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Booking</h2>
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {useLocalData && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Using data from local storage. Some information may not be up to date.
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {/* Booking Title */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Booking Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter a title for your booking"
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* First Name and Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              readOnly
            />
          </div>
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            readOnly
          />
        </div>

        {/* Department Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Department <span className="text-red-500">*</span>
          </label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Department</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Building Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Building <span className="text-red-500">*</span>
          </label>
          <select
            name="building"
            value={formData.building}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Building</option>
            {[...new Set(rooms.map((room) => room.building))].map((building) => (
              <option key={building} value={building}>
                {building}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={!formData.building}
          >
            <option value="">Select Category</option>
            {formData.building &&
              [...new Set(
                rooms
                  .filter((room) => room.building === formData.building)
                  .map((room) => room.category)
              )].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
          </select>
        </div>

        {/* Room Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Room <span className="text-red-500">*</span>
          </label>
          <select
            name="room"
            value={formData.room}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={!formData.category}
          >
            <option value="">Select Room</option>
            {filteredRooms.map((room) => (
              <option key={room._id} value={room.roomName}>
                {room.roomName}
              </option>
            ))}
          </select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Recurring Booking Options */}
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              id="isRecurring"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isRecurring" className="ml-2 text-gray-700 font-medium">
              Make this a recurring booking
            </label>
          </div>
          
          {formData.isRecurring && (
            <div className="pl-6 border-l-2 border-gray-200 mt-3 space-y-4">
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  Recurrence Type
                </label>
                <select
                  name="recurrenceType"
                  value={formData.recurrenceType}
                  onChange={handleChange}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-gray-700 font-medium mb-2">
                  End Recurrence Date
                </label>
                <input
                  type="date"
                  name="endRecurrenceDate"
                  value={formData.endRecurrenceDate}
                  onChange={handleChange}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Special Instructions</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any special requirements or information..."
            rows="4"
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;