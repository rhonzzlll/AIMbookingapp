import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import TopBar from '../../components/AdminComponents/TopBar';
import DeleteConfirmation from './modals/DeleteConfirmation';
import StatusModal from './modals/StatusModal';

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

// Format 24-hour time to 12-hour format
const convertTo12HourFormat = (time24h) => {
  if (!time24h) return '';
  
  const [hours, minutes] = time24h.split(':');
  const hoursInt = parseInt(hours, 10);
  const modifier = hoursInt >= 12 ? 'PM' : 'AM';
  const hours12 = hoursInt % 12 || 12;
  
  return `${hours12}:${minutes} ${modifier}`;
};

// Base API URL
const API_BASE_URL = 'http://localhost:5000/api';

// Predefined options for dropdowns
const DEPARTMENTS = ['Engineering', 'Marketing', 'HR', 'Finance', 'Sales', 'IT', 'ICT'];

// Initial form state
const initialFormState = {
  title: '',
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  category: '',
  room: '',
  roomId: null,
  building: '',
  date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
  startTime: null,
  endTime: null,
  notes: '',
  isRecurring: false,
  recurrenceEndDate: '',
  status: 'pending',
  bookingCapacity: 1,
  userId: null,
  isMealRoom: false,
  isBreakRoom: false,
  remarks: ''
};

// Time options for dropdowns
const TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', 
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
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
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for modal controls
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBookingId, setEditBookingId] = useState(null);
  
  // State for room data
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  
  // New state for buildings and categories from API
  const [buildings, setBuildings] = useState([]);
  const [buildingCategories, setBuildingCategories] = useState({});
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  useEffect(() => {
    const fetchRoomsAndBookings = async () => {
      try {
        setLoading(true);
        const roomRes = await axios.get(`${API_BASE_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Store original room data
        const roomsData = roomRes.data;
        setRooms(roomsData);
        
        // Extract unique buildings
        const uniqueBuildings = [...new Set(roomsData.map(room => room.building))];
        setBuildings(uniqueBuildings);
        
        // Create mapping of buildings to their categories
        const categoryMap = {};
        uniqueBuildings.forEach(building => {
          const roomsInBuilding = roomsData.filter(room => room.building === building);
          const categories = [...new Set(roomsInBuilding.map(room => room.category))];
          categoryMap[building] = categories;
        });
        
        setBuildingCategories(categoryMap);

        const bookingRes = await axios.get(`${API_BASE_URL}/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Map bookings with room details
        const bookingsWithRoomDetails = await Promise.all(bookingRes.data.map(async (booking) => {
          // Find the room for this booking
          const room = roomsData.find(r => r.roomId === booking.roomId);
          
          // If we need user information
          let userData = {};
          if (booking.userId) {
            try {
              const userRes = await axios.get(`${API_BASE_URL}/users/${booking.userId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              userData = userRes.data;
            } catch (error) {
              console.error(`Could not fetch user data for ID ${booking.userId}`, error);
            }
          }
          
          return {
            ...booking,
            roomName: room?.roomName || 'Unknown Room',
            building: room?.building || 'Unknown Building',
            category: room?.category || 'Unknown Category',
            firstName: userData?.firstName || '',
            lastName: userData?.lastName || '',
            department: userData?.department || '',
            email: userData?.email || '',
          };
        }));

        setBookings(bookingsWithRoomDetails);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load data. Please check your API connection.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomsAndBookings();
  }, [token]);

  // Fetch bookings data
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
  
    try {
      const [bookingsRes, roomsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
  
      // Create a map of rooms for quick lookup
      const roomMap = {};
      roomsRes.data.forEach(room => {
        roomMap[room.roomId] = room;
      });
      
      // Create a map of users for quick lookup
      const userMap = {};
      usersRes.data.forEach(user => {
        userMap[user.userId] = user;
      });
  
      const enrichedBookings = bookingsRes.data.map(booking => {
        const room = roomMap[booking.roomId] || {};
        const user = userMap[booking.userId] || {};
        
        return {
          ...booking,
          roomName: room.roomName || 'Unknown Room',
          building: room.building || 'Unknown Building',
          category: room.category || 'Unknown Category',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          department: user.department || '',
          email: user.email || '',
          // Convert database date and time formats to frontend format
          startTime12h: booking.startTime ? convertTo12HourFormat(booking.startTime) : '',
          endTime12h: booking.endTime ? convertTo12HourFormat(booking.endTime) : '',
          recurring: booking.isRecurring ? 'Yes' : 'No'
        };
      });
  
      setBookings(enrichedBookings);
      setRooms(roomsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  // Fetch buildings and their categories from rooms API
  const fetchBuildingsAndCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Extract unique buildings
      const uniqueBuildings = [...new Set(response.data.map(room => room.building))];
      setBuildings(uniqueBuildings);
      
      // Create mapping of buildings to their categories
      const categoryMap = {};
      uniqueBuildings.forEach(building => {
        const roomsInBuilding = response.data.filter(room => room.building === building);
        const categories = [...new Set(roomsInBuilding.map(room => room.category))];
        categoryMap[building] = categories;
      });
      
      setBuildingCategories(categoryMap);
    } catch (err) {
      console.error('Error fetching buildings and categories:', err);
    }
  }, [token]);

  // Initialize data on component mount
  useEffect(() => {
    fetchBookings();
    fetchBuildingsAndCategories();
  }, [fetchBookings, fetchBuildingsAndCategories]);

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
    const selectedBuilding = booking.building;
    const selectedCategory = booking.category;
  
    // Set categories and available rooms based on the booking's building and category
    const selectedCategories = buildingCategories[selectedBuilding] || [];
    const matchedRooms = rooms.filter(
      (room) => room.building === selectedBuilding && room.category === selectedCategory
    );
  
    setCategories(selectedCategories);
    setAvailableRooms(matchedRooms);
  
    // Format the times for the form
    const startTime12h = booking.startTime12h || convertTo12HourFormat(booking.startTime);
    const endTime12h = booking.endTime12h || convertTo12HourFormat(booking.endTime);
  
    // Prefill form
    setFormData({
      ...booking,
      date: parseISODate(booking.date),
      startTime: startTime12h,
      endTime: endTime12h,
      isRecurring: booking.isRecurring || booking.recurring === 'Yes',
      recurring: booking.isRecurring ? 'Yes' : 'No',
      recurrenceEndDate: booking.recurrenceEndDate ? parseISODate(booking.recurrenceEndDate) : '',
      roomId: booking.roomId,
      isMealRoom: booking.isMealRoom || false,
      isBreakRoom: booking.isBreakRoom || false,
    });
  
    setEditBookingId(booking.bookingId);
    setIsEditModalOpen(true);
  };
  
  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
    setIsDeleteModalOpen(true);
  };
  
  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;
    
    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/bookings/${bookingToDelete.bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchBookings(); // Refresh the bookings list
      setIsDeleteModalOpen(false);
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError('Failed to delete booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (bookingId, status) => {
    setSelectedBookingId(bookingId);
    setSelectedStatus(status);
    setIsStatusModalOpen(true);
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'isRecurring' || name === 'isMealRoom' || name === 'isBreakRoom') {
      setFormData(prev => ({ ...prev, [name]: e.target.checked }));
      return;
    }
  
    setFormData(prev => ({ ...prev, [name]: value }));
  
    if (name === 'building') {
      setFormData(prev => ({
        ...prev,
        building: value,
        category: '',
        roomId: null,
        room: '',
        roomName: ''
      }));
      
      // Use categories from API for selected building
      setCategories(buildingCategories[value] || []);
      setAvailableRooms([]);
    }
  
    else if (name === 'room') {
      const selectedRoom = availableRooms.find(r => r.roomId.toString() === value);
      setFormData(prev => ({
        ...prev,
        room: value,
        roomId: selectedRoom?.roomId || null,
        roomName: selectedRoom?.roomName || ''
      }));
    }
    
    else if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        roomId: null,
        room: '',
        roomName: ''
      }));
      if (formData.building && value) {
        const filteredRooms = rooms.filter(
          room => room.building === formData.building && room.category === value
        );
        setAvailableRooms(filteredRooms);
      }
    }
  };
    
  const handleBuildingChange = (e) => {
    const selectedBuilding = e.target.value;
    
    // Update form data with building, reset category and room
    setFormData(prev => ({
      ...prev,
      building: selectedBuilding,
      category: '',
      roomId: null,
      room: '',
      roomName: ''
    }));
    
    // Get categories for this building from the mapping
    const buildingCategories = buildingCategories[selectedBuilding] || [];
    setCategories(buildingCategories);
    
    // Clear available rooms until category is selected
    setAvailableRooms([]);
  };

  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    
    // Update form data with category, reset room
    setFormData(prev => ({
      ...prev,
      category: selectedCategory,
      roomId: null,
      room: '',
      roomName: ''
    }));
    
    // Filter rooms based on selected building and category
    if (formData.building && selectedCategory) {
      const filteredRooms = rooms.filter(
        room => room.building === formData.building && room.category === selectedCategory
      );
      setAvailableRooms(filteredRooms);
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
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    setFormError({});

    const loggedInUserId = localStorage.getItem('userId');
    if (!loggedInUserId) {
      setError('User not authenticated. Please log in again.');
      setSubmitLoading(false);
      return;
    }

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

    if (!formData.roomId) {
      errors.room = 'Room selection is required';
      hasError = true;
    }

    if (!formData.building) {
      errors.building = 'Building is required';
      hasError = true;
    }

    if (formData.isRecurring && !formData.recurrenceEndDate) {
      errors.recurrence = 'Recurrence end date is required for recurring bookings';
      hasError = true;
    }

    // Find the user ID from the first and last name
    const selectedUser = users.find(
      user => 
        user.firstName.toLowerCase() === formData.firstName.toLowerCase() &&
        user.lastName.toLowerCase() === formData.lastName.toLowerCase()
    );
    
    if (!selectedUser && !formData.userId) {
      errors.name = 'User not found. Please enter a registered first and last name.';
      hasError = true;
    }

    if (hasError) {
      setFormError(errors);
      setSubmitLoading(false);
      return;
    }

    try {
      // Get the details of the logged-in user who is making this booking
      const adminResponse = await axios.get(`${API_BASE_URL}/users/${loggedInUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const adminData = adminResponse.data;
      const changedByName = `${adminData.firstName} ${adminData.lastName}`;

      const startTime24 = convertTo24HourFormat(formData.startTime);
      const endTime24 = convertTo24HourFormat(formData.endTime);
      
      // Create a timestamp for the submission time
      const now = new Date();
      const timeSubmitted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      const payload = {
        title: formData.title,
        roomId: formData.roomId || parseInt(formData.room),
        userId: formData.userId || selectedUser?.userId,
        bookingCapacity: parseInt(formData.bookingCapacity) || 1,
        date: formData.date,
        startTime: startTime24,
        endTime: endTime24,
        notes: formData.notes,
        isRecurring: formData.isRecurring,
        isMealRoom: formData.isMealRoom,
        isBreakRoom: formData.isBreakRoom,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : null,
        status: formData.status || 'pending',
        timeSubmitted: timeSubmitted,
        remarks: formData.remarks || '',
        changedBy: changedByName
      };

      let responseBooking;

      if (isEditModalOpen && editBookingId) {
        responseBooking = await axios.put(
          `${API_BASE_URL}/bookings/${editBookingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        responseBooking = await axios.post(
          `${API_BASE_URL}/bookings`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      resetForm();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      fetchBookings();
    } catch (err) {
      console.error('Booking error:', err.response?.data || err.message);
      if (err.response?.data?.message) {
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

  const getAvailableTimeOptions = (isStart) => {
    const now = new Date();
    const selectedDate = new Date(formData.date);
    const isToday = now.toDateString() === selectedDate.toDateString();
  
    const allTimes = TIME_OPTIONS;
  
    if (!isToday) return allTimes;
  
    // Convert current time to minutes
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinutes;
  
    return allTimes.filter((time) => {
      const [timePart, modifier] = time.split(' ');
      let [hours, minutes] = timePart.split(':').map(Number);
  
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
  
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes > currentTotalMinutes;
    });
  };
  
  const getTimeInMinutes = (timeStr) => {
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
  
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
  
    return hours * 60 + minutes;
  };

  const isTimeSlotTaken = (timeStr, type = 'start') => {
    if (!formData.roomId || !formData.date) return false;
  
    const selectedRoom = rooms.find(r => r.roomId === formData.roomId);
    const selectedRoomName = selectedRoom?.roomName;
    if (!selectedRoomName) return false;
  
    const [hourStr, minuteStr] = timeStr.split(' ')[0].split(':');
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    const modifier = timeStr.split(' ')[1];
  
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
  
    const checkTime = new Date(`${formData.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  
    return bookings.some((booking) => {
      // Skip the current booking when editing
      if (isEditModalOpen && editBookingId && booking.bookingId === editBookingId) return false;
    
      const bookingDate = new Date(booking.date).toISOString().split('T')[0];
      const selectedDate = new Date(formData.date).toISOString().split('T')[0];
    
      if (
        booking.roomId === formData.roomId &&
        bookingDate === selectedDate &&
        booking.status === 'confirmed'
      ) {
        const bookingStart = new Date(`${bookingDate}T${booking.startTime}`);
        const bookingEnd = new Date(`${bookingDate}T${booking.endTime}`);
    
        if (type === 'start') {
          const bufferEnd = new Date(bookingEnd.getTime() + 30 * 60 * 1000);
          return checkTime >= bookingStart && checkTime < bufferEnd;
        }
    
        if (type === 'end') {
          const bufferStart = new Date(bookingStart.getTime() - 30 * 60 * 1000);
          return checkTime >= bufferStart && checkTime < bookingEnd;
        }
      }
    
      return false;
    });
  };
  
  const getFilteredStartTimes = () => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
    return TIME_OPTIONS.filter((time) => {
      const timeMinutes = getTimeInMinutes(time);
      const isToday = formData.date === today;
      return (!isToday || timeMinutes > currentMinutes) && !isTimeSlotTaken(time, 'start');
    });
  };
  
  const getFilteredEndTimes = () => {
    if (!formData.startTime || !formData.date) return [];
  
    const start24 = convertTo24HourFormat(formData.startTime);
    const startDateTime = new Date(`${formData.date}T${start24}:00`);
    const availableEndTimes = [];
  
    for (const time of TIME_OPTIONS) {
      const end24 = convertTo24HourFormat(time);
      const endDateTime = new Date(`${formData.date}T${end24}:00`);
      if (endDateTime <= startDateTime) continue;
  
      const bufferEnd = new Date(endDateTime.getTime() + 30 * 60 * 1000);
  
      const hasConflict = bookings.some((booking) => {
         
        if (isEditModalOpen && editBookingId && booking._id === editBookingId) return false;
  
        const bookingDate = new Date(booking.date).toISOString().split('T')[0];
        const selectedDate = new Date(formData.date).toISOString().split('T')[0];
        const roomMatch = rooms.find(r => r._id === formData.room)?.roomName === booking.roomName;
  
        if (!roomMatch || bookingDate !== selectedDate || booking.status !== 'confirmed') return false;
  
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
  
        return startDateTime < bookingEnd && bufferEnd > bookingStart;
      });
  
      if (hasConflict) break;
  
      availableEndTimes.push(time);
    }
  
    return availableEndTimes;
  };
  
  
  
  
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
              onChange={handleBuildingChange} // Use the dedicated handler
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Building</option>
              {buildings.map(building => (
                <option key={building} value={building}>{building}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleCategoryChange} // Use the dedicated handler
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
                <option key={room._id} value={room._id}>
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
              min={new Date().toISOString().split('T')[0]} // disables past dates
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
              {getFilteredStartTimes().map((time) => (
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
              {getFilteredEndTimes().map((time) => (
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
      <TopBar onSearch={setSearchTerm} />
      <div className="p-4 bg-gray-100 w-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
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
                {[
                  { key: 'title', label: 'Booking Title' },
                  { key: 'firstName', label: 'First Name' },
                  { key: 'lastName', label: 'Last Name' },
                  { key: 'department', label: 'Department' },
                  { key: 'category', label: 'Category' },
                  { key: 'room', label: 'Room' },
                  { key: 'building', label: 'Building' },
                  { key: 'date', label: 'Date' },
                  { key: 'startTime', label: 'Time' },
                  { key: 'bookingCapacity', label: 'Capacity' },
                  { key: 'isMealRoom', label: 'Meal Room' },
                  { key: 'isBreakRoom', label: 'Break Room' },
                  { key: 'status', label: 'Status' },
                  { key: 'recurring', label: 'Recurring' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="cursor-pointer px-4 py-2 border-b"
                  >
                    {label} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                ))}
                <th className="px-4 py-2 border-b">Actions</th>
              </tr>
            </thead>

            <tbody>
            {!loading && currentBookings.length > 0 ? (
              sortedBookings
                .filter(booking =>
                  `${booking.title} ${booking.firstName} ${booking.lastName} ${booking.department} ${booking.category} ${booking.roomName} ${booking.building}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((booking) => (
                  <tr key={booking._id || booking.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-2 border-b">{booking.title}</td>
                    <td className="px-4 py-2 border-b">{booking.firstName}</td>
                    <td className="px-4 py-2 border-b">{booking.lastName}</td>
                    <td className="px-4 py-2 border-b">{booking.department}</td>
                    <td className="px-4 py-2 border-b">{booking.category}</td>
                    <td className="px-4 py-2 border-b">{booking.roomName}</td>
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
                    <td className="px-4 py-2 border-b">{booking.bookingCapacity || '1'}</td>
                    <td className="px-4 py-2 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        booking.isMealRoom ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {booking.isMealRoom ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        booking.isBreakRoom ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {booking.isBreakRoom ? 'Yes' : 'No'}
                      </span>
                    </td>
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
                          View
                        </button>
                        <button
                          className="text-green-600 hover:underline"
                          onClick={() => handleStatusChange(booking._id, 'confirmed')}
                        >
                          Confirm
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleStatusChange(booking._id, 'declined')}
                        >
                          Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                !loading && (
                  <tr>
                    <td colSpan="16" className="px-4 py-4 text-center text-gray-500">
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

      {/* Status Modal */}
      <StatusModal
        isOpen={isStatusModalOpen}
        currentStatus={selectedStatus}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={async () => {
          try {
            await axios.put(
              `${API_BASE_URL}/bookings/${selectedBookingId}`,
              { status: selectedStatus },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchBookings(); // Refresh bookings
            setIsStatusModalOpen(false);
          } catch (err) {
            console.error('Error updating status:', err);
          }
        }}
      />
    </div>
  );
};

export default Bookings;