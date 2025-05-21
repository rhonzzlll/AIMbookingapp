import React, { useState, useEffect, useCallback } from 'react';
import TopBar from '../../components/AdminComponents/TopBar';
import axios from 'axios';
import Modal from '../../components/AdminComponents/Modal';
import { useNavigate } from 'react-router-dom'; // Add this import at the top
const API_BASE_URL = 'http://localhost:5000/api';

const calculateRecurringDates = (startDate, recurrenceType, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(new Date(currentDate).toISOString().split('T')[0]);

    if (recurrenceType === 'Daily') {
      currentDate.setDate(currentDate.getDate() + 1);
    } else if (recurrenceType === 'Weekly') {
      currentDate.setDate(currentDate.getDate() + 7);
    } else if (recurrenceType === 'Monthly') {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  return dates;
};

const groupBookingsByDate = (bookings) => {
  const grouped = {};
  bookings.forEach((booking) => {
    const recurringDates =
      booking.recurring !== 'No' && booking.recurrenceEndDate 
        ? calculateRecurringDates(booking.date, booking.recurring, booking.recurrenceEndDate)
        : [booking.date];

    recurringDates.forEach((date) => {
      if (!grouped[date]) {
        grouped[date] = [];
      }
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
  const options = { year: 'numeric', month: 'long', day: '2-digit' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

const Dashboard = ({ openModal }) => {
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
  const roomMap = {};
  const categoryMap = {};
  const buildingMap = {};
  const [dashboardStats, setDashboardStats] = useState({
    totalRooms: 0,
    totalBookings: 0,
    pendingBookings: 0,
    confirmedBookings: 0,
    declinedBookings: 0,
    totalUsers: 0,
    occupancyRate: 0
  });
  
  const token = localStorage.getItem('token');
  
  const calculateDashboardStats = useCallback((bookings, rooms, users) => {
    // Count total rooms (including subrooms)
    const totalRooms = rooms.reduce((total, room) => {
      // Count the main room
      let count = 1;
      // Add subrooms if they exist
      if (room.subRooms && room.subRooms.length > 0) {
        count += room.subRooms.length;
      }
      return total + count;
    }, 0);
    
    // Count bookings by status
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
    const declinedBookings = bookings.filter(b => b.status === 'declined').length;
    const totalBookings = bookings.length;
    
    // Calculate current occupancy rate
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Get all bookings for today
    const todaysBookings = bookings.filter(booking => {
      // Check if the booking date is today
      if (booking.date === today) return true;
      
      // Check if today falls within a recurring booking range
      if (booking.recurring !== 'No' && booking.recurrenceEndDate) {
        const recurringDates = calculateRecurringDates(booking.date, booking.recurring, booking.recurrenceEndDate);
        return recurringDates.includes(today);
      }
      
      return false;
    });
    
    // Simple occupancy calculation (today's bookings / total rooms)
    const occupancyRate = totalRooms > 0 ? Math.round((todaysBookings.length / totalRooms) * 100) : 0;
    
    setDashboardStats({
      totalRooms,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      declinedBookings,
      totalUsers: users.length,
      occupancyRate
    });
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
  
    try {
      const [bookingsRes, roomsRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      
      const allRooms = roomsRes.data;
      setRooms(allRooms);
      
      const allUsers = usersRes.data;
      setUsers(allUsers);
      
      // Create a map of room names for lookup
      allRooms.forEach(room => {
        // Map roomId to roomName, category, and building
        roomMap[room.roomId] = room.roomName;
        categoryMap[room.roomId] = room.category || room.Category?.categoryName || ''; // Room Type
        buildingMap[room.roomId] = room.building || room.Building?.buildingName || ''; // Building Name
        // If you have subRooms, handle them similarly if needed
      });

      // When mapping bookings, use booking.roomId to look up values
      const enrichedBookings = bookingsRes.data.map((booking) => ({
        ...booking,
        meetingRoom: roomMap[booking.roomId] || booking.roomName || '', // Meeting Room
        category: categoryMap[booking.roomId] || booking.category || '', // Room Type
        buildingName: buildingMap[booking.roomId] || booking.building || '', // Building
      }));

      setRecentBookings(enrichedBookings);
      calculateDashboardStats(enrichedBookings, allRooms, allUsers);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token, calculateDashboardStats]);
  
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  const statCards = [
    { 
      title: 'Total Rooms', 
      value: dashboardStats.totalRooms.toString(), 
      icon: '🏢', 
      color: 'bg-blue-100' 
    },
    {
      title: 'Total Bookings',
      value: dashboardStats.totalBookings.toString(),
      icon: '📝',
      color: 'bg-green-100',
      details: [
        { label: 'Pending', value: dashboardStats.pendingBookings.toString(), color: 'text-yellow-500' },
        { label: 'Confirmed', value: dashboardStats.confirmedBookings.toString(), color: 'text-green-500' },
        { label: 'Declined', value: dashboardStats.declinedBookings.toString(), color: 'text-red-500' },
      ],
    },
    { 
      title: 'Total Users', 
      value: dashboardStats.totalUsers.toString(), 
      icon: '👥', 
      color: 'bg-yellow-100' 
    },
  ];

  const weeklyCalendarDays = generateWeeklyCalendarDays();

  const getFilteredBookings = () => {
    if (activeBookingTab === 'all') {
      return recentBookings;
    } else if (activeBookingTab === 'pending') {
      return recentBookings.filter(booking => booking.status === 'pending');
    } else if (activeBookingTab === 'approved') {
      return recentBookings.filter(booking => booking.status === 'confirmed');
    } else if (activeBookingTab === 'declined') {
      return recentBookings.filter(booking => booking.status === 'declined');
    }
    return recentBookings;
  };

  const bookingsByDate = groupBookingsByDate(recentBookings);

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
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedBookings = [...getFilteredBookings()].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;

    const valA = a[key]?.toString().toLowerCase() ?? '';
    const valB = b[key]?.toString().toLowerCase() ?? '';

    return direction === 'asc'
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  });

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div>
      <div style={{position:'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh' }}>
      <TopBar onSearch={setSearchTerm} />

        <div className="p-6 bg-gray-50 min-h-screen">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {statCards.map((card, index) => (
              <div
                key={index}
                className={`p-6 rounded-lg shadow-md ${card.color} hover:shadow-lg transition-shadow`}
              >
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
                      <span key={i} className={`${detail.color} mr-2`}>
                        {detail.value} {detail.label}
                        {i < card.details.length - 1 ? ' • ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow-md mb-8 border border-gray-200">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="font-bold text-gray-800">This Week</h2>
            </div>
            <div className="grid grid-cols-7">
              {weeklyCalendarDays.map((day, index) => (
                <div
                  key={index}
                  className="p-4 text-center border-r last:border-r-0 hover:bg-gray-50 transition relative"
                >
                  <div className="text-sm text-gray-500">{day.day}</div>
                  <div
                    className={`text-lg ${day.isToday
                      ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto'
                      : 'text-gray-800'
                      }`}
                  >
                    {day.date}
                  </div>

                  {(() => {
                          const confirmedBookings = bookingsByDate[day.fullDate]
                            ?.filter((booking) => booking.status === 'confirmed') || [];

                          if (confirmedBookings.length === 0) {
                            return (
                              <div className="text-xs text-gray-400 mt-2 italic">
                                No bookings
                              </div>
                            );
                          }

                          const visibleBookings = confirmedBookings.slice(0, 3);
                          const remainingCount = confirmedBookings.length - visibleBookings.length;

                          return (
                            <>
                              {visibleBookings.map((booking, i) => (
                                <div
                                  key={i}
                                  className="text-xs bg-blue-100 text-blue-600 rounded px-1 mt-1 truncate cursor-pointer"
                                  title={`${booking.title} (${booking.startTime} - ${booking.endTime})`}
                                  onClick={() => handleEditClick(booking)}
                                >
                                  {booking.title}
                                </div>
                              ))}

                              {remainingCount > 0 && (
                                <div className="text-xs text-blue-500 mt-1 cursor-pointer hover:underline" onClick={() => {}}>
                                  +{remainingCount} more
                                </div>
                              )}
                            </>
                          );
                        })()}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              {['All', 'Pending', 'Approved', 'Declined'].map((status) => (
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
            <div>
            <button
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      onClick={() => navigate('/admin/bookings')} // Redirect to /admin/bookings
    >
      View All
    </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {[
                    { label: 'Booking Title', key: 'title' },
                    { label: 'Name', key: 'lastName' },
                    { label: 'School', key: 'department' },
                    { label: 'Room Type', key: 'category' },
                    { label: 'Meeting Room', key: 'meetingRoom' },
                    { label: 'Building', key: 'buildingName' },
                    { label: 'Date', key: 'date' },
                    { label: 'Time', key: 'startTime' },
                    { label: 'Status', key: 'status' },
                  ].map(({ label, key }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="cursor-pointer px-4 py-2 border-b"
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
                    `${booking.title} ${booking.firstName} ${booking.lastName} ${booking.department} ${booking.roomName} ${booking.meetingRoom} ${booking.buildingId}`
                      .toLowerCase()
                      .includes(searchTerm.toLowerCase())
                  )
                  .map((booking) => {
                    const recurringDates =
                      booking.recurring !== 'No' && booking.recurrenceEndDate
                        ? calculateRecurringDates(booking.date, booking.recurring, booking.recurrenceEndDate)
                        : [booking.date];

                    return (
                      <tr key={booking._id} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-2 border-b">{booking.title}</td>
                        <td className="px-4 py-2 border-b">
                          {`${booking.lastName}, ${booking.firstName}`}
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
                            <small className="block text-gray-500 mt-1">
                              Booked by {booking.firstName} {booking.lastName}
                            </small>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="12" className="px-4 py-4 text-center text-gray-500">
                      {loading ? "Loading bookings..." : "No bookings found. Add a new booking to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Modal isOpen={isModalOpen} onClose={closeModal}>
            {selectedBooking && (
              <div>
                <h2 className="text-xl font-bold mb-4">Booking Details</h2>
                <p><strong>Title:</strong> {selectedBooking.title}</p>
                <p><strong>First Name:</strong> {selectedBooking.firstName}</p>
                <p><strong>Last Name:</strong> {selectedBooking.lastName}</p>
                <p><strong>School:</strong> {selectedBooking.department}</p>
                <p><strong>Room Type:</strong> {selectedBooking.category}</p>
                <p><strong>Meeting Room:</strong> {selectedBooking.meetingRoom}</p>
                <p><strong>Building:</strong> {selectedBooking.building}</p>
                <p><strong>Date:</strong> {formatDate(selectedBooking.date)}</p>
                <p><strong>Time:</strong> {
                  `${new Date(selectedBooking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                  ${new Date(selectedBooking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                }</p>
                <p><strong>Notes:</strong> {selectedBooking.notes}</p>
                <p><strong>Status:</strong> {selectedBooking.status}</p>
                <p><strong>Recurring:</strong> {selectedBooking.recurring}</p>
                {selectedBooking.recurring !== 'No' && selectedBooking.recurrenceEndDate && (
                  <p><strong>Recurrence End Date:</strong> {formatDate(selectedBooking.recurrenceEndDate)}</p>
                )}
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;