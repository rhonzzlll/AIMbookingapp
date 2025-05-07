import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import TopBar from '../../components/AdminComponents/TopBar';
import DeleteConfirmation from './modals/DeleteConfirmation';
import StatusModal from './modals/StatusModal';
import ExportCSV from '../../components/AdminComponents/ExportCSV';

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

// Time options for dropdowns
const TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', 
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

// Initial form state matching the Sequelize model
const initialFormState = {
  title: '',
  firstName: '', // For UI only, not in model
  lastName: '', // For UI only, not in model
  email: '', // For UI only, not in model
  userId: '', // Maps to userId in model
  roomId: '', // Maps to roomId in model
  department: '', // Not directly in model but useful for UI
  category: '', // Not directly in model but useful for UI
  building: '', // Not directly in model but useful for filtering rooms
  date: new Date().toISOString().split('T')[0], // Maps to date in model
  startTime: null, // Maps to startTime in model
  endTime: null, // Maps to endTime in model
  notes: '', // Maps to notes in model
  isRecurring: false, // Maps to isRecurring in model, replaces 'recurring'
  isMealRoom: false, // Maps to isMealRoom in model
  isBreakRoom: false, // Maps to isBreakRoom in model
  recurrenceEndDate: '', // Maps to recurrenceEndDate in model
  status: 'pending', // Maps to status in model
  bookingCapacity: 1, // Maps to bookingCapacity in model
  remarks: '', // Maps to remarks in model
};

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
  const [unavailableTimeSlots, setUnavailableTimeSlots] = useState([]);
  
  // State for modal controls
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBookingId, setEditBookingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  
  // State for room data
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);

  // Get token and userId from localStorage
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('_id');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [adminName, setAdminName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // Fetch buildings data
  const fetchBuildings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/buildings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBuildings(response.data);
    } catch (err) {
      console.error('Error fetching buildings:', err);
    }
  }, [token]);

  // Fetch categories data
  const fetchCategories = useCallback(async (buildingId = null) => {
    try {
      let url = `${API_BASE_URL}/categories`;
      if (buildingId) {
        url += `?buildingId=${buildingId}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [token]);

  // Fetch rooms data
  const fetchRooms = useCallback(async (buildingId = null, categoryId = null) => {
    try {
      let url = `${API_BASE_URL}/rooms`;
      const queryParams = [];
      
      if (buildingId) queryParams.push(`buildingId=${buildingId}`);
      if (categoryId) queryParams.push(`categoryId=${categoryId}`);
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRooms(response.data);
    } catch (err) {
      console.error('Error fetching rooms:', err);
    }
  }, [token]);

  // Fetch bookings data
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
  
    try {
      const bookingsRes = await axios.get(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
  
      // Enrich booking data with room and user information
      const enrichedBookings = await Promise.all(
        bookingsRes.data.map(async (booking) => {
          let roomData = {};
          let userData = {};
          
          try {
            // Fetch room data for this booking
            if (booking.roomId) {
              const roomRes = await axios.get(`${API_BASE_URL}/rooms/${booking.roomId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              roomData = roomRes.data;
            }
            
            // Fetch user data for this booking
            if (booking.userId) {
              const userRes = await axios.get(`${API_BASE_URL}/users/${booking.userId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              userData = userRes.data;
            }
          } catch (err) {
            console.error('Error fetching related data for booking:', err);
          }
          
          return {
            ...booking,
            roomName: roomData.roomName || 'Unknown Room',
            building: roomData.building?.name || 'Unknown Building',
            category: roomData.category?.name || 'Unknown Category',
            userName: userData ? `${userData.firstName} ${userData.lastName}` : 'Unknown User'
          };
        })
      );
  
      setBookings(enrichedBookings);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
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

  // Fetch current user data
  const fetchCurrentUser = useCallback(async () => {
    if (!token || !userId) {
      console.error('No authentication token or user ID found');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setCurrentUser(response.data);
      setAdminName(`${response.data.firstName} ${response.data.lastName}`);
    } catch (err) {
      console.error('Error fetching current user details:', err);
    }
  }, [token, userId]);

  // Initialize data on component mount
  useEffect(() => {
    fetchBookings();
    fetchBuildings();
    fetchCategories();
    fetchRooms();
    fetchUsers();
    fetchCurrentUser();
  }, [fetchBookings, fetchBuildings, fetchCategories, fetchRooms, fetchUsers, fetchCurrentUser]);

  // Filter bookings based on active tab
  const filteredBookings = useMemo(() => {
    let filtered = bookings;
  
    if (activeBookingTab === 'all') {
      // Sort by date descending for "All" tab
      filtered = bookings.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (activeBookingTab === 'pending') {
      filtered = bookings.filter(booking => booking.status === 'pending');
    } else if (activeBookingTab === 'approved') {
      filtered = bookings.filter(booking => booking.status === 'confirmed');
    } else if (activeBookingTab === 'declined') {
      filtered = bookings.filter(booking => booking.status === 'declined');
    } else if (activeBookingTab === 'recent') {
      // Sort by created date in descending order for recent bookings
      filtered = bookings.sort((a, b) => new Date(b.timeSubmitted || b.date) - new Date(a.timeSubmitted || a.date));
    }

    // Apply search filter if present
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(booking => 
        (booking.title && booking.title.toLowerCase().includes(term)) || 
        (booking.userName && booking.userName.toLowerCase().includes(term)) ||
        (booking.roomName && booking.roomName.toLowerCase().includes(term)) ||
        (booking.building && booking.building.toLowerCase().includes(term))
      );
    }
  
    return filtered;
  }, [bookings, activeBookingTab, searchTerm]);
  
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
    // Fetch related data for the selected building and category
    fetchCategories(booking.buildingId);
    fetchRooms(booking.buildingId, booking.categoryId);
  
    // Format times properly using the TIME_OPTIONS format
    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);
    
    // Format to match the TIME_OPTIONS format (e.g., "8:00 AM")
    const formatTimeFor12Hour = (date) => {
      let hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12; // the hour '0' should be '12'
      const minutesStr = minutes < 10 ? '0' + minutes : minutes;
      
      return `${hours}:${minutesStr} ${ampm}`;
    };
    
    const formattedStartTime = formatTimeFor12Hour(startDate);
    const formattedEndTime = formatTimeFor12Hour(endDate);
  
    // Find user details
    const user = users.find(u => u.userId === booking.userId) || {};
  
    // Prefill form
    setFormData({
      ...booking,
      date: parseISODate(booking.date),
      startTime: formattedStartTime,
      endTime: formattedEndTime,
      isRecurring: !!booking.isRecurring,
      recurrenceEndDate: booking.recurrenceEndDate ? parseISODate(booking.recurrenceEndDate) : '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      department: user.department || '',
    });
  
    setEditBookingId(booking.bookingId);
    setIsEditModalOpen(true);
  };
  
  const openDeleteModal = (booking) => {
    setBookingToDelete(booking);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/bookings/${bookingToDelete.bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsDeleteModalOpen(false);
      setBookingToDelete(null);
      fetchBookings(); // Refresh the bookings list
    } catch (err) {
      console.error('Error deleting booking:', err);
      setError('Failed to delete booking. Please try again.');
    }
  };

  const handleStatusChange = async (bookingId, status) => {
    setSelectedBookingId(bookingId);
    setSelectedStatus(status);
    
    // We already have the current user info, so we can use it directly
    if (currentUser) {
      const name = `${currentUser.firstName} ${currentUser.lastName}`;
      setAdminName(name);
    } else {
      // As a fallback, try to fetch the user info again
      try {
        const userResponse = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const userData = userResponse.data;
        const name = `${userData.firstName} ${userData.lastName}`;
        setAdminName(name);
      } catch (err) {
        console.error('Error fetching admin information:', err);
        setAdminName('Admin User'); // Default fallback
      }
    }
    
    setIsStatusModalOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedBookingId || !selectedStatus) return;
    
    try {
      await axios.patch(
        `${API_BASE_URL}/bookings/${selectedBookingId}/status`, 
        { 
          status: selectedStatus,
          changedBy: adminName,
          remarks: formData.remarks || ''
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setIsStatusModalOpen(false);
      fetchBookings(); // Refresh bookings after status change
    } catch (err) {
      console.error('Error updating booking status:', err);
      setError('Failed to update booking status. Please try again.');
    }
  };

  // Form states
  const [formData, setFormData] = useState({ ...initialFormState });
  const [formError, setFormError] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  // Reset form to initial state
  const resetForm = () => {
    setFormData({ ...initialFormState });
    setFormError({});
    setCategories([]);
    setAvailableRooms([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
  
    setFormData(prev => ({ ...prev, [name]: value }));
  
    if (name === 'building') {
      // Reset dependent fields
      setFormData(prev => ({
        ...prev,
        building: value,
        category: '',
        roomId: '',
        roomName: ''
      }));
      
      // Fetch categories for selected building
      fetchCategories(value);
      setAvailableRooms([]);

    } else if (name === 'category') {
      // Reset room selection
      setFormData(prev => ({
        ...prev,
        category: value,
        roomId: '',
        roomName: ''
      }));
      
      // Fetch rooms for selected building and category
      if (formData.building && value) {
        fetchRooms(formData.building, value);
      }
      
    } else if (name === 'roomId') {
      const selectedRoom = rooms.find(r => r.roomId.toString() === value);
      setFormData(prev => ({
        ...prev,
        roomId: selectedRoom?.roomId || '',
        roomName: selectedRoom?.roomName || ''
      }));
    } else if (name === 'isRecurring') {
      setFormData(prev => ({
        ...prev,
        isRecurring: value === 'Yes'
      }));
    } else if (name === 'isMealRoom' || name === 'isBreakRoom') {
      setFormData(prev => ({
        ...prev,
        [name]: e.target.checked
      }));
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
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

    const adminUserId = localStorage.getItem('_id');
    if (!adminUserId) {
      setError('User not authenticated. Please log in again.');
      setSubmitLoading(false);
      return;
    }

    let hasError = false;
    const errors = {};

    // Validation
    if (!formData.title) {
      errors.title = 'Title is required';
      hasError = true;
    }

    if (!formData.userId && (!formData.firstName || !formData.lastName)) {
      errors.name = 'User information is required';
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

    // If user not pre-selected, check if they exist
    if (!formData.userId) {
      const userExists = users.some(
        (user) =>
          user.firstName.toLowerCase() === formData.firstName.toLowerCase() &&
          user.lastName.toLowerCase() === formData.lastName.toLowerCase()
      );
      
      if (!userExists) {
        errors.name = 'User not found. Please enter a registered first and last name.';
        hasError = true;
      } else {
        // Find the user ID if the user exists
        const matchedUser = users.find(
          (user) =>
            user.firstName.toLowerCase() === formData.firstName.toLowerCase() &&
            user.lastName.toLowerCase() === formData.lastName.toLowerCase()
        );
        formData.userId = matchedUser?.userId;
      }
    }

    if (hasError) {
      setFormError(errors);
      setSubmitLoading(false);
      return;
    }

    try {
      // Format times for API
      const startTime24 = convertTo24HourFormat(formData.startTime);
      const endTime24 = convertTo24HourFormat(formData.endTime);
      const startDateTime = `${formData.date}T${startTime24}:00`;
      const endDateTime = `${formData.date}T${endTime24}:00`;
      
      // Format the current time for timeSubmitted
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const timeSubmitted = `${hours}:${minutes}:${seconds}`;

      const payload = {
        title: formData.title,
        roomId: formData.roomId,
        userId: formData.userId,
        date: formData.date,
        startTime: startTime24,
        endTime: endTime24,
        notes: formData.notes,
        isRecurring: formData.isRecurring,
        isMealRoom: formData.isMealRoom || false,
        isBreakRoom: formData.isBreakRoom || false,
        recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : null,
        status: 'pending',
        bookingCapacity: formData.bookingCapacity || 1,
        timeSubmitted: timeSubmitted,
        changedBy: adminName,
        remarks: formData.remarks || ''
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

  // Time slot availability helpers
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
  
    const selectedRoom = rooms.find(r => r.roomId.toString() === formData.roomId.toString());
    if (!selectedRoom) return false;
  
    const [hourStr, minuteStr] = timeStr.split(' ')[0].split(':');
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    const modifier = timeStr.split(' ')[1];
  
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
  
    const checkTime = new Date(`${formData.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  
    // Check for conflicts for the specific room
    return bookings.some((booking) => {
      if (isEditModalOpen && editBookingId && booking.bookingId === editBookingId) return false;  // Skip the current booking when editing
  
      const bookingDate = new Date(booking.date).toISOString().split('T')[0];
      const selectedDate = new Date(formData.date).toISOString().split('T')[0];
  
      if (
        booking.roomId.toString() === formData.roomId.toString() && 
        bookingDate === selectedDate && 
        booking.status === 'confirmed'
      ) {
        const bookingStart = new Date(`${booking.date}T${booking.startTime}`);
        const bookingEnd = new Date(`${booking.date}T${booking.endTime}`);
  
        if (type === 'start') {
          const bufferEnd = new Date(bookingEnd.getTime() + 30 * 60 * 1000);  // Buffer time
          return checkTime >= bookingStart && checkTime < bufferEnd;
        }
  
        if (type === 'end') {
          const bufferStart = new Date(bookingStart.getTime() - 30 * 60 * 1000);  // Buffer time
          return checkTime >= bufferStart && checkTime < bookingEnd;
        }
      }
  
      return false;
    });
  };  

  const processBookingsForTimeSlots = (bookings) => {
    if (!bookings || !formData.building || !formData.room || !formData.date) return;
  
    // Clear previous unavailable time slots
    setUnavailableTimeSlots([]);
  
    const relevantBookings = bookings.filter(booking =>
      booking.building === formData.building &&
      new Date(booking.startTime).toDateString() === new Date(`${formData.date}T00:00:00`).toDateString() &&
      booking.status?.toLowerCase() === 'confirmed'
    );
  
    const unavailable = [];
  
    relevantBookings.forEach(booking => {
      const bookingStart = new Date(booking.startTime);
      const bookingEnd = new Date(booking.endTime);
      const bufferEnd = new Date(bookingEnd.getTime() + 30 * 60 * 1000); // 30 min buffer time
  
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
  
        // Check for overlapping time slots across all rooms in the building
        if (timeOptionDate >= bookingStart && timeOptionDate < bufferEnd) {
          unavailable.push({
            time: timeOption,
            reason: `Booking: ${formatTimeToOption(bookingStart)} - ${formatTimeToOption(bookingEnd)} (Already booked)`
          });
        }
      });
    });
  
    setUnavailableTimeSlots(unavailable);
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
        // 🛠️ Fix: skip current booking while editing
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
  
  const sortedBookings = useMemo(() => {
    const bookingsToSort = currentBookings;  // Sort only the current page's bookings
  
    const { key, direction } = sortConfig;
  
    if (!key) return bookingsToSort;  // If no sort key, return the current bookings
  
    return bookingsToSort.sort((a, b) => {
      const valA = a[key];
      const valB = b[key];
  
      const aVal = typeof valA === 'string' || valA instanceof Date ? String(valA) : valA;
      const bVal = typeof valB === 'string' || valB instanceof Date ? String(valB) : valB;
  
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [currentBookings, sortConfig]);  


  return (
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh'}}>
      <TopBar onSearch={setSearchTerm} />
      <div className="p-4 bg-gray-100 w-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Bookings</h2>
          <div className="flex gap-2">
            <ExportCSV bookings={bookings} />
            <button
              onClick={handleAddNewClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + Add New Booking
            </button>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            {['All', 'Pending', 'Confirmed', 'Declined'].map((status) => (
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
                        
                        {/* Display admin name who changed the status */}
                        {booking.bookedBy && (
                          <div className="mt-1 text-xs">
                            <span className="text-gray-500">
                              changed by {booking.bookedBy}
                            </span>
                          </div>
                        )}
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

      {/* Status Modal */}
      <StatusModal
        isOpen={isStatusModalOpen}
        currentStatus={selectedStatus}
        adminName={adminName} // Pass the admin name here
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={async () => {
          try {
            // Log the payload to verify what's being sent
            const payload = { 
              status: selectedStatus,
              bookedBy: adminName || 'Admin User'  // Ensure default if somehow missing
            };
            console.log('Updating booking status with payload:', payload);
            
            await axios.put(
              `${API_BASE_URL}/bookings/${selectedBookingId}`,
              payload,
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