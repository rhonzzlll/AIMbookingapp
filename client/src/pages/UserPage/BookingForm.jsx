import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000/api';

const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const period = hour < 12 ? 'AM' : 'PM';
      const formattedHour = hour % 12 === 0 ? 12 : hour % 12; // Convert 24-hour to 12-hour format
      const formattedTime = `${formattedHour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')} ${period}`;
      times.push(formattedTime);
    }
  }
  return times;
};

const convertTo24HourFormat = (time) => {
  const [timePart, modifier] = time.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);

  if (modifier === 'PM' && hours !== 12) {
    hours += 12;
  } else if (modifier === 'AM' && hours === 12) {
    hours = 0;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const timeOptions = generateTimeOptions();

const BookingForm = ({ onBookingSubmit }) => {
  const location = useLocation();
  const bookingData = location.state?.bookingData;
  
  const userId = localStorage.getItem('_id'); // Fetch userId from localStorage
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    building: '',
    category: '',
    room: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    department: '',
    isRecurring: false,
    recurrenceType: '',
    recurrenceDays: [],
    endRecurrenceDate: '',
    notes: '',
    userId: userId || '', // Include userId here
  });

  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useLocalData, setUseLocalData] = useState(false);
  const [existingBookings, setExistingBookings] = useState([]);
  const [unavailableTimeSlots, setUnavailableTimeSlots] = useState([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Predefined departments array
  const departments = ['ICT', 'HR', 'Finance', 'Marketing', 'Operations'];

  // Apply booking data from AccRooms if available
  useEffect(() => {
    if (bookingData) {
      const { room, searchParams } = bookingData;
      
      // Parse dates and times from search params
      const fromDate = searchParams.fromDate || format(new Date(), 'yyyy-MM-dd');
      const fromTime = searchParams.fromTime || '09:00 AM';
      const toTime = searchParams.toTime || '10:00 AM';
      
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
    const fetchUsers = async () => {
      try {
        console.log("Token:", token); // Log the token
        const response = await axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
  
    fetchUsers();
  }, [token]);  
        // Update form data with user information
setFormData((prevFormData) => ({
  ...prevFormData,
  firstName: userData.firstName,
  lastName: userData.lastName,
  department: userData.department || '',
  email: userData.email,
}));

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

  // Fetch users from the API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(response.data);
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };

    fetchUsers();
  }, [token]);

  // Fetch existing bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/bookings`);
        setExistingBookings(response.data);
        
        // Process bookings to determine unavailable time slots
        if (formData.building && formData.room && formData.date) {
          processBookingsForTimeSlots(response.data);
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
      }
    };

    fetchBookings();
  }, [formData.building, formData.room, formData.date]);

  // Process bookings to determine unavailable time slots
  const processBookingsForTimeSlots = (bookings) => {
    if (!bookings || !formData.building || !formData.room || !formData.date) return;

    const relevantBookings = bookings.filter(booking => 
      booking.building === formData.building && 
      booking.room === formData.room &&
      new Date(booking.startTime).toDateString() === new Date(`${formData.date}T00:00:00`).toDateString() &&
      (booking.status === 'approved' || booking.status === 'pending')
    );

    // Create an array of unavailable time slots including buffer times
    const unavailable = [];
    
    relevantBookings.forEach(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      
      // Add buffer times (30 minutes before and after)
      const bufferStart = new Date(bookingStart.getTime() - 30 * 60 * 1000);
      const bufferEnd = new Date(bookingEnd.getTime() + 30 * 60 * 1000);
      
      // Format time objects to match our time options format
      const formatTimeToOption = (date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; // Convert to 12-hour format
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
      };
      
      // Find relevant time slots in our options that fall within buffer zones
      timeOptions.forEach(timeOption => {
        const timeOption24 = convertTo24HourFormat(timeOption);
        const timeOptionDate = new Date(`${formData.date}T${timeOption24}:00`);
        
        if (timeOptionDate >= bufferStart && timeOptionDate <= bufferEnd) {
          unavailable.push({
            time: timeOption,
            reason: `Booking with 30min buffer: ${formatTimeToOption(bookingStart)} - ${formatTimeToOption(bookingEnd)}`
          });
        }
      });
    });
    
    setUnavailableTimeSlots(unavailable);
  };

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
      setAvailabilityStatus(null);
    } else if (name === 'category') {
      setFormData({
        ...formData,
        [name]: value,
        room: '',
      });
      setAvailabilityStatus(null);
    } else if (name === 'room' || name === 'date' || name === 'startTime' || name === 'endTime') {
      setFormData({
        ...formData,
        [name]: value,
      });
      setAvailabilityStatus(null);
      
      // When key booking details change, check availability after a short delay
      if (formData.building && formData.room && formData.date && 
          (name === 'room' || name === 'date' || name === 'startTime' || name === 'endTime')) {
        checkTimeAvailability({
          ...formData,
          [name]: value
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value,
      });
    }
  };

  // Handle input change for first name and last name
  const handleNameChange = (e) => {
    const { name, value } = e.target;

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));

    // Filter users based on input
    if (value.trim() !== '') {
      const filtered = users.filter((user) =>
        user[name]?.toLowerCase().startsWith(value.toLowerCase())
      );
      setFilteredUsers(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredUsers([]);
      setShowSuggestions(false);
    }
  };

  // Handle selecting a suggestion
  const handleSuggestionClick = (user) => {
    setFormData((prevData) => ({
      ...prevData,
      firstName: user.firstName,
      lastName: user.lastName,
    }));
    setShowSuggestions(false);
  };

  const checkTimeAvailability = async (data) => {
    if (!data.date || !data.startTime || !data.endTime) {
      setAvailabilityStatus({
        available: false,
        message: 'Please provide a valid date, start time, and end time.',
      });
      return;
    }

    setIsCheckingAvailability(true);

    try {
      // Convert times to proper format for API
      const startTime24 = convertTo24HourFormat(data.startTime);
      const endTime24 = convertTo24HourFormat(data.endTime);

      // Combine date and time into ISO strings
      const startDateTime = new Date(`${data.date}T${startTime24}:00`);
      const endDateTime = new Date(`${data.date}T${endTime24}:00`);

      // Validate that the dates are valid
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setAvailabilityStatus({
          available: false,
          message: 'Invalid date or time format.',
        });
        return;
      }

      // Ensure start time is before end time
      if (startDateTime >= endDateTime) {
        setAvailabilityStatus({
          available: false,
          message: 'Start time must be before end time.',
        });
        return;
      }

      // Call the availability check endpoint
      const response = await axios.post(
        `${API_BASE_URL}/bookings/check-availability`,
        {
          building: data.building,
          room: data.room,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAvailabilityStatus(response.data);
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailabilityStatus({
        available: false,
        message: 'Error checking availability. Please try again.',
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const isTimeSlotUnavailable = (time) => {
    return unavailableTimeSlots.some(slot => slot.time === time);
  };

  const getTimeSlotTooltip = (time) => {
    const unavailableSlot = unavailableTimeSlots.find(slot => slot.time === time);
    return unavailableSlot ? unavailableSlot.reason : '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Ensure date and time are valid
      if (!formData.date || !formData.startTime || !formData.endTime) {
        setError('Please provide a valid date, start time, and end time.');
        setLoading(false);
        return;
      }

      // Convert time formats correctly
      const startTime24 = convertTo24HourFormat(formData.startTime);
      const endTime24 = convertTo24HourFormat(formData.endTime);

      // Combine date and time into ISO strings
      const startDateTime = new Date(`${formData.date}T${startTime24}:00`);
      const endDateTime = new Date(`${formData.date}T${endTime24}:00`);

      // Validate that the dates are valid
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        setError('Invalid date or time. Please check your input.');
        setLoading(false);
        return;
      }

      // Validate that start time is before end time
      if (startDateTime >= endDateTime) {
        setError('Start time must be earlier than end time.');
        setLoading(false);
        return;
      }

      // Prepare payload with ISO strings and userId
      const bookingPayload = {
        ...formData,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        userId, // Include userId in the payload
      };

      // Make API request
      const response = await axios.post(`${API_BASE_URL}/bookings`, bookingPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.setItem('token', response.data.token);
      onBookingSubmit(response.data);
    } catch (err) {
      if (err.response && err.response.status === 400) {
        setError(err.response.data.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
        console.error('Booking error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Booking</h2>
      
      {error && <div className="text-red-500 mb-4 p-3 bg-red-50 border border-red-200 rounded">{error}</div>}
      
      {availabilityStatus && (
        <div className={`mb-4 p-3 rounded ${availabilityStatus.available ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
          <p className="font-medium">{availabilityStatus.available ? '✓ Selected time slot is available' : '⚠️ ' + availabilityStatus.message}</p>
          {!availabilityStatus.available && (
            <p className="text-sm mt-1">Remember: There's a 30-minute buffer before and after each booking.</p>
          )}
        </div>
      )}
      
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

        {/* First Name Field */}
        <div className="relative mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleNameChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
          {showSuggestions && filteredUsers.length > 0 && (
            <ul className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
              {filteredUsers.map((user) => (
                <li
                  key={user._id}
                  onClick={() => handleSuggestionClick(user)}
                  className="p-2 hover:bg-blue-100 cursor-pointer"
                >
                  {user.firstName} {user.lastName}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Last Name Field */}
        <div className="relative mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleNameChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
          {showSuggestions && filteredUsers.length > 0 && (
            <ul className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
              {filteredUsers.map((user) => (
                <li
                  key={user._id}
                  onClick={() => handleSuggestionClick(user)}
                  className="p-2 hover:bg-blue-100 cursor-pointer"
                >
                  {user.firstName} {user.lastName}
                </li>
              ))}
            </ul>
          )}
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
            <select
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Start Time</option>
              {timeOptions.map((time) => (
                <option 
                  key={time} 
                  value={time} 
                  disabled={isTimeSlotUnavailable(time)}
                  title={getTimeSlotTooltip(time)}
                  className={isTimeSlotUnavailable(time) ? 'text-gray-400' : ''}
                >
                  {time} {isTimeSlotUnavailable(time) ? '(Unavailable)' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Unavailable times have existing bookings (with 30min buffer)</p>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <select
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select End Time</option>
              {timeOptions.map((time) => (
                <option 
                  key={time} 
                  value={time} 
                  disabled={isTimeSlotUnavailable(time)}
                  title={getTimeSlotTooltip(time)}
                  className={isTimeSlotUnavailable(time) ? 'text-gray-400' : ''}
                >
                  {time} {isTimeSlotUnavailable(time) ? '(Unavailable)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Buffer Time Information */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h3 className="font-medium text-blue-800 mb-1">Booking Buffer Information</h3>
          <p className="text-sm text-blue-700">
            There is a required 30-minute buffer before and after all bookings. This means you cannot book a room if
            there is an existing booking that ends less than 30 minutes before your start time or begins less than
            30 minutes after your end time.
          </p>
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
            className={`px-6 py-3 ${
              availabilityStatus?.available ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
            } text-white rounded-lg`}
            disabled={loading || isCheckingAvailability || availabilityStatus?.available === false}
          >
            {loading ? 'Submitting...' : isCheckingAvailability ? 'Checking Availability...' : 'Submit Booking'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookingForm;