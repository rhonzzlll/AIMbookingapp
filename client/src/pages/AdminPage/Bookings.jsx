import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import TopBar from '../../components/AdminComponents/TopBar';
import DeleteConfirmation from './modals/DeleteConfirmation';
import StatusModal from './modals/StatusModal';
import ExcelEventBulletinExporter from '../../components/AdminComponents/ExportCSV';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { v4 as uuidv4 } from 'uuid';



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
  // Always return with seconds for SQL Server
  return `${hours}:${minutes}:00`;
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

function TablePaginationActions(props) {
  const theme = useTheme();
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton onClick={handleFirstPageButtonClick} disabled={page === 0} aria-label="first page">
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton onClick={handleBackButtonClick} disabled={page === 0} aria-label="previous page">
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </Box>
  );
}

// Add this helper function before your Bookings component:
const groupRecurringBookings = (bookings) => {
  const seen = new Set();
  return bookings.filter(booking => {
    if (booking.isRecurring && booking.recurringGroupId) {
      if (seen.has(booking.recurringGroupId)) return false;
      seen.add(booking.recurringGroupId);
      return true;
    }
    // Non-recurring bookings are always included
    return true;
  });
};

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

  // Add these states near your other useState hooks
  const [availabilityStatus, setAvailabilityStatus] = useState({ available: true, message: '' });
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

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
    let filtered = bookings;
    if (activeBookingTab !== 'all') {
      filtered = bookings.filter(booking => {
        if (activeBookingTab === 'pending') return booking.status === 'pending';
        if (activeBookingTab === 'confirmed') return booking.status === 'confirmed';
        if (activeBookingTab === 'declined') return booking.status === 'declined';
        if (activeBookingTab === 'cancelled') return booking.status === 'cancelled';
        return true;
      });
    }
    // Group recurring bookings so only one row per recurrence series is shown
    return groupRecurringBookings(filtered);
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

  // Add this function to your component (outside BookingForm, but inside Bookings)
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

      // Ensure the time format is correct (HH:MM:SS)
      const formattedStartTime = startTime24.includes(':') && startTime24.split(':').length === 2
        ? `${startTime24}:00`
        : startTime24;

      const formattedEndTime = endTime24.includes(':') && endTime24.split(':').length === 2
        ? `${endTime24}:00`
        : endTime24;

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
          bookingId: isEditModalOpen && editBookingId ? editBookingId : undefined // allow editing current booking
        })
      });

      if (!response.ok) {
        throw new Error(`Error checking availability: ${response.statusText}`);
      }

      const responseData = await response.json();
      setAvailabilityStatus(responseData);
    } catch (err) {
      setAvailabilityStatus({
        available: false,
        message: err.message || 'Error checking availability. Please try again.',
      });
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Add this useEffect to trigger the check when relevant fields change
  useEffect(() => {
    if (
      formData.date &&
      formData.startTime &&
      formData.endTime &&
      formData.roomId &&
      formData.categoryId
    ) {
      checkTimeAvailability(formData);
    } else {
      setAvailabilityStatus({ available: true, message: '' });
    }
    // eslint-disable-next-line
  }, [formData.date, formData.startTime, formData.endTime, formData.roomId, formData.categoryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError('');
    setFormError({});

    // Prevent submit if slot is unavailable
    if (!availabilityStatus.available) {
      setError(availabilityStatus.message || 'Selected time slot is unavailable.');
      setSubmitLoading(false);
      return;
    }

    const loggedInUserId = localStorage.getItem('userId') || sessionStorage.getItem('userId');
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
    }
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
      // Convert times to 24-hour format
      const startTimeSQL = convertTo24HourFormat(formData.startTime);
      const endTimeSQL = convertTo24HourFormat(formData.endTime);

      // Use date as 'yyyy-MM-dd' string directly
      const bookingDate = formData.date;

      // Use null for empty recurrenceEndDate and notes
      const recurrenceEndDate = formData.isRecurring && formData.recurrenceEndDate
        ? formData.recurrenceEndDate
        : null;

      // Build payload
      let recurringGroupId = formData.recurringGroupId;
      if (formData.isRecurring && !recurringGroupId) {
        recurringGroupId = uuidv4();
      }

      const payload = {
        userId: loggedInUserId ? Number(loggedInUserId) : (formData.userId ? Number(formData.userId) : 2),
        title: formData.title,
        firstName: formData.firstName,
        lastName: formData.lastName,
        buildingId: formData.buildingId,
        categoryId: formData.categoryId,
        roomId: formData.roomId,
        date: bookingDate,
        startTime: startTimeSQL,
        endTime: endTimeSQL,
        department: formData.department,
        isRecurring: Boolean(formData.isRecurring),
        recurrencePattern: formData.recurring || "Daily", // <-- Fix: send as recurrencePattern
        recurrenceEndDate: recurrenceEndDate,            // <-- Fix: send as recurrenceEndDate
        notes: formData.notes === '' ? null : formData.notes,
        isMealRoom: Boolean(formData.isMealRoom),
        isBreakRoom: Boolean(formData.isBreakRoom),
        bookingCapacity: Number(formData.bookingCapacity) || 1,
        status: (formData.status || 'pending').toLowerCase(),
        recurringGroupId: formData.isRecurring ? recurringGroupId : null,
      };

      // Only add bookingId for edit
      if (isEditModalOpen && editBookingId) {
        payload.bookingId = Number(editBookingId) || editBookingId;
      }

      console.log('Booking Payload:', payload);

      let response;
      if (isEditModalOpen && editBookingId) {
        // Remove bookingId from payload if present
        const { bookingId, ...payloadWithoutId } = payload;
        response = await fetch(
          `${API_BASE_URL}/bookings/${editBookingId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payloadWithoutId),
          }
        );
      } else {
        // Use fetch for POST
        response = await fetch(
          `${API_BASE_URL}/bookings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          }
        );
      }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save booking.');
    }

    const data = await response.json();

    // Success - reset form and close modal
    resetForm();
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    fetchBookings();
  } catch (err) {
    setError(err.message || 'Failed to save booking. Please try again.');
  } finally {
    setSubmitLoading(false);
  }
};

  // Add this missing resetForm function that will properly reset all fields

  const resetForm = () => {
    setFormData({...initialFormState, recurringGroupId: null});
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
  
   
const BookingForm = React.memo(({ isEdit }) => (
  <form onSubmit={handleSubmit} className="space-y-6">
    {/* Error messages */}
    {error && (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-2" role="alert">
        <span>{error}</span>
      </div>
    )}
    {formError.name && (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-2" role="alert">
        <span>{formError.name}</span>
      </div>
    )}

    {/* Availability status */}
    {isCheckingAvailability && (
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-2 rounded mb-2" role="alert">
        Checking availability...
      </div>
    )}
    {!isCheckingAvailability && availabilityStatus.message && (
      <div
        className={`px-4 py-2 rounded mb-2 border ${
          availabilityStatus.available
            ? 'bg-green-100 border-green-400 text-green-700'
            : 'bg-red-100 border-red-400 text-red-700'
        }`}
        role="alert"
      >
        {availabilityStatus.message}
      </div>
    )}

    {/* Form fields in two columns */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Booking Title</label>
        <input
          type="text"
          name="title"
          value={formData.title || ''}
          onChange={handleInputChange}
          required
          placeholder="Enter booking title"
          autoComplete="off"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">First Name</label>
        <input
          type="text"
          name="firstName"
          value={formData.firstName || ''}
          onChange={handleInputChange}
          required
          placeholder="Enter first name"
          autoComplete="off"
          className={`w-full p-2 border ${formError.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-400`}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name</label>
        <input
          type="text"
          name="lastName"
          value={formData.lastName || ''}
          onChange={handleInputChange}
          required
          placeholder="Enter last name"
          autoComplete="off"
          className={`w-full p-2 border ${formError.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-400`}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Department</label>
        <select
          name="department"
          value={formData.department}
          onChange={handleInputChange}
          required
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
        >
          <option value="">Select Department</option>
          {DEPARTMENTS.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
        <select
          name="status"
          value={formData.status || 'pending'}
          onChange={handleInputChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
        >
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="declined">Declined</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Building</label>
        <select
          name="buildingId"
          value={formData.buildingId || ''}
          onChange={handleBuildingChange}
          required
          className={`w-full p-2 border ${formError.building ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-400`}
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
        <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
        <select
          name="categoryId"
          value={formData.categoryId || ''}
          onChange={handleCategoryChange}
          required
          disabled={!formData.buildingId}
          className={`w-full p-2 border ${formError.category ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-400 ${!formData.buildingId ? 'bg-gray-100' : 'bg-white'}`}
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
        <label className="block text-sm font-semibold text-gray-700 mb-1">Room</label>
        <select
          name="roomId"
          value={formData.roomId || ''}
          onChange={handleRoomChange}
          required
          disabled={!formData.categoryId}
          className={`w-full p-2 border ${formError.room ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-400 ${!formData.categoryId ? 'bg-gray-100' : 'bg-white'}`}
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
        <label className="block text-sm font-semibold text-gray-700 mb-1">Pax</label>
        <input
          type="number"
          name="bookingCapacity"
          value={formData.bookingCapacity || 1}
          onChange={handleInputChange}
          min="1"
          required
          className={`w-full p-2 border ${formError.bookingCapacity ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-400`}
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Date</label>
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleInputChange}
          required
          min={new Date().toISOString().split('T')[0]}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Start Time</label>
        <select
          value={formData.startTime || ''}
          onChange={(e) => handleTimeChange('startTime', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 bg-white"
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
        <label className="block text-sm font-semibold text-gray-700 mb-1">End Time</label>
        <select
          value={formData.endTime || ''}
          onChange={(e) => handleTimeChange('endTime', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 bg-white"
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

    {/* Divider */}
    <div className="border-t pt-4 mt-2">
      <div className="flex flex-wrap gap-6">
        <div className="flex items-center">
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
          <label htmlFor="isRecurring" className="ml-2 text-sm text-gray-700">
            Recurring Booking
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isMealRoom"
            name="isMealRoom"
            checked={formData.isMealRoom}
            onChange={(e) => setFormData((prev) => ({ ...prev, isMealRoom: e.target.checked }))}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isMealRoom" className="ml-2 text-sm text-gray-700">
            Meal Room
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isBreakRoom"
            name="isBreakRoom"
            checked={formData.isBreakRoom}
            onChange={(e) => setFormData((prev) => ({ ...prev, isBreakRoom: e.target.checked }))}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isBreakRoom" className="ml-2 text-sm text-gray-700">
            Break Room
          </label>
        </div>
      </div>
      {/* Recurring fields */}
      {formData.isRecurring && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Recurrence Pattern</label>
            <select
              name="recurring"
              value={formData.recurring || "Daily"}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Recurrence End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="recurrenceEndDate"
              value={formData.recurrenceEndDate || ""}
              onChange={handleInputChange}
              required={formData.isRecurring}
              min={formData.date}
              className={`w-full p-2 border ${formError.recurrence ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-2 focus:ring-blue-400`}
            />
            {formError.recurrence && <p className="text-red-500 text-xs mt-1">{formError.recurrence}</p>}
          </div>
        </div>
      )}
    </div>

    {/* Notes and Remarks */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          value={formData.notes || ''}
          onChange={handleInputChange}
          rows="3"
          placeholder="Add any additional notes here"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
        ></textarea>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Remarks</label>
        <textarea
          name="remarks"
          value={formData.remarks || ''}
          onChange={handleInputChange}
          rows="3"
          placeholder="Add any additional remarks here"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
        ></textarea>
      </div>
    </div>

    {/* Actions */}
    <div className="flex justify-end gap-3 pt-4">
      <button
        type="button"
        onClick={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          resetForm();
        }}
        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        disabled={submitLoading}
      >
        Cancel
      </button>
      <button
        type="submit"
        className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${
          submitLoading || !availabilityStatus.available ? 'opacity-75 cursor-not-allowed' : ''
        }`}
        disabled={submitLoading || !availabilityStatus.available}
      >
        {submitLoading ? 'Processing...' : isEdit ? 'Update Booking' : 'Create Booking'}
      </button>
    </div>
  </form>
));

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
            {['All', 'Pending', 'Confirmed', 'Declined', 'Cancelled'].map((status) => (
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
        <TableContainer component={Paper} sx={{ mt: 2 }}>
          <Table sx={{ minWidth: 1200 }} aria-label="bookings table">
            <TableHead>
              <TableRow>
                {[
                  { key: 'title', label: 'Booking Title' },
                  { key: 'firstName', label: 'First Name' },
                  { key: 'lastName', label: 'Last Name' },
                  { key: 'department', label: 'Department' },
                  { key: 'category', label: 'Category' },
                  { key: 'roomName', label: 'Room' },
                  { key: 'building', label: 'Building' },
                  { key: 'date', label: 'Date' },
                  { key: 'startTime', label: 'Time' },
                  { key: 'bookingCapacity', label: 'Capacity' },
                  { key: 'isMealRoom', label: 'Meal Room' },
                  { key: 'isBreakRoom', label: 'Break Room' },
                  { key: 'status', label: 'Status' },
                  { key: 'recurring', label: 'Recurring' },
                  { key: 'timeSubmitted', label: 'Time Submitted' },
                ].map(({ key, label }) => (
                  <TableCell
                    key={key}
                    onClick={() => handleSort(key)}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {label} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableCell>
                ))}
                  <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && currentBookings.length > 0 ? (
                sortedBookings
                  .filter(booking =>
                    `${booking.title} ${booking.firstName} ${booking.lastName} ${booking.department} ${booking.category} ${booking.roomName} ${booking.building}`
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((booking) => (
                    <TableRow key={booking._id || booking.id} hover>
                      <TableCell>{booking.title}</TableCell>
                      <TableCell>{booking.firstName}</TableCell>
                      <TableCell>{booking.lastName}</TableCell>
                      <TableCell>{booking.department}</TableCell>
                      <TableCell>{booking.category}</TableCell>
                      <TableCell>{booking.roomName}</TableCell>
                      <TableCell>{booking.building}</TableCell>
                      <TableCell>
                        {booking.recurring !== 'No' && booking.recurrenceEndDate ? (
                          <div>
                            {formatDate(booking.date)} - {formatDate(booking.recurrenceEndDate)} ({booking.recurring})
                          </div>
                        ) : (
                          <div>{formatDate(booking.date)}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                        {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>
                      <TableCell>{booking.bookingCapacity || '1'}</TableCell>
                      <TableCell>
                        <span style={{
                          background: booking.isMealRoom ? '#bbf7d0' : '#f3f4f6',
                          color: booking.isMealRoom ? '#16a34a' : '#374151',
                          borderRadius: 8,
                          padding: '2px 8px',
                          fontSize: 12,
                          display: 'inline-block'
                        }}>
                          {booking.isMealRoom ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span style={{
                          background: booking.isBreakRoom ? '#bbf7d0' : '#f3f4f6',
                          color: booking.isBreakRoom ? '#16a34a' : '#374151',
                          borderRadius: 8,
                          padding: '2px 8px',
                          fontSize: 12,
                          display: 'inline-block'
                        }}>
                          {booking.isBreakRoom ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span style={{
                          background: booking.status === 'confirmed'
                            ? '#bbf7d0'
                            : booking.status === 'pending'
                            ? '#fef9c3'
                            : '#fecaca',
                          color: booking.status === 'confirmed'
                            ? '#16a34a'
                            : booking.status === 'pending'
                            ? '#ca8a04'
                            : '#dc2626',
                          borderRadius: 8,
                          padding: '2px 8px',
                          fontSize: 12,
                          display: 'inline-block'
                        }}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                        {/* Show decline reason if declined */}
                        {booking.status === 'declined' && booking.declineReason && (
                          <small style={{ display: 'block', color: '#dc2626', marginTop: 2 }}>
                            Reason: {booking.declineReason}
                          </small>
                        )}
                        {['confirmed', 'declined'].includes(booking.status) && booking.changedBy && (
                          <small style={{ display: 'block', color: '#6b7280', marginTop: 2 }}>
                            Changed by: {booking.changedBy}
                          </small>
                        )}
                      </TableCell>
                      <TableCell>{booking.recurring}</TableCell>
                      <TableCell>
                        {booking.timeSubmitted
                          ? new Date(booking.timeSubmitted).toLocaleString()
                          : ''}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <button
                            style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => handleEditClick(booking)}
                          >
                            View
                          </button>
                          <button
                            style={{ color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => handleStatusChange(booking.bookingId, 'confirmed')}
                          >
                            Confirm
                          </button>
                          <button
                            style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                            onClick={() => handleStatusChange(booking.bookingId, 'declined')}
                          >
                            Decline
                          </button>
                          {booking.status !== 'cancelled' && (
                            <button
                              style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
                              onClick={() => handleStatusChange(booking.bookingId, 'cancelled')}
                            >
                              Cancel
                            </button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                !loading && (
                  <TableRow>
                    <TableCell colSpan={17} align="center">
                      No bookings found. Add a new booking to get started.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50]}
                  colSpan={17}
                  count={filteredBookings.length}
                  rowsPerPage={itemsPerPage}
                  page={currentPage - 1}
                  SelectProps={{
                    inputProps: { 'aria-label': 'rows per page' },
                    native: true,
                  }}
                  onPageChange={(_, newPage) => setCurrentPage(newPage + 1)}
                  onRowsPerPageChange={e => {
                    // You may want to add logic to update itemsPerPage state if you want to support changing rows per page
                  }}
                  ActionsComponent={TablePaginationActions}
                />
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </div>

      {/* Add Booking Modal */}
      <Modal isOpen={isAddModalOpen} title="Add New Booking" onClose={() => { setIsAddModalOpen(false); resetForm(); }}>
        <BookingForm isEdit={false} />
      </Modal>

      {/* Edit Booking Modal */}
      <Modal isOpen={isEditModalOpen} title="Edit Booking" onClose={() => { setIsEditModalOpen(false); resetForm(); }}>
        <BookingForm isEdit={true} />
      </Modal>

      {/* Status Modal */}
      <StatusModal
        isOpen={isStatusModalOpen}
        currentStatus={selectedStatus}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={async (declineReason) => {
          try {
            setSubmitLoading(true);

            // Fetch the full booking object first
            const bookingRes = await fetch(
              `${API_BASE_URL}/bookings/${selectedBookingId}`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            if (!bookingRes.ok) throw new Error("Could not fetch booking details");
            const booking = await bookingRes.json();

            // Get current user's name for changedBy
            const userId = localStorage.getItem('userId');
            let changedBy = 'Unknown User';
            if (userId) {
              try {
                const userResponse = await fetch(`${API_BASE_URL}/users/${userId}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                if (userResponse.ok) {
                  const userData = await userResponse.json();
                  changedBy = `${userData.firstName} ${userData.lastName}`;
                }
              } catch {}
            }

            // Find all bookings in the same recurring group
            let seriesBookings = [];
            if (booking.isRecurring && booking.recurringGroupId) {
              const groupRes = await fetch(
                `${API_BASE_URL}/recurring-bookings/${booking.recurringGroupId}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (groupRes.ok) {
                seriesBookings = await groupRes.json();
              } else {
                seriesBookings = bookings.filter(b =>
                  b.recurringGroupId && b.recurringGroupId === booking.recurringGroupId
                );
              }
            }

            // Prepare update payload
            const updatePayload = {
              status: selectedStatus.toLowerCase(),
              changedBy,
              bookingId: booking.bookingId || booking._id,
              ...(selectedStatus === 'declined' && declineReason
                ? { declineReason }
                : {}),
            };

            if (!booking.isRecurring) {
              const response = await fetch(
                `${API_BASE_URL}/bookings/${selectedBookingId}`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                  body: JSON.stringify(updatePayload),
                }
              );
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update booking.');
              }
            } else {
              // Recurring: update all bookings in the group
              await Promise.all(seriesBookings.map(b => {
                const recurringPayload = {
                  ...updatePayload,
                  bookingId: b.bookingId || b._id,
                };
                return fetch(
                  `${API_BASE_URL}/bookings/${b.bookingId || b._id}`,
                  {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`,
                    },
                    body: JSON.stringify(recurringPayload),
                  }
                );
              }));
            }

            // Success - refresh bookings and close modal
            await fetchBookings();
            setIsStatusModalOpen(false);
          } catch (err) {
            setError(`Failed to update booking: ${err.message || ''}`);
          } finally {
            setSubmitLoading(false);
          }
        }}
      />
    </div>
  );
};

export default Bookings;