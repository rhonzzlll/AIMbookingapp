import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import bg from '../../images/bg.png';
import { useLocation } from 'react-router-dom';
import Confirm from "../../components/ui/ConfirmationModal";  
const API_BASE_URL = 'http://localhost:5000/api';
import { useNavigate } from 'react-router-dom'; 

const TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

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

const BookingForm = ({ onBookingSubmit }) => {
  const location = useLocation();
  const bookingData = location.state?.bookingData;
  const navigate = useNavigate(); // Initialize the navigate function

  // Other state and useEffect hooks

  const handleGoBack = () => {
    navigate(-1); // Navigate to the previous page
  };
  
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
    needsMealRoom: false,
    needsBreakoutRoom: false
  });

  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [categories, setCategories] = useState([]);
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
  const [roomMap, setRoomMap] = useState({});
  const [blockedTimes, setBlockedTimes] = useState([]);

  const userId = localStorage.getItem('_id');
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');

  // Predefined departments array
  const departments = ['ICT', 'HR', 'Finance', 'Marketing', 'Operations'];

  // Apply booking data from AccRooms if available
  useEffect(() => {
    if (bookingData) {
      const { room, searchParams } = bookingData;

      // Ensure room and building data are properly set
      if (room) {
        setFormData((prevFormData) => ({
          ...prevFormData,
          building: room.building || '',
          category: room.category || '',
          room: room.roomName || '',
        }));
      }

      // Ensure searchParams are properly set
      if (searchParams) {
        setFormData((prevFormData) => ({
          ...prevFormData,
          date: searchParams.fromDate || format(new Date(), 'yyyy-MM-dd'),
          startTime: searchParams.fromTime || '09:00 AM',
          endTime: searchParams.toTime || '10:00 AM',
          isRecurring: searchParams.isRecurring || false,
        }));
      }
    }
  }, [bookingData]);

  // Fetch user data and populate the form
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

  useEffect(() => {
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
        
        // Extract unique buildings and categories
        const uniqueBuildings = [...new Set(response.data.map(room => room.building))];
        setBuildings(uniqueBuildings);
        
        // Create a map of room IDs to room data
        const newRoomMap = {};
        response.data.forEach(room => {
          newRoomMap[room._id] = {
            roomName: room.roomName,
            building: room.building,
          };
        });
        setRoomMap(newRoomMap);
      } catch (err) {
        console.error('Error fetching rooms:', err);
        setError('Failed to fetch rooms. Please try again.');
      }
    };
  
    fetchRooms();
  }, []);
  
  // Update categories when building changes
  useEffect(() => {
    if (formData.building && rooms.length > 0) {
      const buildingRooms = rooms.filter(room => room.building === formData.building);
      const uniqueCategories = [...new Set(buildingRooms.map(room => room.category))];
      setCategories(uniqueCategories);
    } else {
      setCategories([]);
    }
  }, [formData.building, rooms]);

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
  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bookings = response.data.bookings || response.data;
  
      const enrichedBookings = bookings.map(booking => {
        const roomData = roomMap[booking.room];
        return {
          ...booking,
          roomName: roomData?.roomName || booking.room,
          building: roomData?.building || booking.building,
        };
      });
  
      setExistingBookings(enrichedBookings);
      processBookingsForTimeSlots(enrichedBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  useEffect(() => {
    if (formData.building && formData.room && formData.date && rooms.length > 0) {
      fetchBookings(); // Fetch bookings data for all rooms
    }
  }, [formData.building, formData.room, formData.date, rooms]);  // Ensure this is called when rooms change   

  const processBookingsForTimeSlots = (bookings) => {
    if (!bookings || !formData.building || !formData.room || !formData.date) return;
  
    // 🔄 Clear previous unavailable time slots
    setUnavailableTimeSlots([]);
  
    // ✅ Filter bookings for the selected building and room
    const relevantBookings = bookings.filter(booking =>
      booking.building === formData.building &&
      new Date(booking.startTime).toDateString() === new Date(`${formData.date}T00:00:00`).toDateString() &&
      booking.status?.toLowerCase() === 'confirmed'
    );
  
    const unavailable = [];
  
    relevantBookings.forEach(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      const bufferEnd = new Date(bookingEnd.getTime() + 30 * 60 * 1000); // 30min buffer
  
      const formatTimeToOption = (date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
      };
  
      TIME_OPTIONS.forEach(timeOption => {
        const timeOption24 = convertTo24HourFormat(timeOption);
        const timeOptionDate = new Date(`${formData.date}T${timeOption24}:00`);
  
        // Check if the time slot is already unavailable
        if (timeOptionDate >= bookingStart && timeOptionDate < bufferEnd) {
          unavailable.push({
            time: timeOption,
            reason: `Booking: ${formatTimeToOption(bookingStart)} - ${formatTimeToOption(bookingEnd)} (Already booked)`
          });
        }
      });
    });
  
    // ✅ Update unavailable time slots
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
          category: data.category,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          // FIXED: Send "confirmed" in lowercase to match backend expectations
          status: 'confirmed',
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

  const getAvailableStartTimes = () => {
    const now = new Date();
    const selectedDate = new Date(formData.date);
  
    return TIME_OPTIONS.filter((time) => {
      if (isTimeBlocked(time)) return false;
  
      // Prevent selecting past times for today
      if (selectedDate.toDateString() === now.toDateString()) {
        const time24 = convertTo24HourFormat(time);
        const [hours, minutes] = time24.split(':').map(Number);
        const optionDate = new Date(formData.date);
        optionDate.setHours(hours);
        optionDate.setMinutes(minutes);
  
        if (optionDate.getTime() < now.getTime()) {
          return false;
        }
      }
  
      // Prevent selecting a start time that overlaps with an existing booking
      const time24 = convertTo24HourFormat(time);
      const [hours, minutes] = time24.split(':').map(Number);
      const optionStartDate = new Date(formData.date);
      optionStartDate.setHours(hours);
      optionStartDate.setMinutes(minutes);
  
      for (const booking of blockedTimes) {
        const bookingStart = new Date(`${booking.date}T${convertTo24HourFormat(booking.startTime)}:00`);
        const bookingEnd = new Date(`${booking.date}T${convertTo24HourFormat(booking.endTime)}:00`);
  
        // If the selected start time falls within a blocked range, reject it
        if (optionStartDate >= bookingStart && optionStartDate < bookingEnd) {
          return false;
        }
      }
  
      return true;
    });
  };
  
  const isTimeBlocked = (time) => {
    if (!unavailableTimeSlots.length) return false;
  
    const time24 = convertTo24HourFormat(time);
    const timeDate = new Date(`${formData.date}T${time24}:00`);
  
    return unavailableTimeSlots.some(slot => {
      const slotTime24 = convertTo24HourFormat(slot.time);
      const slotDate = new Date(`${formData.date}T${slotTime24}:00`);
      return timeDate.getTime() === slotDate.getTime();
    });
  };
  
  const getFilteredEndTimes = () => {
    // If no start time is selected, allow all end times to be available
    if (!formData.startTime) {
      return TIME_OPTIONS; // Return all end time options if no start time
    }
  
    const startIndex = TIME_OPTIONS.findIndex(
      (time) => time === formData.startTime
    );
  
    if (startIndex === -1) {
      return TIME_OPTIONS; // Fallback if start time not found
    }
  
    const startTime24 = convertTo24HourFormat(formData.startTime);
    const startTimeDate = new Date(`${formData.date}T${startTime24}:00`);
  
    // Find the earliest upcoming blocked time AFTER the start time
    const upcomingBlockedTime = TIME_OPTIONS.slice(startIndex + 1).find((time) => {
      if (!isTimeBlocked(time)) return false;
  
      const blockedTime24 = convertTo24HourFormat(time);
      const blockedTimeDate = new Date(`${formData.date}T${blockedTime24}:00`);
  
      return blockedTimeDate > startTimeDate;
    });
  
    return TIME_OPTIONS.slice(startIndex + 1).filter((time) => {
      if (isTimeBlocked(time)) return false;
  
      const endTime24 = convertTo24HourFormat(time);
      const endTimeDate = new Date(`${formData.date}T${endTime24}:00`);
  
      if (endTimeDate <= startTimeDate) return false;
  
      // Cut off options if we found a blocked time after the start time
      if (upcomingBlockedTime) {
        const blockedTime24 = convertTo24HourFormat(upcomingBlockedTime);
        const blockedTimeDate = new Date(`${formData.date}T${blockedTime24}:00`);
  
        return endTimeDate < blockedTimeDate;
      }
  
      return true;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    try {
      // Fetch user data to ensure it's up-to-date
      await fetchUserData();
  
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
  
      // Check availability one last time before submitting
      const availabilityCheck = await axios.post(
        `${API_BASE_URL}/bookings/check-availability`,
        {
          building: formData.building,
          room: formData.room,
          category: formData.category,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          // FIXED: Use lowercase "confirmed" status
          status: 'confirmed',
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
  
      if (!availabilityCheck.data.available) {
        setError(`Booking conflict: ${availabilityCheck.data.message}`);
        setLoading(false);
        return;
      }
  
      // Prepare payload with ISO strings and user data
      // Remove _id from formData if present to avoid duplicate key error
      const { _id, ...cleanFormData } = formData;
  
      const bookingPayload = {
        ...cleanFormData, // Remove _id
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        userId, // Ensure userId is included in the payload
      };
  
      // Make API request
      const response = await axios.post(`${API_BASE_URL}/bookings`, bookingPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      await fetchBookings();  // ✅ Fetch updated bookings

      if (formData.building && formData.room && formData.date) {
        processBookingsForTimeSlots(existingBookings); 
      }      
            
      onBookingSubmit(response.data); // Notify parent component of successful booking

      setFormData({
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
        needsMealRoom: false,
        needsBreakoutRoom: false
      });
      
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
    <div className="font-sans">

      <div className="px-4 pb-8">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed",
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-10" />
        </div>

        <div className="relative bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Booking</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
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
                {buildings.map((building) => (
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
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Room Selection */}
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">
                Meeting Room <span className="text-red-500">*</span>
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

            {/* Additional Room Options */}
            <div className="mb-6 flex flex-wrap gap-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="needsMealRoom"
                  name="needsMealRoom"
                  checked={formData.needsMealRoom}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="needsMealRoom" className="ml-2 text-gray-700 font-medium">
                  Need Meal Room
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="needsBreakoutRoom"
                  name="needsBreakoutRoom"
                  checked={formData.needsBreakoutRoom}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="needsBreakoutRoom" className="ml-2 text-gray-700 font-medium">
                  Need Breakout Room
                </label>
              </div>
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
                  min={format(new Date(), 'yyyy-MM-dd')}
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
                  {getAvailableStartTimes().map((time) => (
                  <option
                    key={time}
                    value={time}
                  >
                    {time}
                  </option>
                ))}
                </select>
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
                  disabled={!formData.startTime}
                >
                  <option value="">Select End Time</option>
                  {getFilteredEndTimes().map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
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
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
                      required={formData.isRecurring}
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
                      min={formData.date}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={formData.isRecurring}
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

            {/* Store the user info in hidden fields */}
            <input type="hidden" name="firstName" value={formData.firstName} />
            <input type="hidden" name="lastName" value={formData.lastName} />
            <input type="hidden" name="email" value={formData.email} />
            <input type="hidden" name="department" value={formData.department} />

            {/* Availability Status */}
            {availabilityStatus && (
              <div className={`mb-6 p-4 rounded ${
                availabilityStatus.available 
                  ? 'bg-green-100 border border-green-400 text-green-700' 
                  : 'bg-yellow-100 border border-yellow-400 text-yellow-700'
              }`}>
                {availabilityStatus.message}
              </div>
            )}

            {/* Form Actions */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={handleGoBack}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Go Back
              </button>
              <button
                type="submit"
                className={`px-6 py-3 ${
                  availabilityStatus?.available ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'
                } text-white rounded-lg`}
                disabled={loading || isCheckingAvailability || !availabilityStatus?.available}
              >
                {loading ? 'Submitting...' : isCheckingAvailability ? 'Checking Availability...' : 'Submit Booking'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;


