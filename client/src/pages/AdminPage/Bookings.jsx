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
import ClickAwayListener from '@mui/material/ClickAwayListener'; // Add for dropdown UX



const formatDate = (date) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

const parseISODate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
};
// ...add near your other time helpers...
const BUSINESS_HOURS = { start: "08:00", end: "22:00" };

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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

// Convert from 24-hour format (e.g. "14:00") to 12-hour format (e.g. "2:00 PM")
function convertTo12HourFormat(time24) {
  if (!time24) return '';
  let [h, m] = time24.split(':');
  h = parseInt(h, 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
}

// Base API URL
const API_BASE_URL = import.meta.env.VITE_API_URI;

const DEPARTMENTS = [
  'ASITE',
  'WSGSB',
  'SZGSDM',
  'SEELL',
  'Other Units',
  'External',
  'SRF',
  'MRG',
  'OD',
  'ICT',
  'HRS',
  'FSG',
  'OR',
  'ACC',
];// ...existing code...



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
  costCenterCharging: '', // <-- Add this line
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

  const handleNextPageButtonClick = (event) => {
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
        onClick={handleNextPageButtonClick} // <-- Fix here
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

// Add this validation function before Bookings component
const validateAdminForm = (formData) => {
  const errors = {};
  // Title
  if (!formData.title || formData.title.trim().length < 3) {
    errors.title = "Booking title is required (min 3 characters).";
  }
  // Name
  if (!formData.firstName || !formData.lastName) {
    errors.name = "First name and last name are required.";
  }
  // Department
  if (!formData.department) {
    errors.department = "School/Department is required.";
  }
  // Building/Category/Room
  if (!formData.buildingId) {
    errors.building = "Building is required.";
  }
  if (!formData.categoryId) {
    errors.category = "Category is required.";
  }
  if (!formData.roomId) {
    errors.room = "Room selection is required.";
  }
  // Date
  if (!formData.date) {
    errors.date = "Date is required.";
  }
  // Time
  if (!formData.startTime || !formData.endTime) {
    errors.time = "Start and end times are required.";
  } else {
    // Ensure end time is after start time
    const toMinutes = (timeString) => {
      if (!timeString) return 0;
      const [time, period] = timeString.split(" ");
      let [h, m] = time.split(":").map(Number);
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + m;
    };
    if (toMinutes(formData.endTime) <= toMinutes(formData.startTime)) {
      errors.time = "End time must be after start time.";
    }
  }
  // Pax
  if (!formData.bookingCapacity || Number(formData.bookingCapacity) < 1) {
    errors.bookingCapacity = "Number of pax must be at least 1.";
  }
  // Cost Center
// Cost Center (optional, so no validation)
  // Break Room
  if (formData.isBreakRoom) {
    if (!formData.numberOfPaxBreakRoom || Number(formData.numberOfPaxBreakRoom) < 1) {
      errors.numberOfPaxBreakRoom = "Breakout room pax is required.";
    }
    if (!formData.startTimeBreakRoom) {
      errors.startTimeBreakRoom = "Breakout room start time is required.";
    }
    if (!formData.endTimeBreakRoom) {
      errors.endTimeBreakRoom = "Breakout room end time is required.";
    }
    if (
      formData.startTimeBreakRoom &&
      formData.endTimeBreakRoom
    ) {
      const toMinutes = (timeString) => {
        if (!timeString) return 0;
        const [time, period] = timeString.split(" ");
        let [h, m] = time.split(":").map(Number);
        if (period === "PM" && h !== 12) h += 12;
        if (period === "AM" && h === 12) h = 0;
        return h * 60 + m;
      };
      if (toMinutes(formData.endTimeBreakRoom) <= toMinutes(formData.startTimeBreakRoom)) {
        errors.endTimeBreakRoom = "Breakout room end time must be after start time.";
      }
    }
  }
  // Recurring
  if (formData.isRecurring) {
    if (!formData.recurring || formData.recurring === "No") {
      errors.recurring = "Recurrence pattern is required.";
    }
    if (!formData.recurrenceEndDate) {
      errors.recurrenceEndDate = "Recurrence end date is required.";
    }
    if (formData.recurrenceEndDate && formData.date && formData.recurrenceEndDate < formData.date) {
      errors.recurrenceEndDate = "Recurrence end date must be after booking date.";
    }
  }
  return errors;
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


  // ...existing code...// ...inside Bookings component, after useState declarations...

const BUFFER_MINUTES = 30; // <-- Add this line for buffer

const getBlockedIntervals = () => {
  const editingBookingId = isEditModalOpen ? editBookingId : null;
  return bookings
    .filter(
      b =>
        b.roomId === formData.roomId &&
        b.date === formData.date &&
        ['confirmed', 'pending'].includes(b.status?.toLowerCase()) &&
        (!editingBookingId || b.bookingId !== editingBookingId)
    )
    .map(b => {
      // Convert start/end to minutes and apply buffer
      const start = timeToMinutes(formatTime(b.startTime)) - BUFFER_MINUTES;
      const end = timeToMinutes(formatTime(b.endTime)) + BUFFER_MINUTES;
      return {
        start: Math.max(start, toMinutes(BUSINESS_HOURS.start)),
        end: Math.min(end, toMinutes(BUSINESS_HOURS.end)),
      };
    });
};

const getAvailableIntervalsForDay = () => {
  const businessStart = toMinutes(BUSINESS_HOURS.start);
  const businessEnd = toMinutes(BUSINESS_HOURS.end);
  const blocked = getBlockedIntervals().sort((a, b) => a.start - b.start);

  let intervals = [];
  let current = businessStart;

  blocked.forEach(({ start, end }) => {
    if (start > current) intervals.push({ start: current, end: start });
    current = Math.max(current, end);
  });

  if (current < businessEnd) intervals.push({ start: current, end: businessEnd });

  return intervals.filter(i => i.end > i.start);
};

// ...then your getAvailableStartTimes and getAvailableEndTimes...
  // Add these states near your other useState hooks
  const [availabilityStatus, setAvailabilityStatus] = useState({ available: true, message: '' });
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
const [isViewModalOpen, setIsViewModalOpen] = useState(false);
const [viewBooking, setViewBooking] = useState(null);
// Define all columns in an array for visibility control
const ALL_COLUMNS = [
    { key: 'bookingId', label: 'Booking ID' },
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
    { key: 'costCenterCharging', label: 'Charged To' },
    { key: 'isMealRoom', label: 'Meal Room' },
    { key: 'isBreakRoom', label: 'Break Room' },
    { key: 'status', label: 'Status' },
    { key: 'recurring', label: 'Recurring' },
    { key: 'timeSubmitted', label: 'Time Submitted' },
    { key: 'notes', label: 'Notes' },         // <-- Added
    { key: 'remarks', label: 'Remarks' },     // <-- Added
  ];

  const [visibleColumns, setVisibleColumns] = useState(() =>
    Object.fromEntries(ALL_COLUMNS.map(col => [col.key, true]))
  );

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
              recurring: booking.isRecurring ? (booking.recurrencePattern || 'Yes') : 'No'
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
             changedBy: booking.changedBy || 'Unknown', // Ensure changedBy is included
      declineReason: booking.declineReason || '', // Ensure declineReason is included
            email: userData.email || '',

              startTime: booking.startTime ? convertTo24HourFormat(booking.startTime) : '',
              endTime: booking.endTime ? convertTo24HourFormat(booking.endTime) : '',
            recurring: booking.isRecurring ? (booking.recurrencePattern || 'Yes') : 'No'
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
    // Lowercase search term for case-insensitive search
    const search = searchTerm.trim().toLowerCase();

    // Check if search is a number (for Booking ID search)
    const searchIsNumber = !isNaN(search) && search !== '';

    // Helper: get all values for visible columns as a string
    const getBookingSearchString = (booking) => {
      return ALL_COLUMNS
        .filter(col => visibleColumns[col.key])
        .map(col => {
          // Special handling for Booking ID (number)
          if (col.key === 'bookingId') return String(booking[col.key] ?? '');
          // Fallback: string value
          return booking[col.key] ? String(booking[col.key]) : '';
        })
        .join(' ')
        .toLowerCase();
    };

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

    // Apply search to all columns (including bookingId)
    if (search) {
      filtered = filtered.filter(booking => {
        // If search is a number, match Booking ID directly
        if (searchIsNumber && String(booking.bookingId).includes(search)) {
          return true;
        }
        // Otherwise, do normal string search
        return getBookingSearchString(booking).includes(search);
      });
    }

    // Group recurring bookings so only one row per recurrence series is shown
    return groupRecurringBookings(filtered);
  }, [bookings, activeBookingTab, searchTerm, visibleColumns]);

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
  // Helper to extract time in "HH:mm" from a date/time string
 const extractTime = (dateTime) => {
  if (!dateTime) return '';
  // If already in AM/PM format, return as-is
  if (/am|pm/i.test(dateTime)) return dateTime;
  // If ISO string (contains 'T'), extract time part
  if (dateTime.includes('T')) {
    return dateTime.split('T')[1].substring(0, 5); // "HH:mm"
  }
  // If "HH:mm:ss" or "HH:mm"
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(dateTime)) {
    return dateTime.substring(0, 5); // "HH:mm"
  }
  return dateTime;
};

