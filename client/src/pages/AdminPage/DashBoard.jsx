import React, { useState } from 'react';
import TopBar from '../../components/AdminComponents/TopBar';
import axios from 'axios';
import Modal from '../../components/AdminComponents/Modal';
import { useEffect, useCallback } from 'react';

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
  const [activeBookingTab, setActiveBookingTab] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  

  const statCards = [
    { title: 'Total Rooms', value: '0', icon: '🏢', color: 'bg-blue-100' },
    {
      title: 'Total Bookings',
      value: '0',
      icon: '📝',
      color: 'bg-green-100',
      details: [
        { label: 'Pending', value: '0', color: 'text-yellow-500' },
        { label: 'Confirmed', value: '0', color: 'text-green-500' },
        { label: 'Declined', value: '0', color: 'text-red-500' },
      ],
    },
    { title: 'Total Users', value: '0', icon: '👥', color: 'bg-yellow-100' },
    { title: 'Current Occupancy', value: '0%', icon: '📊', color: 'bg-purple-100' },
  ];

  const weeklyCalendarDays = generateWeeklyCalendarDays();

  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
  
    try {
      const [bookingsRes, roomsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
  
      const allRooms = roomsRes.data.flatMap((room) => {
        const baseRoom = {
          _id: room._id,
          roomName: room.roomName,
        };
        const subRooms =
          room.subRooms?.map((sub, i) => ({
            _id: `${room._id}-sub-${i}`,
            roomName: sub.roomName,
          })) || [];
        return [baseRoom, ...subRooms];
      });
  
      const roomMap = Object.fromEntries(
        allRooms.map((r) => [r._id, r.roomName])
      );
  
      const enrichedBookings = bookingsRes.data.map((booking) => ({
        ...booking,
        meetingRoom: roomMap[booking.room] || booking.room,
      }));
  
      setRecentBookings(enrichedBookings);
    } catch (err) {
      console.error('Error fetching bookings or rooms:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);
  
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);
  

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

  const currentBookings = getFilteredBookings();
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



  return (
    <div>
      <div style={{position:'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh' }}>
      <TopBar onSearch={setSearchTerm} />

        <div className="p-6 bg-gray-50 min-h-screen">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

                  {bookingsByDate[day.fullDate]?.map((booking, i) => (
                    <div
                      key={i}
                      className="text-xs bg-blue-100 text-blue-600 rounded px-1 mt-1 truncate cursor-pointer"
                      title={`${booking.title} (${booking.time})`}
                      onClick={() => handleEditClick(booking)}
                    >
                      {booking.title}
                    </div>
                  ))}
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
          </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
              <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  {[
                    { label: 'Booking Title', key: 'title' },
                    { label: 'Name', key: 'lastName' },
                    { label: 'Department', key: 'department' },
                    { label: 'Room Type', key: 'roomType' },
                    { label: 'Meeting Room', key: 'meetingRoom' },
                    { label: 'Building', key: 'building' },
                    { label: 'Date', key: 'date' },
                    { label: 'Time', key: 'time' },
                    { label: 'Notes', key: 'notes' },
                    { label: 'Status', key: 'status' },
                    { label: 'Recurring', key: 'recurring' }
                  ].map(({ label, key }) => (
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
                {currentBookings.length > 0 ? (
              sortedBookings
                .filter(booking =>
                  `${booking.title} ${booking.firstName} ${booking.lastName} ${booking.department} ${booking.category} ${booking.meetingRoom} ${booking.building}`
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
                )
                .map((booking) => {
                  const recurringDates =
                    booking.recurring !== 'No' && booking.recurrenceEndDate
                      ? calculateRecurringDates(booking.date, booking.recurring, booking.recurrenceEndDate)
                      : [booking.date];

                  return (
                        <tr key={booking.id} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-2 border-b">{booking.title}</td>
                          <td className="px-4 py-2 border-b">
                            {`${booking.lastName}, ${booking.firstName}`}
                          </td>
                          <td className="px-4 py-2 border-b">{booking.department}</td>
                          <td className="px-4 py-2 border-b">{booking.category}</td>
                          <td className="px-4 py-2 border-b">{booking.meetingRoom}</td>
                          <td className="px-4 py-2 border-b">{booking.building}</td>
                          <td className="px-4 py-2 border-b">
                            {recurringDates.map((date, index) => (
                              <div key={index}>{formatDate(date)}</div>
                            ))}
                          </td>
                          <td className="px-4 py-2 border-b">
                            {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                            {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-2 border-b">{booking.notes}</td>
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
                          <td className="px-4 py-2 border-b">{booking.recurring}</td>
                          <td className="px-4 py-2 border-b">
                            <button
                              className="text-blue-600 hover:underline"
                              onClick={() => handleEditClick(booking)}
                            >
                              view
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="11" className="px-4 py-4 text-center text-gray-500">
                        No bookings found. Add a new booking to get started.
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
                <p><strong>Department:</strong> {selectedBooking.department}</p>
                <p><strong>Room Type:</strong> {selectedBooking.roomType}</p>
                <p><strong>Meeting Room:</strong> {selectedBooking.meetingRoom}</p>
                <p><strong>Building:</strong> {selectedBooking.building}</p>
                <p><strong>Date:</strong> {formatDate(selectedBooking.date)}</p>
                <p><strong>Time:</strong> {selectedBooking.time}</p>
                <p><strong>Notes:</strong> {selectedBooking.notes}</p>
                <p><strong>Status:</strong> {selectedBooking.status}</p>
                <p><strong>Recurring:</strong> {selectedBooking.recurring}</p>
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;