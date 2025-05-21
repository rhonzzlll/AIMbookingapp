import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import bg from '../../images/bg.png';
import { useLocation, useNavigate } from 'react-router-dom';
import Confirm from "../../components/ui/ConfirmationModal";  

const API_BASE_URL = 'http://localhost:5000/api';

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
    hours = modifier === 'PM' ? String(parseInt(hours, 10)  +12) : hours.padStart(2, '0');
  }

  // Ensure seconds are always included
  return `${hours}:${minutes}:00`;
};

const toTimeHHMM = (time12h) => {
  if (!time12h) return '';
  
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10);
  
  // Convert hours to 24-hour format
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  
  // Format to HH:MM with leading zeros
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

const toTimeISOString = (time12h) => {

  if (!time12h) return '';
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  hours = parseInt(hours, 10);
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  // Always UTC for time-only
  return new Date(Date.UTC(2025, 0, 1, hours, parseInt(minutes, 10))).toISOString();
};
 
const BookingForm = ({ onBookingSubmit }) => {
  const location = useLocation();
  const bookingData = location.state?.bookingData;
  const navigate = useNavigate(); // Initialize the navigate function
  
  const handleGoBack = () => {
    navigate(-1); // Navigate to the previous page
  };
  
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    buildingId: '',
    buildingName: '', // Add this field to store the name
    categoryId: '',
    categoryName: '', // Add this field to store the name
    roomId: '',
    date: format(new Date(), 'yyyy-MM-dd'), 
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    department: '',
    isRecurring: false,
    recurrenceType: '',
    recurrenceDays: [],
    recurrenceEndDate: '',
    notes: '',
    isMealRoom: false,
    isBreakRoom: false,
    bookingCapacity: 1,
    status: 'pending'
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

  const userId = localStorage.getItem('userId');
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
          buildingId: room.buildingId || '',
          categoryId: room.categoryId || '',
          roomId: room.roomId || '',
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
      
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user data: ${response.statusText}`);
      }
      
      const userData = await response.json();

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
        
        // Map the API response to include the nested name properties
        const processedRooms = response.data.map(room => ({
          ...room,
          // Extract name from nested objects
          buildingName: room.Building?.buildingName || room.buildingName || room.buildingId,
          categoryName: room.Category?.categoryName || room.categoryName || room.categoryId
        }));
        
        setRooms(processedRooms);
        console.log("Processed rooms data:", processedRooms);
        
        // Extract unique buildings with names from the nested structure
        const uniqueBuildings = [];
        const buildingsMap = {};
        
        processedRooms.forEach(room => {
          if (!buildingsMap[room.buildingId]) {
            buildingsMap[room.buildingId] = true;
            uniqueBuildings.push({
              id: room.buildingId,
              name: room.Building?.buildingName || room.buildingName || room.buildingId
            });
          }
        });
        
        // Sort buildings by name
        uniqueBuildings.sort((a, b) => a.name.localeCompare(b.name));
        console.log("Processed buildings:", uniqueBuildings);
        setBuildings(uniqueBuildings);
        
        // Create a map of room IDs to room data with proper names
        const newRoomMap = {};
        processedRooms.forEach(room => {
          newRoomMap[room.roomId] = {
            roomName: room.roomName,
            buildingId: room.buildingId,
            buildingName: room.Building?.buildingName || room.buildingName || room.buildingId,
            categoryId: room.categoryId,
            categoryName: room.Category?.categoryName || room.categoryName || room.categoryId
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
    if (formData.buildingId && rooms.length > 0) {
      const buildingRooms = rooms.filter(room => room.buildingId === formData.buildingId);
      
      // Extract unique categories with both ID and display name from nested data
      const uniqueCategories = [];
      const categoryMap = {};
      
      buildingRooms.forEach(room => {
        if (!categoryMap[room.categoryId]) {
          categoryMap[room.categoryId] = true;
          uniqueCategories.push({
            id: room.categoryId,
            name: room.Category?.categoryName || room.categoryName || room.categoryId
          });
        }
      });
      
      // Sort categories by name
      uniqueCategories.sort((a, b) => a.name.localeCompare(b.name));
      console.log("Categories for building:", uniqueCategories);
      setCategories(uniqueCategories);
    } else {
      setCategories([]);
    }
  }, [formData.buildingId, rooms]);

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
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching bookings: ${response.statusText}`);
      }
      
      const data = await response.json();
      const bookings = data.bookings || data;

      const enrichedBookings = bookings.map(booking => {
        const roomData = roomMap[booking.roomId];
        return {
          ...booking,
          roomName: roomData?.roomName || booking.roomId,
          buildingId: roomData?.buildingId || booking.buildingId,
        };
      });

      setExistingBookings(enrichedBookings);
      processBookingsForTimeSlots(enrichedBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    }
  };

  useEffect(() => {
    if (formData.buildingId && formData.roomId && formData.date && rooms.length > 0) {
      fetchBookings(); // Fetch bookings data for all rooms
    }
  }, [formData.buildingId, formData.roomId, formData.date, rooms]);

  const processBookingsForTimeSlots = (bookings) => {
    if (!bookings || !formData.buildingId || !formData.roomId || !formData.date) return;
  
    // Clear previous unavailable time slots
    setUnavailableTimeSlots([]);
  
    // Filter bookings for the selected building and room
    const relevantBookings = bookings.filter(booking =>
      booking.buildingId === formData.buildingId &&
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
  
    // Update unavailable time slots
    setUnavailableTimeSlots(unavailable);
  };
  
  // Filter rooms based on building and category
  useEffect(() => {
    if (formData.buildingId && formData.categoryId) {
      const filtered = rooms.filter(
        (room) =>
          room.buildingId === formData.buildingId && room.categoryId === formData.categoryId
      );
      
      // Sort rooms by name
      filtered.sort((a, b) => a.roomName.localeCompare(b.roomName));
      setFilteredRooms(filtered);
    } else {
      setFilteredRooms([]);
    }
  }, [formData.buildingId, formData.categoryId, rooms]);

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
  
    if (name === 'buildingId') {
      const selectedBuilding = buildings.find(b => b.id === value) || { name: '' };
      console.log("Selected building:", selectedBuilding); // Debug log
  
      setFormData({
        ...formData,
        [name]: value, // Set the buildingId correctly
        buildingName: selectedBuilding.name, // Set the buildingName from the selected building
        categoryId: '', // Reset categoryId when building changes
        categoryName: '', // Reset categoryName when building changes
        roomId: '', // Reset roomId when building changes
      });
      setAvailabilityStatus(null); // Reset availability status
    } else if (name === 'categoryId') {
      const selectedCategory = categories.find(c => c.id === value) || { name: '' };
  
      setFormData({
        ...formData,
        [name]: value, // Set the categoryId correctly
        categoryName: selectedCategory.name, // Set the categoryName from the selected category
        roomId: '', // Reset roomId when category changes
      });
      setAvailabilityStatus(null);
    } else if (name === 'roomId') {
      const selectedRoom = roomMap[value] || {};
      setFormData({
        ...formData,
        [name]: value, // Set the roomId correctly
        roomName: selectedRoom.roomName || '', // Set the roomName from the selected room
      });
      setAvailabilityStatus(null);
  
      // Check availability after a short delay
      if (formData.buildingId && value && formData.date && formData.startTime && formData.endTime) {
        checkTimeAvailability({
          ...formData,
          [name]: value,
        });
      }
    } else if (name === 'date' || name === 'startTime' || name === 'endTime') {
      setFormData({
        ...formData,
        [name]: value, // Update the respective field
      });
      setAvailabilityStatus(null);
  
      // Check availability after a short delay
      if (formData.buildingId && formData.roomId && formData.date &&
          (name === 'roomId' || name === 'date' || name === 'startTime' || name === 'endTime')) {
        checkTimeAvailability({
          ...formData,
          [name]: value,
        });
      }
    } else {
      setFormData({
        ...formData,
        [name]: type === 'checkbox' ? checked : value, // Handle other fields
      });
    }
  };

  const checkTimeAvailability = async (data) => {
    if (!data.date || !data.startTime || !data.endTime || !data.roomId || !data.categoryId) {
      setAvailabilityStatus({
        available: false,
        message: 'Please provide a valid date, room, start time, end time, and category.',
      });
      return;
    }
  
    setIsCheckingAvailability(true);
  
    try {
      // Convert times to proper format for API
      const startTime24 = convertTo24HourFormat(data.startTime);
      const endTime24 = convertTo24HourFormat(data.endTime);
  
      // Ensure the time format is correct (HH:MM:SS) as required by backend validation
      const formattedStartTime = startTime24.includes(':') && startTime24.split(':').length === 2 
        ? `${startTime24}:00` 
        : startTime24;
        
      const formattedEndTime = endTime24.includes(':') && endTime24.split(':').length === 2 
        ? `${endTime24}:00` 
        : endTime24;

      // Log the payload being sent to the API
      console.log('Payload for availability check:', {
        buildingId: data.buildingId,
        roomId: data.roomId,
        categoryId: data.categoryId,
        date: data.date,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
      });
  
      // Call the availability check endpoint using fetch
      const response = await fetch(`${API_BASE_URL}/bookings/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          buildingId: data.buildingId,
          roomId: data.roomId,
          categoryId: data.categoryId,
          date: data.date,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
        })
      });

      if (!response.ok) {
        throw new Error(`Error checking availability: ${response.statusText}`);
      }

      const responseData = await response.json();
      setAvailabilityStatus(responseData);
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailabilityStatus({
        available: false,
        message: err.message || 'Error checking availability. Please try again.',
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

    if (!formData.startTime || !formData.endTime || !formData.roomId || !formData.buildingId || !userId) {
      setError('All fields (startTime, endTime, roomId, buildingId, and userId) are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert times to proper format for SQL (HH:mm:ss)
      const startTimeSQL = convertTo24HourFormat(formData.startTime);
      const endTimeSQL = convertTo24HourFormat(formData.endTime);

      // Log the converted times for debugging
      console.log('Converted Start Time:', startTimeSQL);
      console.log('Converted End Time:', endTimeSQL);

      // Format timeSubmitted in a SQL Server-friendly format without timezone
      const now = new Date();
      const timeSubmitted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const bookingPayload = {
        userId,
        title: formData.title,
        firstName: formData.firstName,
        lastName: formData.lastName,
        buildingId: formData.buildingId,
        categoryId: formData.categoryId,
        roomId: formData.roomId,
        date: formData.date,
        startTime: startTimeSQL,
        endTime: endTimeSQL,
        department: formData.department,
        isRecurring: formData.isRecurring,
        recurrenceEndDate: formData.recurrenceEndDate === '' ? null : formData.recurrenceEndDate,
        notes: formData.notes === '' ? null : formData.notes,
        isMealRoom: formData.isMealRoom,
        isBreakRoom: formData.isBreakRoom,
        bookingCapacity: formData.bookingCapacity,
        status: formData.status,
        // Do NOT send timeSubmitted
      };

      console.log('Booking Payload:', bookingPayload); // <-- Only this line

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking.');
      }

      const data = await response.json();
      onBookingSubmit(data);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
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

        <div className="relative bg-white rounded-lg shadow-md p-8 max-w-xl mx-auto">  
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
                name="buildingId"
                value={formData.buildingId}
                onChange={handleChange}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Building</option>
                {buildings.map((building) => (
                  <option key={building.id} value={building.id}>
                    {building.name}
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
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.buildingId}
              >
                <option value="">Select Category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
                name="roomId"
                value={formData.roomId}
                onChange={handleChange}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={!formData.categoryId}
              >
                <option value="">Select Room</option>
                {filteredRooms.map((room) => (
                  <option key={room.roomId} value={room.roomId}>
                    {room.roomName}
                  </option>
                ))}
              </select>
            </div>

            {/* Additional Room Options */}

            <div className="text-center">
              <label className="block text-sm font-medium text-gray-700 mb-2">Other Request</label>
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

             {/* Date*/}
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
                    style={{ textAlign: 'center', width: '100%', padding: '1rem', border: '1px solid #ccc', borderRadius: '0.5rem', outline: 'none' }}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

            {/* Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                      name="recurrenceEndDate"
                      value={formData.recurrenceEndDate}
                      onChange={handleChange}
                      min={formData.date}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={formData.isRecurring} // Only required if "isRecurring" is true
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