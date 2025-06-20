import React, { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/AdminComponents/TopBar';
import axios from 'axios';
import Modal from '../../components/AdminComponents/Modal';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URI;

const calculateRecurringDates = (startDate, recurrenceType, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(new Date(currentDate).toISOString().split('T')[0]);
    if (recurrenceType === 'Daily') currentDate.setDate(currentDate.getDate() + 1);
    else if (recurrenceType === 'Weekly') currentDate.setDate(currentDate.getDate() + 7);
    else if (recurrenceType === 'Monthly') currentDate.setMonth(currentDate.getMonth() + 1);
  }
  return dates;
};

const groupBookingsByDate = (bookings) => {
  const grouped = {};
  bookings.forEach((booking) => {
    const recurringDates =
      booking.recurrenceEndDate && booking.recurring !== 'No'
        ? calculateRecurringDates(booking.date, booking.recurring, booking.recurrenceEndDate)
        : [booking.date];
    recurringDates.forEach((date) => {
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(booking);
    });
  });
  return grouped;
};

const generateWeeklyCalendarDays = () => {
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDayOfWeek);
  const days = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startOfWeek);
    currentDate.setDate(startOfWeek.getDate() + i);
    days.push({
      day: dayNames[currentDate.getDay()],
      date: currentDate.getDate(),
      isToday: currentDate.toDateString() === today.toDateString(),
      fullDate: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`,
    });
  }
  return days;
};

const formatDate = (dateString) => {
  try {
    const options = { year: 'numeric', month: 'long', day: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString;
  }
};

const departmentColors = {
  'ASITE': 'bg-purple-100 border-purple-400 text-purple-900',
  'WSGSB': 'bg-green-100 border-green-400 text-green-900',
  'SZGSDM': 'bg-yellow-100 border-yellow-400 text-yellow-900',
  'SEELL': 'bg-blue-100 border-blue-400 text-blue-900',
  'Other Units': 'bg-orange-100 border-orange-400 text-orange-900',
  'External': 'bg-pink-100 border-pink-400 text-pink-900',
  'SRF': 'bg-rose-100 border-rose-400 text-rose-900',
  'IMCG': 'bg-rose-100 border-rose-400 text-rose-900',
  'Marketing': 'bg-rose-100 border-rose-400 text-rose-900',
  'ICT': 'bg-rose-100 border-rose-400 text-rose-900',
  'HR': 'bg-rose-100 border-rose-400 text-rose-900',
  'Finance': 'bg-rose-100 border-rose-400 text-rose-900',
  'Registrars': 'bg-rose-100 border-rose-400 text-rose-900',
  'Others': 'bg-gray-100 border-gray-400 text-gray-900'
};

const getDepartmentColorDot = (department) => {
  const colorClass = departmentColors[department];
  if (!colorClass) return 'bg-gray-400';
  return colorClass.split(' ')[0];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeBookingTab, setActiveBookingTab] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [recentBookings, setRecentBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    declinedBookings: 0,
    totalUsers: 0,
  });

  const token = localStorage.getItem('token');

  const calculateDashboardStats = useCallback((bookings, rooms, users) => {
    try {
      const totalRooms = rooms.reduce((total, room) => {
        let count = 1;
        if (room.subRooms && room.subRooms.length > 0) count += room.subRooms.length;
        return total + count;
      }, 0);
      const pendingBookings = bookings.filter(b => b.status === 'pending').length;
      const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
      const declinedBookings = bookings.filter(b => b.status === 'declined').length;
      const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length; // <-- Added
      const totalBookings = bookings.length;
      setDashboardStats({
        totalRooms,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        declinedBookings,
        cancelledBookings, // <-- Added
        totalUsers: users.length,
      });
    } catch (error) {
      console.error('Error calculating dashboard stats:', error);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!token) {
      setError('No authentication token found. Please login again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const headers = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('Starting API calls...');

      // Use axios instead of fetch for better error handling
      const [bookingsRes, roomsRes, usersRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/bookings`, { headers }),
        axios.get(`${API_BASE_URL}/rooms`, { headers }),
        axios.get(`${API_BASE_URL}/users`, { headers })
      ]);

      console.log('API responses:', { bookingsRes, roomsRes, usersRes });

      // Handle bookings response
      let allBookings = [];
      if (bookingsRes.status === 'fulfilled') {
        allBookings = bookingsRes.value.data?.data || bookingsRes.value.data || [];
        console.log('Bookings loaded:', allBookings.length);
      } else {
        console.error('Bookings fetch failed:', bookingsRes.reason);
        // Continue with empty array instead of failing completely
      }

      // Handle rooms response
      let allRooms = [];
      if (roomsRes.status === 'fulfilled') {
        allRooms = roomsRes.value.data?.data || roomsRes.value.data || [];
        console.log('Rooms loaded:', allRooms.length);
      } else {
        console.error('Rooms fetch failed:', roomsRes.reason);
      }

      // Handle users response
      let allUsers = [];
      if (usersRes.status === 'fulfilled') {
        allUsers = usersRes.value.data?.data || usersRes.value.data || [];
        console.log('Users loaded:', allUsers.length);
      } else {
        console.error('Users fetch failed:', usersRes.reason);
      }

      setRooms(allRooms);
      setUsers(allUsers);

      // Create room mapping for enriching bookings
      const roomMap = {};
      const categoryMap = {};
      const buildingMap = {};
      
      allRooms.forEach(room => {
        const roomId = room.roomId || room.id;
        if (roomId) {
          roomMap[roomId] = room.roomName || room.name || '';
          categoryMap[roomId] = room.category || room.Category?.categoryName || '';
          buildingMap[roomId] = room.building || room.Building?.buildingName || '';
        }
      });

      // Enrich bookings with room information
      const enrichedBookings = allBookings.map((booking) => ({
        ...booking,
        meetingRoom: roomMap[booking.roomId] || booking.roomName || 'Unknown Room',
        category: categoryMap[booking.roomId] || booking.category || 'Unknown Category',
        buildingName: buildingMap[booking.roomId] || booking.building || 'Unknown Building',
        // Ensure required fields have defaults
        firstName: booking.firstName || '',
        lastName: booking.lastName || '',
        department: booking.department || '',
        title: booking.title || 'Untitled Booking',
        status: booking.status || 'pending',
        date: booking.date || new Date().toISOString().split('T')[0],
        startTime: booking.startTime || '',
        endTime: booking.endTime || '',
        recurring: booking.recurring || 'No',
        notes: booking.notes || ''
      }));

      console.log('Enriched bookings:', enrichedBookings.length);
      setRecentBookings(enrichedBookings);
      calculateDashboardStats(enrichedBookings, allRooms, allUsers);

    } catch (err) {
      console.error('Dashboard data fetch error:', err);
      setError(`Failed to load dashboard data: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [token, calculateDashboardStats]);

  useEffect(() => { 
    fetchDashboardData(); 
  }, [fetchDashboardData]);

  const statCards = [
    { title: 'Total Rooms', value: dashboardStats.totalRooms.toString(), icon: '🏢', color: 'bg-blue-100' },
    {
      title: 'Total Bookings',
      value: dashboardStats.totalBookings.toString(),
      icon: '📝',
      color: 'bg-green-100',
      details: [
        { label: 'Pending', value: dashboardStats.pendingBookings.toString(), color: 'text-yellow-500' },
        { label: 'Confirmed', value: dashboardStats.confirmedBookings.toString(), color: 'text-green-500' },
        { label: 'Declined', value: dashboardStats.declinedBookings.toString(), color: 'text-red-500' },
        { label: 'Cancelled', value: dashboardStats.cancelledBookings?.toString() || '0', color: 'text-gray-500' }, // <-- Added
      ],
    },
    { title: 'Total Users', value: dashboardStats.totalUsers.toString(), icon: '👥', color: 'bg-yellow-100' },
  ];

  const weeklyCalendarDays = generateWeeklyCalendarDays();
  const bookingsByDate = groupBookingsByDate(recentBookings);

  // Helper: Expand confirmed bookings with recurrence, just like BookingCalendar
  const getProcessedBookingsByDate = () => {
    const processed = {};
    // Only include confirmed bookings
    recentBookings
      .filter(b => b.status === 'confirmed')
      .forEach(booking => {
        // Use recurrencePattern and isRecurring for compatibility with BookingCalendar
        const isRecurring = booking.isRecurring || (booking.recurring && booking.recurring !== 'No');
        const recurrencePattern = booking.recurrencePattern || booking.recurring;
        const recurrenceEndDate = booking.recurrenceEndDate;

        if (isRecurring && recurrencePattern && recurrencePattern !== 'No' && recurrenceEndDate) {
          const dates = calculateRecurringDates(booking.date, recurrencePattern, recurrenceEndDate);
          dates.forEach(date => {
            if (!processed[date]) processed[date] = [];
            processed[date].push({
              ...booking,
              date,
              isRecurringInstance: true,
              originalDate: booking.date,
              recurrencePattern,
            });
          });
        } else {
          // Non-recurring
          if (!processed[booking.date]) processed[booking.date] = [];
          processed[booking.date].push(booking);
        }
      });
    return processed;
  };

  const processedBookingsByDate = getProcessedBookingsByDate();

  const getFilteredBookings = () => {
    if (activeBookingTab === 'all') return recentBookings;
    if (activeBookingTab === 'pending') return recentBookings.filter(b => b.status === 'pending');
    if (activeBookingTab === 'approved') return recentBookings.filter(b => b.status === 'confirmed');
    if (activeBookingTab === 'declined') return recentBookings.filter(b => b.status === 'declined');
    if (activeBookingTab === 'cancelled') return recentBookings.filter(b => b.status === 'cancelled');
    return recentBookings;
  };

  const handleEditClick = (booking) => {
    setSelectedBooking(booking);
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBooking(null);
  };

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      return { key, direction: 'asc' };
    });
  };

  const sortedBookings = [...getFilteredBookings()].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;
    const valA = a[key]?.toString().toLowerCase() ?? '';
    const valB = b[key]?.toString().toLowerCase() ?? '';
    return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const formatTime = (timeString) => {
    if (!timeString) return '';
    if (/am|pm/i.test(timeString)) return timeString;
    if (timeString.includes('T')) {
      const date = new Date(timeString);
      if (!isNaN(date)) {
        let hour = date.getUTCHours();
        let minute = date.getUTCMinutes();
        let suffix = 'AM';
        if (hour === 0) { hour = 12; }
        else if (hour === 12) { suffix = 'PM'; }
        else if (hour > 12) { hour -= 12; suffix = 'PM'; }
        return `${hour}:${minute.toString().padStart(2, '0')} ${suffix}`;
      }
    }
    const match = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      let [h, m] = [parseInt(match[1]), match[2]];
      let suffix = 'AM';
      if (h === 0) { h = 12; }
      else if (h === 12) { suffix = 'PM'; }
      else if (h > 12) { h -= 12; suffix = 'PM'; }
      return `${h}:${m} ${suffix}`;
    }
    return timeString;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{position:'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh' }}>
        <TopBar onSearch={setSearchTerm} />
        <div className="p-6 bg-gray-50 min-h-screen">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h1>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {statCards.map((card, index) => (
              <div key={index} className={`p-6 rounded-lg shadow-md ${card.color} hover:shadow-lg transition-shadow`}>
                <div className="flex items-center mb-3">
                  <div className="p-3 bg-white rounded-full shadow-sm mr-4">
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                  <div className="text-gray-600 text-sm">{card.title}</div>
                </div>
                <div className="text-3xl font-bold text-gray-800">{card.value}</div>
                {card.details && (
                  <div className="mt-3 text-sm">
                    {card.details.map((detail, i) => (
                      <button
                        key={i}
                        className={`${detail.color} mr-2 underline hover:text-blue-700 focus:outline-none bg-transparent p-0 border-0 shadow-none`}
                        onClick={() => navigate(`/admin/bookings?status=${detail.label.toLowerCase()}`)}
                        type="button"
                      >
                        {detail.value} {detail.label}
                        {i < card.details.length - 1 ? ' • ' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Weekly Calendar */}
          <div className="bg-white rounded-lg shadow-md mb-8 border border-gray-200">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-gray-800">This Week</h2>
            </div>
            <div className="grid grid-cols-7">
              {weeklyCalendarDays.map((day, index) => {
                const confirmedBookings = processedBookingsByDate[day.fullDate] || [];
                return (
                  <div key={index} className="p-2 text-center border-r last:border-r-0 hover:bg-gray-50 transition relative">
                    <div className="text-sm text-gray-500">{day.day}</div>
                    <div className={`text-lg ${day.isToday ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' : 'text-gray-800'}`}>
                      {day.date}
                    </div>
                    <div className="flex flex-col gap-1 mt-2">
                      {confirmedBookings.length === 0 ? (
                        <div className="text-xs text-gray-400 italic">No bookings</div>
                      ) : (
                        confirmedBookings.slice(0, 5).map((booking, idx) => (
                          <div
                            key={idx}
                            className={`text-xs p-1.5 rounded-md flex flex-col gap-0.5 border-l-4 ${departmentColors[booking.department] || 'bg-gray-100 border-gray-400 text-gray-900'}`}
                            title={`${booking.title} (${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}) - ${booking.firstName} ${booking.lastName} - ${booking.department || 'No Department'}${booking.isRecurringInstance ? ' (Recurring)' : ''}`}
                            style={{ cursor: 'default' }}
                          >
                            <div className="flex items-center gap-1">
                              <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${getDepartmentColorDot(booking.department)}`}></span>
                              <span className="font-medium truncate flex-1">{booking.title}</span>
                              {booking.isRecurringInstance && (
                                <span className="text-[9px] text-gray-600 flex-shrink-0">↻</span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-700">
                              <span className="font-medium">{booking.department || 'No Dept'}</span>
                              <span className="text-[9px]">{formatTime(booking.startTime)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Booking Tabs and Table */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              {['All', 'Pending', 'Approved', 'Declined', 'Cancelled'].map((status) => (
                <button
                  key={status}
                  className={`px-4 py-2 rounded-lg font-medium transition ${activeBookingTab === status.toLowerCase()
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => setActiveBookingTab(status.toLowerCase())}
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              onClick={() => navigate('/admin/bookings')}
            >
              View All
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {[
                    { label: 'Booking ID', key: 'bookingId' }, // <-- NEW COLUMN
                    { label: 'Booking Title', key: 'title' },
                    { label: 'Name', key: 'lastName' },
                    { label: 'Department', key: 'department' },
                    { label: 'Room Type', key: 'category' },
                    { label: 'Meeting Room', key: 'meetingRoom' },
                    { label: 'Building', key: 'buildingName' },
                    { label: 'Date', key: 'date' },
                    { label: 'Time', key: 'startTime' },
                    { label: 'Time Submitted', key: 'timeSubmitted' },
                    { label: 'Status', key: 'status' },
                  ].map(({ label, key }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="cursor-pointer px-4 py-2 border-b hover:bg-gray-200 select-none"
                    >
                      {label} {sortConfig.key === key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedBookings.length > 0 ? (
                  sortedBookings
                    .filter(booking =>
                      `${booking.title} ${booking.firstName} ${booking.lastName} ${booking.department} ${booking.meetingRoom} ${booking.buildingName}`
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 5) // <-- Only show the first 5 entries
                    .map((booking) => {
                      const recurringDates =
                        booking.recurrenceEndDate && booking.recurring !== 'No'
                          ? calculateRecurringDates(booking.date, booking.recurring, booking.recurrenceEndDate)
                          : [booking.date];
                      return (
                        <tr key={booking.bookingId || booking.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => handleEditClick(booking)}>
                          <td className="px-4 py-2 border-b">{booking.bookingId || booking.id}</td>
                          <td className="px-4 py-2 border-b">{booking.title}</td>
                          <td className="px-4 py-2 border-b">
                            {booking.lastName && booking.firstName ? `${booking.lastName}, ${booking.firstName}` : 'N/A'}
                          </td>
                          <td className="px-4 py-2 border-b">{booking.department}</td>
                          <td className="px-4 py-2 border-b">{booking.category}</td>
                          <td className="px-4 py-2 border-b">{booking.meetingRoom}</td>
                          <td className="px-4 py-2 border-b">{booking.buildingName}</td>
                          <td className="px-4 py-2 border-b">
                            {recurringDates.map((date, index) => (
                              <div key={index}>{formatDate(date)}</div>
                            ))}
                          </td>
                          <td className="px-4 py-2 border-b">
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </td>
                          <td className="px-4 py-2 border-b">
                            {booking.timeSubmitted
                              ? new Date(booking.timeSubmitted).toLocaleString()
                              : ''}
                          </td>
                          <td className="px-4 py-2 border-b">
                            <div>
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  booking.status === 'confirmed'
                                    ? 'bg-green-100 text-green-600'
                                    : booking.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-600'
                                    : booking.status === 'declined'
                                    ? 'bg-red-100 text-red-600'
                                    : booking.status === 'cancelled'
                                    ? 'bg-gray-300 text-gray-700'
                                    : ''
                                }`}
                              >
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                              {booking.firstName && booking.lastName && (
                                <small className="block text-gray-500 mt-1">
                                  Booked by {booking.firstName} {booking.lastName}
                                </small>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan="11" className="px-4 py-8 text-center text-gray-500">
                      No bookings found. {searchTerm && `Try adjusting your search term "${searchTerm}".`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Modal */}
          <Modal isOpen={isModalOpen} onClose={closeModal}>
            {selectedBooking && (
              <div>
                <h2 className="text-xl font-bold mb-4">Booking Details</h2>
                <div className="space-y-2">
                  <p><strong>Title:</strong> {selectedBooking.title}</p>
                  <p><strong>First Name:</strong> {selectedBooking.firstName}</p>
                  <p><strong>Last Name:</strong> {selectedBooking.lastName}</p>
                  <p><strong>School:</strong> {selectedBooking.department}</p>
                  <p><strong>Room Type:</strong> {selectedBooking.category}</p>
                  <p><strong>Meeting Room:</strong> {selectedBooking.meetingRoom}</p>
                  <p><strong>Building:</strong> {selectedBooking.buildingName}</p>
                  <p><strong>Date:</strong> {formatDate(selectedBooking.date)}</p>
                  <p><strong>Time:</strong> {formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}</p>
                  <p><strong>Notes:</strong> {selectedBooking.notes || 'No notes'}</p>
                  <p><strong>Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                      selectedBooking.status === 'confirmed'
                        ? 'bg-green-100 text-green-600'
                        : selectedBooking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-600'
                        : 'bg-red-100 text-red-600'
                    }`}>
                      {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                    </span>
                  </p>
                  <p><strong>Recurring:</strong> {selectedBooking.recurring}</p>
                  {selectedBooking.recurring !== 'No' && selectedBooking.recurrenceEndDate && (
                    <p><strong>Recurrence End Date:</strong> {formatDate(selectedBooking.recurrenceEndDate)}</p>
                  )}
                </div>
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;