// Set form data
setFormData({
  ...booking,
  date: parseISODate(booking.date),
  startTime: booking.startTime ? convertTo12HourFormat(extractTime(booking.startTime)) : '',
  endTime: booking.endTime ? convertTo12HourFormat(extractTime(booking.endTime)) : '',
  isRecurring: booking.isRecurring || booking.recurring === 'Yes',
  recurring: booking.isRecurring ? (booking.recurrencePattern || 'Daily') : 'No',
  recurrenceEndDate: booking.recurrenceEndDate ? parseISODate(booking.recurrenceEndDate) : '',
  isMealRoom: booking.isMealRoom || false,
  isBreakRoom: booking.isBreakRoom || false,
});

  setEditBookingId(booking.bookingId);

  // Autofill categories and rooms for the selected building and category
  const buildingId = booking.buildingId || '';
  if (buildingId && rooms.length > 0) {
    // Set categories for this building
    const roomsInBuilding = rooms.filter(room =>
      room.buildingId && room.buildingId.toString() === buildingId.toString()
    );
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
    setCategories(categoriesList);

    // Set available rooms for this building and category
    const categoryId = booking.categoryId || '';
    if (categoryId) {
      const filteredRooms = rooms.filter(room =>
        room.buildingId &&
        room.buildingId.toString() === buildingId.toString() &&
        room.categoryId &&
        room.categoryId.toString() === categoryId.toString()
      );
      setAvailableRooms(filteredRooms);
    }
  }

  setIsEditModalOpen(true);
};
  
  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
  };
    
