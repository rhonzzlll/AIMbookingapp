import React, { useState } from 'react';

const Bookings = () => {
  const [activeBookingTab, setActiveBookingTab] = useState('all');

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
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Bookings</h2>

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

export default Bookings;