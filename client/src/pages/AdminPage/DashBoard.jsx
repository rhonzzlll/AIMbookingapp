import React, { useState } from 'react';

const Dashboard = ({ openModal }) => {
  const [activeBookingTab, setActiveBookingTab] = useState('all');

  const statCards = [
    { title: 'Total Rooms', value: '42', icon: '🏢', color: 'bg-blue-100' },
    {
      title: 'Total Bookings',
      value: '50',
      icon: '📝',
      color: 'bg-green-100',
      details: [
        { label: 'Pending', value: '15', color: 'text-yellow-500' },
        { label: 'Confirmed', value: '28', color: 'text-green-500' },
        { label: 'Declined', value: '7', color: 'text-red-500' },
      ],
    },
    { title: 'Total Users', value: '75', icon: '👥', color: 'bg-yellow-100' },
    { title: 'Current Occupancy', value: '62%', icon: '📊', color: 'bg-purple-100' },
  ];

  const calendarDays = [
    { day: 'Sun', date: 16 },
    { day: 'Mon', date: 17 },
    { day: 'Tue', date: 18, isToday: true },
    { day: 'Wed', date: 19 },
    { day: 'Thu', date: 20 },
    { day: 'Fri', date: 21 },
    { day: 'Sat', date: 22 },
  ];

  const recentBookings = [
    {
      id: 'BK001',
      title: 'Team Meeting',
      firstName: 'John',
      lastName: 'Doe',
      department: 'Engineering',
      roomType: 'Hybrid',
      meetingRoom: 'Security Bank',
      building: 'Building A',
      date: 'Mar 18, 2025',
      time: '10:00 AM - 11:30 AM',
      notes: 'Discuss project updates',
      status: 'confirmed',
      recurring: 'No',
    },
    {
      id: 'BK002',
      title: 'Client Presentation',
      firstName: 'Jane',
      lastName: 'Smith',
      department: 'Marketing',
      roomType: 'Caseroom',
      meetingRoom: 'Conference Hall',
      building: 'Building B',
      date: 'Mar 19, 2025',
      time: '2:00 PM - 4:00 PM',
      notes: 'Present Q1 results',
      status: 'pending',
      recurring: 'Yes',
    },
    {
      id: 'BK003',
      title: 'Training Session',
      firstName: 'Robert',
      lastName: 'Johnson',
      department: 'HR',
      roomType: 'Caseroom',
      meetingRoom: 'Training Room',
      building: 'Building C',
      date: 'Mar 20, 2025',
      time: '9:00 AM - 12:00 PM',
      notes: 'Onboarding new hires',
      status: 'declined',
      recurring: 'No',
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Dashboard Overview</h1>

      {/* Stats Cards */}
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

      {/* Calendar */}
      <div className="bg-white rounded-lg shadow-md mb-8 border border-gray-200">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="font-bold text-gray-800">March 2025</h2>
          <button className="text-sm text-blue-600 hover:underline">View Full Calendar</button>
        </div>
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className="p-4 text-center border-r last:border-r-0 hover:bg-gray-50 transition"
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
            </div>
          ))}
        </div>
      </div>
      {/* Filter Buttons */}
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
            className="text-sm text-blue-600 hover:underline"
            onClick={() => setActiveBookingTab('all')}
          >
            View All
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 border-b">Booking Title</th>
              <th className="px-4 py-2 border-b">First Name</th>
              <th className="px-4 py-2 border-b">Last Name</th>
              <th className="px-4 py-2 border-b">Department</th>
              <th className="px-4 py-2 border-b">Room Type</th>
              <th className="px-4 py-2 border-b">Meeting Room</th>
              <th className="px-4 py-2 border-b">Building</th>
              <th className="px-4 py-2 border-b">Date</th>
              <th className="px-4 py-2 border-b">Time</th>
              <th className="px-4 py-2 border-b">Notes</th>
              <th className="px-4 py-2 border-b">Status</th>
              <th className="px-4 py-2 border-b">Recurring</th>
              <th className="px-4 py-2 border-b">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recentBookings
              .filter((booking) =>
                activeBookingTab === 'all'
                  ? true
                  : activeBookingTab === 'approved'
                    ? booking.status === 'confirmed'
                    : activeBookingTab === 'pending'
                      ? booking.status === 'pending'
                      : booking.status === 'declined'
              )
              .map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-2 border-b">{booking.title}</td>
                  <td className="px-4 py-2 border-b">{booking.firstName}</td>
                  <td className="px-4 py-2 border-b">{booking.lastName}</td>
                  <td className="px-4 py-2 border-b">{booking.department}</td>
                  <td className="px-4 py-2 border-b">{booking.roomType}</td>
                  <td className="px-4 py-2 border-b">{booking.meetingRoom}</td>
                  <td className="px-4 py-2 border-b">{booking.building}</td>
                  <td className="px-4 py-2 border-b">{booking.date}</td>
                  <td className="px-4 py-2 border-b">{booking.time}</td>
                  <td className="px-4 py-2 border-b">{booking.notes}</td>
                  <td className="px-4 py-2 border-b">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-600'
                        : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-red-100 text-red-600'
                        }`}
                    >
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-2 border-b">{booking.recurring}</td>
                  <td className="px-4 py-2 border-b">
                    <button className="text-blue-600 hover:underline mr-2">View</button>
                    <button className="text-green-600 hover:underline">Edit</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;