// ...existing code...
const handleBuildingChange = (e) => {
  const selectedBuildingId = e.target.value;
  setFormData(prev => ({
    ...prev,
    buildingId: selectedBuildingId,
    // Only reset category/room if the building actually changed
    categoryId: prev.buildingId !== selectedBuildingId ? '' : prev.categoryId,
    roomId: prev.buildingId !== selectedBuildingId ? null : prev.roomId,
    roomName: prev.buildingId !== selectedBuildingId ? '' : prev.roomName,
  }));
  setFormError(prev => ({ ...prev, building: '', category: '', room: '' }));

  if (selectedBuildingId && rooms.length > 0) {
    const roomsInBuilding = rooms.filter(room =>
      room.buildingId && room.buildingId.toString() === selectedBuildingId
    );
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
    setCategories(categoriesList);

    // If the current categoryId is not in the new list, reset it
    if (!categoriesList.some(cat => cat.id === formData.categoryId)) {
      setFormData(prev => ({
        ...prev,
        categoryId: '',
        roomId: null,
        roomName: ''
      }));
    }
  } else {
    setCategories([]);
    setFormData(prev => ({
      ...prev,
      categoryId: '',
      roomId: null,
      roomName: ''
    }));
  }
  setAvailableRooms([]);
};
// ...existing code...
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

    // --- VALIDATION ---
    const validationErrors = validateAdminForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors);
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
    const manualErrors = {};

     if (!formData.firstName || !formData.lastName) {
      manualErrors.name = 'First name and last name are required';
      hasError = true;
    }
    if (!formData.startTime || !formData.endTime) {
      manualErrors.time = 'Start and end times are required';
      hasError = true;
    }
    if (formData.bookingCapacity < 1) {
      manualErrors.bookingCapacity = 'Pax must be at least 1';
      hasError = true;
    }
    if (!formData.roomId) {
      manualErrors.room = 'Room selection is required';
      hasError = true;
    }
    if (!formData.buildingId) {
      manualErrors.building = 'Building is required';
      hasError = true;
    }
    if (formData.isRecurring && !formData.recurrenceEndDate) {
      manualErrors.recurrence = 'Recurrence end date is required for recurring bookings';
      hasError = true;
    }
    if (hasError) {
      setFormError(manualErrors);
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
     costCenterCharging:
    formData.costCenterCharging && formData.costCenterCharging.trim() !== ""
      ? formData.costCenterCharging
      : "N/A",
        numberOfPaxBreakRoom: formData.isBreakRoom ? formData.numberOfPaxBreakRoom || '' : '',
        startTimeBreakRoom: formData.isBreakRoom ? formData.startTimeBreakRoom || '' : '',
        endTimeBreakRoom: formData.isBreakRoom ? formData.endTimeBreakRoom || '' : '',
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
  
const getAvailableStartTimes = () => {
  if (!formData.roomId || !formData.date) return [];
  const intervals = getAvailableIntervalsForDay();

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = formData.date === todayStr;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let options = [];
  intervals.forEach(({ start, end }) => {
    for (let t = start; t + 30 <= end; t += 30) {
      if (!isToday || t > currentMinutes) {
        options.push(minutesToTime(t));
      }
    }
  });

  // Always add the current value if editing and not present
  const editingBookingId = isEditModalOpen ? editBookingId : null;
  if (
    editingBookingId &&
    formData.startTime &&
    !options.includes(formatTime(formData.startTime))
  ) {
    options.push(formatTime(formData.startTime));
    options.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  }
  return options;
};

const getAvailableEndTimes = () => {
  if (!formData.startTime || !formData.roomId || !formData.date) return [];
  const intervals = getAvailableIntervalsForDay();
  const startMinutes = timeToMinutes(formatTime(formData.startTime));

  const interval = intervals.find(
    ({ start, end }) => start <= startMinutes && startMinutes < end
  );
  let times = [];
  if (interval) {
    for (let t = startMinutes + 30; t <= interval.end; t += 30) {
      times.push(minutesToTime(t));
    }
  }
  // Always add the current value if editing and not present
  const editingBookingId = isEditModalOpen ? editBookingId : null;
  if (
    editingBookingId &&
    formData.endTime &&
    !times.includes(formatTime(formData.endTime))
  ) {
    times.push(formatTime(formData.endTime));
    times.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  }
  return times;
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
              required
              placeholder="Enter first name"
              defaultValue={formData.firstName} // Use defaultValue for uncontrolled input
              onBlur={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))} // Update state on blur
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
            <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select School/Department</option>
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
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Number of Pax <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    name="bookingCapacity"
    defaultValue={formData.bookingCapacity || ''}
    onBlur={e => setFormData(prev => ({ ...prev, bookingCapacity: e.target.value }))}
    placeholder="Enter number of participants"
    autoComplete="off"
    className={`w-full p-2 border ${formError.bookingCapacity ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
  />
  {formError.bookingCapacity && (
    <p className="text-red-500 text-xs mt-1">{formError.bookingCapacity}</p>
  )}
</div>
 

 
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Charged To (Cost Center)
  </label>
 <input
  type="text"
  name="costCenterCharging"
  defaultValue={formData.costCenterCharging}
  onBlur={(e) => setFormData((prev) => ({ ...prev, costCenterCharging: e.target.value }))}
  placeholder="Enter cost center or department"
  className={`w-full p-2 border ${formError.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
/>
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
              {getAvailableStartTimes().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <select
              value={formData.endTime || ''}
              onChange={(e) => handleTimeChange('endTime', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={!formData.startTime}
            >
              <option value="">Select End Time</option>
              {getAvailableEndTimes().map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
        </div>

    {/* Divider */}
      <div className="border-t pt-4 mt-2 flex flex-col items-center">
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700">Other Request</label>
        </div>
        <div className="flex flex-row flex-wrap justify-center gap-12">
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
              Meal Venue Required 
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isBreakRoom"
              name="isBreakRoom"
              checked={formData.isBreakRoom}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isBreakRoom: e.target.checked,
                  // Reset break room details when unchecked
                  ...(e.target.checked
                    ? {}
                    : {
                        numberOfPaxBreakRoom: '',
                        startTimeBreakRoom: '',
                        endTimeBreakRoom: '',
                      }),
                }))
              }
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isBreakRoom" className="ml-2 text-sm text-gray-700">
              Breakout Room Required
            </label>
          </div>
        </div>
      </div>


      {formData.isBreakRoom && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-4 w-full">
        {/* Number of Pax for Break Room */}
        <div className="md:col-span-2">
  <label className="block text-gray-700 font-medium mb-2">
    Number of Pax (Break Room) <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    name="numberOfPaxBreakRoom"
    defaultValue={formData.numberOfPaxBreakRoom || ''}
    onBlur={e => setFormData(prev => ({
      ...prev,
      numberOfPaxBreakRoom: e.target.value,
    }))}
    placeholder="Enter number of participants for break room"
    autoComplete="off"
    className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    required={formData.isBreakRoom}
  />
</div>
        {/* Start Time for Break Room */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Break Room Start Time <span className="text-red-500">*</span>
          </label>
          <select
            name="startTimeBreakRoom"
            value={formData.startTimeBreakRoom || ''}
            onChange={e => setFormData(prev => ({
              ...prev,
              startTimeBreakRoom: e.target.value,
              // Reset end time if start changes
              endTimeBreakRoom: '',
            }))}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={formData.isBreakRoom}
          >
            <option value="">Select Start Time</option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>{time}</option>
            ))}
          </select>
        </div>
        {/* End Time for Break Room */}
        <div>
          <label className="block text-gray-700 font-medium mb-2">
            Break Room End Time <span className="text-red-500">*</span>
          </label>
          <select
            name="endTimeBreakRoom"
            value={formData.endTimeBreakRoom || ''}
            onChange={e => setFormData(prev => ({
              ...prev,
              endTimeBreakRoom: e.target.value,
            }))}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required={formData.isBreakRoom}
            disabled={!formData.startTimeBreakRoom}
          >
            <option value="">Select End Time</option>
            {TIME_OPTIONS
              .filter(
                (time) =>
                  !formData.startTimeBreakRoom ||
                  TIME_OPTIONS.indexOf(time) > TIME_OPTIONS.indexOf(formData.startTimeBreakRoom)
              )
              .map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
          </select>
        </div>
      </div>
    )}

      <div className="pt-4 mt-2 flex flex-col items-center">
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

    {/* Notes and Remarks */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     <div>
  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
  <textarea
    name="notes"
    defaultValue={formData.notes || ''}
    onBlur={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
    rows="3"
    placeholder="Add any additional notes here"
    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400"
  ></textarea>
</div>


<div>
  <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Remarks</label>
  <textarea
    name="remarks"
    defaultValue={formData.remarks || ''}
    onBlur={e => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
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
        className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${submitLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
        disabled={submitLoading}
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
const handleSaveRemarks = async (booking, newRemarks) => {
  try {
    const response = await fetch(`${API_BASE_URL}/bookings/${booking.bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ remarks: newRemarks }),
    });
    if (!response.ok) {
      throw new Error('Failed to save remarks');
    }
    await fetchBookings(); // Refresh bookings list

    // Fetch the updated booking from the backend and update the modal
    const updatedRes = await fetch(`${API_BASE_URL}/bookings/${booking.bookingId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (updatedRes.ok) {
      const updatedBooking = await updatedRes.json();
      setViewBooking(updatedBooking);
    } else {
      // fallback: update with local data
      setViewBooking({ ...booking, remarks: newRemarks });
    }
  } catch (err) {
    setError(err.message || 'Failed to save remarks.');
  }
};

const [showColumnMenu, setShowColumnMenu] = useState(false);
const handleToggleColumn = (key) => {
  setVisibleColumns(prev => ({
    ...prev,
    [key]: !prev[key],
  }));
};

  return (
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh'}}>
      <TopBar onSearch={setSearchTerm} />
      <div className="p-4 bg-gray-100 w-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Bookings</h2>
          <div className="flex gap-2 items-center">
            {/* Column Visibility Button */}
            <div className="relative">
              <button
                className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium"
                onClick={() => setShowColumnMenu(v => !v)}
                type="button"
              >
                Columns
              </button>
              {showColumnMenu && (
                <ClickAwayListener onClickAway={() => setShowColumnMenu(false)}>
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg z-50 p-3">
                    <div className="font-bold mb-2 text-gray-700 text-sm">Show/Hide Columns</div>
                    {ALL_COLUMNS.map(col => (
                      <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-gray-800 text-sm">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.key]}
                          onChange={() => handleToggleColumn(col.key)}
                          className="accent-blue-600"
                        />
                        {col.label}
                      </label>
                    ))}
                  </div>
                </ClickAwayListener>
              )}
            </div>
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
                {ALL_COLUMNS.filter(col => visibleColumns[col.key]).map(({ key, label }) => (
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
                  .map((booking) => (
                    <TableRow key={booking._id || booking.id} hover>
                      {ALL_COLUMNS.filter(col => visibleColumns[col.key]).map(col => (
                        <TableCell key={col.key}>
                          {/* Custom rendering for Notes and Remarks */}
                          {col.key === 'notes'
                            ? (
                        <div className="truncate max-w-[200px]" title={booking.notes || ""}>
                          {booking.notes ? booking.notes.slice(0, 60) : ""}
                          {booking.notes && booking.notes.length > 60 ? "..." : ""}
                        </div>
                      )
                    : col.key === 'remarks'
                    ? (
                        <div className="truncate max-w-[200px]" title={booking.remarks || ""}>
                          {booking.remarks ? booking.remarks.slice(0, 60) : ""}
                          {booking.remarks && booking.remarks.length > 60 ? "..." : ""}
                        </div>
                      )
                    // ...existing custom rendering for other columns...
                    : col.key === 'date'
                    ? (booking.recurring !== 'No' && booking.recurringEndDate
                        ? <div>{formatDate(booking.date)} - {formatDate(booking.recurringEndDate)} ({booking.recurring})</div>
                        : <div>{formatDate(booking.date)}</div>)
                 // ...inside your TableCell rendering for col.key === 'startTime'...
: col.key === 'startTime'
? (
  <>
    {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
  </>
)
                    : col.key === 'isMealRoom'
                    ? (
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
                    )
                    : col.key === 'isBreakRoom'
                    ? (
                      <span>
                        {booking.isBreakRoom ? 'Yes' : 'No'}
                        {booking.isBreakRoom && (
                          <>
                            {booking.numberOfPaxBreakRoom ? ` / ${booking.numberOfPaxBreakRoom} pax` : ''}
                            {booking.startTimeBreakRoom ? ` / ${booking.startTimeBreakRoom}` : ''}
                            {booking.endTimeBreakRoom ? ` - ${booking.endTimeBreakRoom}` : ''}
                          </>
                        )}
                      </span>
                    )
                    : col.key === 'status'
                    ? (
  <span style={{
    background: booking.status === 'confirmed'
      ? '#bbf7d0'
      : booking.status === 'pending'
      ? '#fef9c3'
      : booking.status === 'declined'
      ? '#fecaca'
      : '#f3f4f6',
    color: booking.status === 'confirmed'
      ? '#16a34a'
      : booking.status === 'pending'
      ? '#ca8a04'
      : booking.status === 'declined'
      ? '#dc2626'
      : '#374151',
    borderRadius: 8,
    padding: '2px 8px',
    fontSize: 12,
    display: 'inline-block'
  }}>
    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
    {/* Show decline reason if declined */}
    {booking.status === 'declined' && booking.declineReason && (
      <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>
        <b>Reason:</b> {booking.declineReason}
      </div>
    )}
    {/* Show changedBy for confirmed, declined, or cancelled */}
    {['confirmed', 'declined', 'cancelled'].includes(booking.status) && booking.changedBy && (
      <div style={{ color: '#374151', fontSize: 11, marginTop: 4 }}>
        <b> Processed By:</b> {booking.changedBy}
      </div>
    )}
  </span>
)
                    : col.key === 'timeSubmitted'
                    ? (booking.timeSubmitted
                        ? new Date(booking.timeSubmitted).toLocaleString()
                        : '')
                    : booking[col.key]
                  }
                </TableCell>
              ))}
              <TableCell>
                {/* ...existing Actions buttons... */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <button
                    style={{ color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      setViewBooking(booking);
                      setIsViewModalOpen(true);
                    }}
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
            <TableCell colSpan={ALL_COLUMNS.filter(col => visibleColumns[col.key]).length + 1} align="center">
              No bookings found. Add a new booking to get started.
            </TableCell>
          </TableRow>
        )
      )}
    </TableBody>
    <TableFooter>
      <TableRow>
        <TablePagination
          rowsPerPageOptions={[10]}
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
      headers: { Authorization: `Bearer ${token}` },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      changedBy = `${userData.firstName} ${userData.lastName}`;
    } else {
      console.error(`Failed to fetch user details. Status: ${userResponse.status}`);
    }
  } catch (error) {
    console.error('Error fetching user details:', error);
  }
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
<BookingDetailsModal
  isOpen={isViewModalOpen}
  booking={viewBooking}
  onClose={() => { setIsViewModalOpen(false); setViewBooking(null); }}
  onSaveRemarks={handleSaveRemarks} // <-- This must exist in Bookings!
/>
    </div>



  );
};

 
// ...existing code...
const formatTime = (timeString) => {
  if (!timeString) return '';

  // If already in AM/PM format, return as-is
  if (/am|pm/i.test(timeString)) return timeString;

  // If ISO string (contains 'T'), extract time part
  if (timeString.includes('T')) {
    const date = new Date(timeString);
    if (!isNaN(date)) {
      let hour = date.getHours();
      let minute = date.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      hour = hour % 12 || 12;
      return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }
  }

  // Handle "HH:mm:ss" or "HH:mm"
  const match = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    let [h, m] = [parseInt(match[1]), match[2]];
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  // Fallback
  return timeString;
};
 
const getAvailableIntervals = (bookings, businessHours = { start: "08:00", end: "22:00" }) => {
  const buffer = 30; // Buffer time in minutes
  const toMinutes = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const toMinutesFromISO = (iso) => {
    const d = new Date(iso);
    return d.getUTCHours() * 60 + d.getUTCMinutes();
  };

  if (!bookings || bookings.length === 0) {
    return [{ start: toMinutes(businessHours.start), end: toMinutes(businessHours.end) }];
  }

  const busy = bookings
    .map((b) => ({
      start: Math.max(toMinutesFromISO(b.startTime) - buffer, toMinutes(businessHours.start)),
      end: Math.min(toMinutesFromISO(b.endTime) + buffer, toMinutes(businessHours.end)),
    }))
    .sort((a, b) => a.start - b.start);

  const slots = [];
  let current = toMinutes(businessHours.start);

  for (const period of busy) {
    if (period.start > current) {
      slots.push({ start: current, end: period.start });
    }
    current = Math.max(current, period.end);
  }

  if (current < toMinutes(businessHours.end)) {
    slots.push({ start: current, end: toMinutes(businessHours.end) });
  }

  return slots.filter((slot) => slot.end > slot.start);
};
  
// Converts "h:mm AM/PM" to minutes since 00:00
const timeToMinutes = (timeString) => {
  if (!timeString) return 0;
  const [time, period] = timeString.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
};

// Converts minutes since 00:00 to "h:mm AM/PM"
const minutesToTime = (minutes) => {
  let h = Math.floor(minutes / 60);
  let m = minutes % 60;
  let suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h >  12) h -= 12;
  return `${h}:${m.toString().padStart(2, '0')} ${suffix}`;
};

// Booking Details Modal Component
const BookingDetailsModal = ({
  isOpen,
  booking,
  onClose,
  onSaveRemarks,
}) => {
  const [remarks, setRemarks] = useState(booking?.remarks || "");
  const [saving, setSaving] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [fullRemarks, setFullRemarks] = useState(booking?.remarks || "");

  useEffect(() => {
    setRemarks(booking?.remarks || "");
    setFullRemarks(booking?.remarks || "");
  }, [booking]);

  if (!isOpen || !booking) return null;

  const handleSaveRemarks = async () => {
    setSaving(true);
    if (onSaveRemarks) await onSaveRemarks(booking, remarks);
    setFullRemarks(remarks);
    setSaving(false);
  };

  const handleSaveFullRemarks = async () => {
    setSaving(true);
    setRemarks(fullRemarks);
    if (onSaveRemarks) await onSaveRemarks(booking, fullRemarks);
    setShowRemarksModal(false);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7fafd] bg-opacity-10 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl p-10 w-full max-w-5xl min-h-[650px] max-h-[95vh] overflow-y-auto flex flex-col" style={{ border: "1.5px solid #dde3ed" }}>
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-5 right-7 text-gray-400 hover:text-gray-600 text-3xl font-bold"
          aria-label="Close modal"
        >
          ×
        </button>
        {/* HEADER */}
        <div className="flex items-center gap-3 mb-8 pl-12">
          <span className="bg-blue-100 rounded-xl p-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="4" y="5" width="16" height="16" rx="3" strokeWidth="2" />
              <path strokeWidth="2" d="M8 3v4m8-4v4M4 11h16"/>
            </svg>
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Booking Details</h2>
        </div>
        {/* CONTENT */}
        <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-start">
          {/* INFO COLUMN */}
          <div className="flex-1 text-left text-lg">
            <div className="mb-2"><b>Booking Title:</b> {booking.title || ""}</div>
            <div className="mb-2"><b>First Name:</b> {booking.firstName || ""}</div>
            <div className="mb-2"><b>Last Name:</b> {booking.lastName || ""}</div>
            <div className="mb-2"><b>Department:</b> {booking.department || ""}</div>
            <div className="mb-2"><b>Building:</b> {booking.building || ""}</div>
            <div className="mb-2"><b>Category:</b> {booking.category || ""}</div>
            <div className="mb-2"><b>Room:</b> {booking.roomName || ""}</div>
           <div className="mb-2">
  <b>Date:</b>{" "}
  {booking.recurring !== 'No' && booking.recurringEndDate ? (
    <>
      {formatDate(booking.date)} - {formatDate(booking.recurringEndDate)} ({booking.recurring})
    </>
  ) : (
    booking.date ? formatDate(booking.date) : ""
  )}
</div>
<div className="mb-2">
  <b>Time:</b>{" "}
  {(booking.startTime
    ? convertTo12HourFormat(
        booking.startTime.split('T').length > 1
          ? booking.startTime.split('T')[1].substring(0, 5)
          : booking.startTime.substring(0, 5)
      )
    : "") +
    (booking.endTime
      ? " – " +
        convertTo12HourFormat(
          booking.endTime.split('T').length > 1
            ? booking.endTime.split('T')[1].substring(0, 5)
            : booking.endTime.substring(0, 5)
        )
      : "")}
</div>
            <div className="mb-2"><b>Pax:</b> {booking.bookingCapacity || ""}</div>
            <div className="mb-2"><b>Meal Room:</b> {booking.isMealRoom ? "Yes" : "No"}</div>
            <div className="mb-2"><b>Break Room:</b> {booking.isBreakRoom ? "Yes" : "No"}</div>
            <div className="mb-2"><b>Break Room Pax:</b> {booking.numberOfPaxBreakRoom || ""}</div>
            <div className="mb-2"><b>Break Room Start:</b> {booking.startTimeBreakRoom || ""}</div>
            <div className="mb-2"><b>Break Room End:</b> {booking.endTimeBreakRoom || ""}</div>
            <div className="mb-2"><b>Status:</b> {booking.status || ""}</div>
            <div className="mb-2"><b>Recurring:</b> {booking.recurring || ""}</div>
          </div>
          {/* NOTES & REMARKS COLUMN */}
          <div className="w-full md:w-[380px] flex flex-col gap-6">
            {/* Notes */}
            <div>
              <div className="font-bold text-lg mb-1">Notes:</div>
              <div className="bg-gray-100 p-4 rounded-lg min-h-[120px] max-h-[220px] text-base overflow-y-auto border border-gray-200 shadow-sm">
                {booking.notes || ""}
              </div>
              <button
                className="mt-2 px-4 py-1 w-full border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-base"
                onClick={() => setShowNotesModal(true)}
                type="button"
              >
                Show Full Notes
              </button>
            </div>

            {/* Cancel Reason - only for cancelled bookings */}
            {booking.status === 'cancelled' && booking.cancelReason && (
              <div>
                <div className="font-bold text-lg mb-1">Cancel Reason:</div>
                <div className="bg-gray-100 p-4 rounded-lg min-h-[80px] max-h-[220px] text-base overflow-y-auto border border-gray-200 shadow-sm">
                  {booking.cancelReason}
                </div>
              </div>
            )}

            {/* Remarks */}
            <div>
              <div className="font-bold text-lg mb-1">Remarks:</div>
              <textarea
                className="bg-gray-100 p-4 rounded-lg w-full min-h-[120px] max-h-[220px] border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-400 text-base"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Enter remarks for this booking"
                disabled={saving}
                style={{ resize: "vertical" }}
              />
              <div className="flex gap-2">
                <button
                  className="mt-2 px-4 py-1 flex-1 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-base"
                  onClick={() => setShowRemarksModal(true)}
                  type="button"
                >
                  Show Full Remarks
                </button>
                <button
                  className="mt-2 px-4 py-1 flex-1 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-base transition"
                  onClick={handleSaveRemarks}
                  disabled={saving}
                  type="button"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOR FULL NOTES */}
        {showNotesModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white p-8 rounded-xl max-w-2xl w-full relative border border-gray-200 shadow-xl">
              <button
                onClick={() => setShowNotesModal(false)}
                className="absolute top-2 right-4 text-gray-400 text-2xl font-bold hover:text-gray-600"
                aria-label="Close"
              >×</button>
              <h3 className="text-xl font-bold mb-4">Full Notes</h3>
              <div className="whitespace-pre-wrap text-base" style={{ maxHeight: 400, overflowY: "auto" }}>
                {booking.notes}
              </div>
            </div>
          </div>
        )}
        {/* MODAL FOR FULL REMARKS (editable) */}
        {showRemarksModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white p-8 rounded-xl max-w-2xl w-full relative border border-gray-200 shadow-xl flex flex-col">
              <button
                onClick={() => setShowRemarksModal(false)}
                className="absolute top-2 right-4 text-gray-400 text-2xl font-bold hover:text-gray-600"
                aria-label="Close"
              >×</button>
              <h3 className="text-xl font-bold mb-4">Full Remarks</h3>
              <textarea
                className="w-full bg-gray-100 p-4 rounded-lg min-h-[220px] border border-gray-200 text-base mb-6"
                value={fullRemarks}
                onChange={e => setFullRemarks(e.target.value)}
                disabled={saving}
                style={{ resize: "vertical" }}
              />
              <button
                className="px-8 py-2 bg-blue-600 text-white text-lg font-bold rounded-lg hover:bg-blue-700 self-end"
                onClick={handleSaveFullRemarks}
                disabled={saving}
                type="button"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Bookings;