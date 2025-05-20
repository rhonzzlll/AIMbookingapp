import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import TopBar from '../../components/AdminComponents/TopBar';
import DeleteConfirmation from './modals/DeleteConfirmation';
import StatusModal from './modals/StatusModal';
import ExcelEventBulletinExporter from '../../components/AdminComponents/ExportCSV';



const formatDate = (date) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

const parseISODate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};

// Convert from 12-hour format (e.g. "8:00 AM") to 24-hour format (e.g. "08:00:00")
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

// Initial form state
const initialFormState = {
  title: '',
  firstName: '',
  lastName: '',
  userId: null,
  categoryId: '',
  roomId: null,
  buildingId: '',
  date: new Date().toISOString().split('T')[0],  
  startTime: null,
  endTime: null,
  notes: '',
  isRecurring: false,
  recurrenceEndDate: '',
  status: 'pending',
  bookingCapacity: 1,
  isMealRoom: false,
  isBreakRoom: false,
  remarks: '',
  bookingId: null,
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
  const [categories, setCategories] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [buildingCategories, setBuildingCategories] = useState({});
  
  // Get token from localStorage
  const token = localStorage.getItem('token');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

  // Add these missing state declarations
  const [formData, setFormData] = useState({...initialFormState});
  const [formError, setFormError] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      
      try {
        console.log("Fetching rooms data for setup...");
        
        // First fetch all rooms to extract building and category information
        const roomsResponse = await axios.get(`${API_BASE_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Store rooms data
        const roomsData = roomsResponse.data;
        console.log("Rooms data:", roomsData);
        setRooms(roomsData);
        
        // Process buildings data consistently
        const buildingsMap = {};
        roomsData.forEach(room => {
          if (room.buildingId) {
            const buildingId = room.buildingId.toString();
            const buildingName = room.Building?.buildingName || room.building || `Building ${buildingId}`;
            
            if (!buildingsMap[buildingId]) {
              buildingsMap[buildingId] = {
                id: buildingId,
                name: buildingName
              };
            }
          }
        });
        
        // Convert to array for the dropdown
        const buildingsList = Object.values(buildingsMap);
        console.log("Extracted buildings:", buildingsList);
        setBuildings(buildingsList);
        
        // Next, fetch bookings
        const bookingsResponse = await axios.get(`${API_BASE_URL}/bookings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Map booking data with room and building information
        const bookingsData = await Promise.all(
          bookingsResponse.data.map(async (booking) => {
            // Find room info for this booking
            const room = roomsData.find(r => r.roomId === booking.roomId) || {};
            
            // Get user info if needed
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
              roomName: room.roomName || 'Unknown Room',
              building: room.Building?.buildingName || room.building || 'Unknown Building',
              buildingId: room.buildingId || '',
              category: room.Category?.categoryName || room.category || 'Unknown Category',
              categoryId: room.categoryId || '',
              firstName: userData.firstName || booking.firstName || '',
              lastName: userData.lastName || booking.lastName || '',
              department: userData.department || booking.department || '',
              email: userData.email || '',
              startTime: booking.startTime ? convertTo24HourFormat(booking.startTime) : '',
              endTime: booking.endTime ? convertTo24HourFormat(booking.endTime) : '',
              recurring: booking.isRecurring ? 'Yes' : 'No'
            };
          })
        );
        
        setBookings(bookingsData);
        
        // Also fetch users for dropdown
        const usersResponse = await axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setUsers(usersResponse.data);
        
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, [token]);

  // Add this function to your component

  const fetchBookings = async () => {
    try {
      setLoading(true);
      
      // Fetch rooms first to have room data available
      const roomsResponse = await axios.get(`${API_BASE_URL}/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const roomsData = roomsResponse.data;
      setRooms(roomsData);
      
      // Then fetch bookings
      const bookingsResponse = await axios.get(`${API_BASE_URL}/bookings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Map booking data with room information
      const bookingsData = await Promise.all(
        bookingsResponse.data.map(async (booking) => {
          const room = roomsData.find(r => r.roomId === booking.roomId) || {};
          
          // Get user info if needed
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
            roomName: room.roomName || 'Unknown Room',
            building: room.Building?.buildingName || room.building || 'Unknown Building',
            buildingId: room.buildingId || '',
            category: room.Category?.categoryName || room.category || 'Unknown Category',
            categoryId: room.categoryId || '',
            firstName: userData.firstName || booking.firstName || '',
            lastName: userData.lastName || booking.lastName || '',
            department: userData.department || booking.department || '',
            email: userData.email || '',
              startTime: booking.startTime ? convertTo24HourFormat(booking.startTime) : '',
              endTime: booking.endTime ? convertTo24HourFormat(booking.endTime) : '',
            recurring: booking.isRecurring ? 'Yes' : 'No'
          };
        })
      );
      
      setBookings(bookingsData);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
    console.log('Editing booking:', booking);
    
    // First set basic booking form data
    setFormData({
      ...booking,
      date: parseISODate(booking.date),
      startTime: booking.startTime || convertTo24HourFormat(booking.startTime),
      endTime: booking.endTime || convertTo24HourFormat(booking.endTime),
      isRecurring: booking.isRecurring || booking.recurring === 'Yes',
      recurring: booking.isRecurring ? 'Yes' : 'No',
      recurrenceEndDate: booking.recurrenceEndDate ? parseISODate(booking.recurrenceEndDate) : '',
      isMealRoom: booking.isMealRoom || false,
      isBreakRoom: booking.isBreakRoom || false,
    });
    
    setEditBookingId(booking.bookingId);
    
    // Get the building ID from the booking
    const buildingId = booking.buildingId || '';
    
    if (buildingId && rooms.length > 0) {
      // Find rooms in this building
      const roomsInBuilding = rooms.filter(room => 
        room.buildingId && room.buildingId.toString() === buildingId.toString()
      );
      
      // Extract unique categories
      const categoriesMap = {};
      roomsInBuilding.forEach(room => {
        if (room.categoryId) {
          const categoryId = room.categoryId.toString();
          const categoryName = room.Category?.categoryName || room.category || `Category ${categoryId}`;
          
          if (!categoriesMap[categoryId]) {
            categoriesMap[categoryId] = {
              id: categoryId,
              name: categoryName
            };
          }
        }
      });
      
      const categoriesList = Object.values(categoriesMap);
      console.log("Setting categories for building:", categoriesList);
      setCategories(categoriesList);
      
      // Get category ID from the booking
      const categoryId = booking.categoryId || '';
      
      if (categoryId) {
        // Find rooms in this building AND category
        const filteredRooms = rooms.filter(room => 
          room.buildingId && 
          room.buildingId.toString() === buildingId.toString() &&
          room.categoryId && 
          room.categoryId.toString() === categoryId.toString()
        );
        
        console.log("Setting available rooms:", filteredRooms);
        setAvailableRooms(filteredRooms);
      }
    }
    
    setIsEditModalOpen(true);
  };
  
  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
    
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
    
// Proper building change handler
const handleBuildingChange = (e) => {
  console.log("Building selected:", e.target.value);
  const selectedBuildingId = e.target.value;
  
  // Reset dependent selections
  setFormData(prev => ({
    ...prev,
    buildingId: selectedBuildingId,
    building: selectedBuildingId,
    categoryId: '',
    category: '',
    roomId: null,
    roomName: ''
  }));
  
  // Clear any errors
  setFormError(prev => ({ ...prev, building: '', category: '', room: '' }));
  
  // Filter categories for this building
  if (selectedBuildingId && rooms.length > 0) {
    const roomsInBuilding = rooms.filter(room => 
      room.buildingId && room.buildingId.toString() === selectedBuildingId
    );
    
    // Extract unique categories
    const categoriesMap = {};
    roomsInBuilding.forEach(room => {
      if (room.categoryId) {
        const categoryId = room.categoryId.toString();
        const categoryName = room.Category?.categoryName || room.category || `Category ${categoryId}`;
        
        if (!categoriesMap[categoryId]) {
          categoriesMap[categoryId] = {
            id: categoryId,
            name: categoryName
          };
        }
      }
    });
    
    const categoriesList = Object.values(categoriesMap);
    console.log("Categories for this building:", categoriesList);
    setCategories(categoriesList);
  } else {
    // Reset categories if no building selected
    setCategories([]);
  }
  
  // Always reset available rooms when building changes
  setAvailableRooms([]);
};

// Proper category change handler
const handleCategoryChange = (e) => {
  console.log("Category selected:", e.target.value);
  const selectedCategoryId = e.target.value;
  
  // Update category in form data
  setFormData(prev => ({
    ...prev,
    categoryId: selectedCategoryId,
    category: selectedCategoryId,
    roomId: null,
    roomName: ''
  }));
  
  // Clear category-related errors
  setFormError(prev => ({ ...prev, category: '', room: '' }));
  
  // Filter rooms by building AND category
  if (formData.buildingId && selectedCategoryId && rooms.length > 0) {
    console.log("Filtering rooms by building", formData.buildingId, "and category", selectedCategoryId);
    
    const filteredRooms = rooms.filter(room => 
      room.buildingId && 
      room.buildingId.toString() === formData.buildingId.toString() &&
      room.categoryId &&
      room.categoryId.toString() === selectedCategoryId.toString()
    );
    
    console.log("Available rooms:", filteredRooms);
    setAvailableRooms(filteredRooms);
  } else {
    setAvailableRooms([]);
  }
};

// Proper room selection handler
const handleRoomChange = (e) => {
  console.log("Room selected:", e.target.value);
  const selectedRoomId = e.target.value;
  
  // Find full room data for the selected room
  const selectedRoom = rooms.find(room => 
    room.roomId && room.roomId.toString() === selectedRoomId
  );
  
  console.log("Found room data:", selectedRoom);
  
  if (selectedRoom) {
    setFormData(prev => ({
      ...prev,
      roomId: selectedRoomId,
      roomName: selectedRoom.roomName || '',
      bookingCapacity: selectedRoom.capacity || 1
    }));
    setFormError(prev => ({ ...prev, room: '' }));
  }
};

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
    // This function now only triggers when a user is selected from a dropdown
    setFormData(prev => ({
      ...prev,
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department || ''
    }));
  };

  // You might also want to add a function to clear user ID when manually typing names
const handleNameChange = (e) => {
  const { name, value } = e.target;

  setFormData((prev) => ({
    ...prev,
    [name]: value,       // Update the specific field (firstName or lastName)
    // Clear userId if user is editing firstName or lastName manually
    userId: (name === 'firstName' || name === 'lastName') ? null : prev.userId,
  }));
};

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs differently
  if (type === 'checkbox') {
    setFormData(prev => ({ ...prev, [name]: checked }));
  } else if (name === 'bookingCapacity') {
    const capacityValue = parseInt(value, 10) || 1;
    setFormData(prev => ({
      ...prev,
      bookingCapacity: capacityValue
    }));
  } else {
    setFormData(prev => ({ ...prev, [name]: value }));
  }
    
    // Special handling for certain fields
    if (name === 'recurring') {
      setFormData(prev => ({
        ...prev,
        isRecurring: value !== 'No',
        recurring: value
      }));
    }

    // Handle bookingCapacity as integer
    if (name === 'bookingCapacity') {
      const capacityValue = parseInt(value, 10) || 1; // Default to 1 if parsing fails
      setFormData(prev => ({
        ...prev,
        bookingCapacity: capacityValue
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    setFormError({});

    const loggedInUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
    if (!loggedInUserId) {
      setError('User not authenticated. Please log in again.');
      setSubmitLoading(false);
      return;
    }

    let hasError = false;
    const errors = {};

    // Enhanced validation
    if (!formData.firstName || !formData.lastName) {
      errors.name = 'First name and last name are required';
      hasError = true;
    }

    if (!formData.startTime || !formData.endTime) {
      errors.time = 'Start and end times are required';
      hasError = true;
    }

    // Validate bookingCapacity/pax
    if (formData.bookingCapacity < 1) {
      errors.bookingCapacity = 'Pax must be at least 1';
      hasError = true;
    }

    if (!formData.roomId) {
      errors.room = 'Room selection is required';
      hasError = true;
    }

    if (!formData.buildingId) {
      errors.building = 'Building is required';
      hasError = true;
    }

    if (formData.isRecurring && !formData.recurrenceEndDate) {
      errors.recurrence = 'Recurrence end date is required for recurring bookings';
      hasError = true;
    }

    if (hasError) {
      setFormError(errors);
      setSubmitLoading(false);
      return;
    }

    try {
      // Convert times to 24-hour format expected by the API
      const startTime24 = convertTo24HourFormat(formData.startTime);
      const endTime24 = convertTo24HourFormat(formData.endTime);
      
      // Create a timestamp for when the form is submitted
      const now = new Date();
      const timeSubmitted = now.toISOString();
      
      // Validate the timeSubmitted value before adding it to payload
      console.log('Generated timeSubmitted:', timeSubmitted);
      
      // Ensure correct data types for IDs (convert to numbers if the API expects numbers)
      const roomId = formData.roomId; // Keep as string for nvarchar field
      const buildingId = formData.buildingId; // Keep as string for nvarchar field
      const categoryId = Number(formData.categoryId); // Convert to number as expected by DB schema
      
      // Make sure date is in ISO format
      const bookingDate = new Date(formData.date).toISOString().split('T')[0];
      let recurrenceEndDate = null;
      if (formData.isRecurring && formData.recurrenceEndDate) {
        recurrenceEndDate = new Date(formData.recurrenceEndDate).toISOString().split('T')[0];
      }
      
      // Create a payload with properly formatted date/time values and correct types
      const payload = {
        roomId: roomId,
        userId: loggedInUserId ? Number(loggedInUserId) : (formData.userId ? Number(formData.userId) : Number(2)),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        department: formData.department || '',
        title: formData.title.trim(),
        buildingId: buildingId,
        categoryId: categoryId,
        bookingCapacity: Number(formData.bookingCapacity) || 1,
        date: bookingDate,
        startTime: startTime24,
        endTime: endTime24,
        notes: formData.notes || '',
        isRecurring: Boolean(formData.isRecurring),
        isMealRoom: Boolean(formData.isMealRoom),
        isBreakRoom: Boolean(formData.isBreakRoom),
        recurrenceEndDate: recurrenceEndDate,
        status: (formData.status || 'pending').toLowerCase(),
        timeSubmitted: timeSubmitted,
        remarks: formData.remarks || '',
        changedBy: formData.changedBy || 'System'
      };

      // Get the details of the logged-in user who is making this booking
      const adminResponse = await axios.get(`${API_BASE_URL}/users/${loggedInUserId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const adminData = adminResponse.data;
      const changedByName = `${adminData.firstName} ${adminData.lastName}`;

      // Add additional fields to payload
      payload.changedBy = changedByName;

      console.log('Sending payload to server:', payload);

      let response;

      // Handle different API calls for create vs update
      if (isEditModalOpen && editBookingId) {
        payload.bookingId = Number(editBookingId) || editBookingId;
        response = await axios.put(
          `${API_BASE_URL}/bookings/${editBookingId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Update response:', response.data);
      } else {
        response = await axios.post(
          `${API_BASE_URL}/bookings`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        console.log('Create response:', response.data);
      }

      // Success - reset form and close modal
      resetForm();
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      fetchBookings();
    } catch (err) {
      console.error('Booking error:', err);
      
      // More detailed error handling
      if (err.response) {
        console.error('Error status:', err.response.status);
        console.error('Error data:', err.response.data);
        
        if (err.response.data?.message) {
          setError(err.response.data.message);
        } else if (err.response.data?.error) {
          setError(err.response.data.error);
        } else {
          setError(`Server error (${err.response.status}). Please try again.`);
        }
      } else if (err.request) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to save booking. Please try again.');
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // Add this missing resetForm function that will properly reset all fields

  const resetForm = () => {
    setFormData({...initialFormState});
    setFormError({});
    setCategories([]);
    setAvailableRooms([]);
    setEditBookingId(null);
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
    if (!formData.room || !formData.date) return false;
  
    const selectedRoom = rooms.find(r => r._id === formData.room);
    const selectedBuilding = selectedRoom?.building;
  
    if (!selectedBuilding) return false;
  
    const [hourStr, minuteStr] = timeStr.split(' ')[0].split(':');
    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);
    const modifier = timeStr.split(' ')[1];
  
    if (modifier === 'PM' && hours !== 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;
  
    const checkTime = new Date(`${formData.date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  
    // Check for conflicts across all rooms in the same building
    return bookings.some((booking) => {
      if (isEditModalOpen && editBookingId && booking._id === editBookingId) return false;  // Skip the current booking when editing
  
      const bookingDate = new Date(booking.date).toISOString().split('T')[0];
      const selectedDate = new Date(formData.date).toISOString().split('T')[0];
  
      if (
        booking.building === selectedBuilding && 
        bookingDate === selectedDate && 
        booking.status === 'confirmed'
      ) {
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(booking.endTime);
  
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
    const startTime = formData.startTime;
    if (!startTime) return TIME_OPTIONS;
  
    const startMinutes = getTimeInMinutes(startTime);  // Ensure start time is in minutes
  
    // Existing logic to filter based on start time
    const filteredEndTimes = TIME_OPTIONS.filter((time) => getTimeInMinutes(time) > startMinutes);
  
    // If today is selected, ensure that only times after the current time are available
    const now = new Date();
    const selectedDate = new Date(formData.date);
    const isToday = now.toDateString() === selectedDate.toDateString();
    
    if (isToday) {
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinutes;
      
      return filteredEndTimes.filter(time => {
        const timeInMinutes = getTimeInMinutes(time);
        return timeInMinutes > currentTotalMinutes;  // Ensuring only times after current time
      });
    }
  
    return filteredEndTimes;
  };
  
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status || 'pending'}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
            <select
              name="buildingId"
              value={formData.buildingId || ''}
              onChange={handleBuildingChange}
              required
              className={`w-full p-2 border ${formError.building ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            >
              <option value="">Select Building</option>
              {buildings.map(building => (
                <option key={building.id} value={building.id}>
                  {building.name}
                </option>
              ))}
            </select>
            {formError.building && <p className="text-red-500 text-xs mt-1">{formError.building}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="categoryId"
              value={formData.categoryId || ''}
              onChange={handleCategoryChange}
              required
              disabled={!formData.buildingId}
              className={`w-full p-2 border ${formError.category ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500 ${!formData.buildingId ? 'bg-gray-100' : 'bg-white'}`}
            >
              <option value="">Select Category</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {formError.category && <p className="text-red-500 text-xs mt-1">{formError.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select
              name="roomId"
              value={formData.roomId || ''}
              onChange={handleRoomChange}
              required
              disabled={!formData.categoryId}
              className={`w-full p-2 border ${formError.room ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500 ${!formData.categoryId ? 'bg-gray-100' : 'bg-white'}`}
            >
              <option value="">Select Room</option>
              {availableRooms.map(room => (
                <option key={room.roomId} value={room.roomId}>
                  {room.roomName} {room.capacity ? `(Capacity: ${room.capacity})` : ''}
                </option>
              ))}
            </select>
            {formError.room && <p className="text-red-500 text-xs mt-1">{formError.room}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pax</label>
            <input
              type="number"
              name="bookingCapacity"
              value={formData.bookingCapacity || 1}
              onBlur={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))} // Update state on blur
              min="1"
              required
              className={`w-full p-2 border ${formError.bookingCapacity ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            />
            {formError.bookingCapacity && <p className="text-red-500 text-xs mt-1">{formError.bookingCapacity}</p>}
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
              {TIME_OPTIONS.map((time) => (
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
        </div>

        <div className="space-y-4 mt-4">
          {/* Other Request Text */}
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700">Other Request</label>
          </div>

          {/* Checkboxes Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-center">
            {/* Is this a recurring booking */}
            <div className="flex justify-center items-center">
              <input
                type="checkbox"
                id="isRecurring"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    isRecurring: e.target.checked,
                    recurring: e.target.checked ? 'Daily' : 'No',
                    recurrenceEndDate: e.target.checked ? prev.recurrenceEndDate || formData.date : ''
                  }))
                }}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-700">
                Is this a recurring booking?
              </label>
            </div>

            {/* Meal Room */}
            <div className="flex justify-center items-center">
              <input
                type="checkbox"
                id="isMealRoom"
                name="isMealRoom"
                checked={formData.isMealRoom}
                onChange={(e) => setFormData((prev) => ({ ...prev, isMealRoom: e.target.checked }))}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isMealRoom" className="ml-2 block text-sm text-gray-700">
                Meal Room
              </label>
            </div>
          </div>

          {/* Break Room checkbox */}
          <div className="flex justify-center items-center mt-4">
            <input
              type="checkbox"
              id="isBreakRoom"
              name="isBreakRoom"
              checked={formData.isBreakRoom}
              onChange={(e) => setFormData((prev) => ({ ...prev, isBreakRoom: e.target.checked }))}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isBreakRoom" className="ml-2 block text-sm text-gray-700">
              Break Room
            </label>
          </div>

          {/* Conditional fields that appear when recurring is checked */}
          {formData.isRecurring && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 border-t border-gray-200 pt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence Pattern</label>
                <select
                  name="recurring"
                  value={formData.recurring || "Daily"}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recurrence End Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="recurrenceEndDate"
                  value={formData.recurrenceEndDate || ""}
                  onChange={handleInputChange}
                  required={formData.isRecurring}
                  min={formData.date} // Can't end before it starts
                  className={`w-full p-2 border ${formError.recurrence ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
                />
                {formError.recurrence && <p className="text-red-500 text-xs mt-1">{formError.recurrence}</p>}
              </div>
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

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Additional Remarks</label>
          <textarea
            name="remarks"
            defaultValue={formData.remarks}
            onBlur={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
            rows="2"
            placeholder="Add any additional remarks here"
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
const Modal = React.memo(({ isOpen, title, children, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        
        {/* Close (X) Button */}
        <button
            onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              resetForm();
            }}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 text-xl font-bold"
          aria-label="Close modal"
        >
          ×
        </button>

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
 
  const handleStatusChange = (bookingId, status) => {
    setSelectedBookingId(bookingId);
    setSelectedStatus(status);
    setIsStatusModalOpen(true);
  };
  return (
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh'}}>
      <TopBar onSearch={setSearchTerm} />
      <div className="p-4 bg-gray-100 w-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Bookings</h2>
          <div className="flex gap-2">
            <button
              onClick={handleAddNewClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              + Add New Booking
            </button>
            <ExcelEventBulletinExporter bookings={bookings} />
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
                        {/* Only show "Changed by" if status is confirmed/declined and changedBy exists */}
                        {['confirmed', 'declined'].includes(booking.status) && booking.changedBy && (
                          <small className="block text-gray-500 mt-1">
                            Changed by: {booking.changedBy}
                          </small>
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
                          onClick={() => handleStatusChange(booking.bookingId, 'confirmed')} // Ensure booking.bookingId is used
                        >
                          Confirm
                        </button>
                        <button
                          className="text-red-600 hover:underline"
                          onClick={() => handleStatusChange(booking.bookingId, 'declined')} // Ensure booking.bookingId is used
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
            setSubmitLoading(true); // Show loading state

            // Validate selectedBookingId
            if (!selectedBookingId) {
              console.error("Error: selectedBookingId is undefined.");
              setError("Failed to update booking. Booking ID is missing.");
              setSubmitLoading(false);
              return;
            }

            console.log("Updating booking with ID:", selectedBookingId);

            // Fetch the full booking object first
            const bookingRes = await axios.get(
              `${API_BASE_URL}/bookings/${selectedBookingId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!bookingRes.data) {
              throw new Error("Could not fetch booking details");
            }

            const booking = bookingRes.data;
            console.log("Original booking data:", booking);

            // Get current user's ID and fetch details
            const userId = localStorage.getItem('userId');
            let changedBy = 'Unknown User';

            if (userId) {
              try {
                const userResponse = await axios.get(`${API_BASE_URL}/users/${userId}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });

                if (userResponse.data) {
                  changedBy = `${userResponse.data.firstName} ${userResponse.data.lastName}`;
                }
              } catch (error) {
                console.error('Error fetching user details:', error);
                // Continue with default name
              }
            }

            // Create a simplified update payload - only send necessary fields
            const updatePayload = {
              status: selectedStatus.toLowerCase(),
              changedBy: changedBy,
              bookingId: booking.bookingId || booking._id,
            };

            console.log("Sending update payload:", updatePayload);

            // Make the update request
            const updateResponse = await axios.put(
              `${API_BASE_URL}/bookings/${selectedBookingId}`,
              updatePayload,
              { headers: { Authorization: `Bearer ${token}` } }
            );

            console.log("Update response:", updateResponse.data);

            // Success - refresh bookings and close modal
            await fetchBookings();
            setIsStatusModalOpen(false);
          } catch (err) {
            console.error('Error updating status:', err);

            // Better error handling
            if (err.response) {
              setError(`Failed to update booking: ${err.response.data?.message || err.response.status}`);
            } else if (err.request) {
              setError('Network error. Please check your connection.');
            } else {
              setError('Failed to update booking status. Please try again.');
            }
          } finally {
            setSubmitLoading(false);
          }
        }}
      />

    </div>
  );
};

export default Bookings;