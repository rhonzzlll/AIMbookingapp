import React, { useState } from 'react';

const calculateRecurringDates = (startDate, recurrenceType, endDate) => {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    dates.push(new Date(currentDate).toISOString().split('T')[0]); // Format as YYYY-MM-DD

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

const formatDate = (date) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(date).toLocaleDateString(undefined, options);
};

const Bookings = () => {
  const [activeBookingTab, setActiveBookingTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    department: '',
    roomType: '',
    meetingRoom: '',
    building: '',
    date: '',
    time: '',
    notes: '',
    recurring: 'No', // No, Daily, Weekly, Monthly
    recurrenceEndDate: '', // End date for recurrence
    status: 'pending',
  });

  const bookingsPerPage = 2;

  const [recentBookings, setRecentBookings] = useState([
    {
      id: 'BK001',
      title: 'Team Meeting',
      firstName: 'Rhonzel',
      lastName: 'Santos',
      department: 'Engineering',
      roomType: 'Hybrid',
      meetingRoom: 'Security Bank',
      building: 'ACC',
      date: 'Mar 18, 2025',
      time: '10:00 AM - 11:30 AM',
      notes: 'Discuss project updates',
      status: 'confirmed',
      recurring: 'No',
    },
    {
      id: 'BK002',
      title: 'Client Presentation',
      firstName: 'Rhonzel',
      lastName: 'Santos',
      department: 'Marketing',
      roomType: 'Caseroom',
      meetingRoom: 'Conference Hall',
      building: 'ACC',
      date: 'Mar 19, 2025',
      time: '2:00 PM - 4:00 PM',
      notes: 'Present Q1 results',
      status: 'pending',
      recurring: 'Yes',
    },
    {
      id: 'BK003',
      title: 'Training Session',
      firstName: 'Rhonzel',
      lastName: 'Santos',
      department: 'HR',
      roomType: 'Caseroom',
      meetingRoom: 'Training Room',
      building: 'AIM',
      date: 'Mar 20, 2025',
      time: '9:00 AM - 12:00 PM',
      notes: 'Onboarding new hires',
      status: 'declined',
      recurring: 'No',
    },
    {
      id: 'BK004',
      title: 'Project Kickoff',
      firstName: 'Alice',
      lastName: 'Brown',
      department: 'Engineering',
      roomType: 'Hybrid',
      meetingRoom: 'Main Hall',
      building: 'ACC',
      date: 'Mar 21, 2025',
      time: '1:00 PM - 3:00 PM',
      notes: 'Kickoff meeting for new project',
      status: 'confirmed',
      recurring: 'No',
    },
  ]);

  // Options for form selects
  const departmentOptions = ['Engineering', 'Marketing', 'HR', 'Finance', 'Sales', 'IT'];
  const roomTypeOptions = ['Hybrid', 'Caseroom', 'Conference', 'Meeting Room'];
  const buildingOptions = ['ACC', 'AIM',];
  const meetingRoomOptions = {
    'ACC': ['Security Bank', 'Lobby Room', 'Executive Suite', 'Conference Hall', 'Board Room', 'Training Center'],
    'AIM': ['Training Room', 'Main Hall', 'Event Space'], // Example for AIM
  };

  // Filter bookings based on the active tab
  const filteredBookings = recentBookings.filter((booking) =>
    activeBookingTab === 'all'
      ? true
      : activeBookingTab === 'approved'
        ? booking.status === 'confirmed'
        : activeBookingTab === 'pending'
          ? booking.status === 'pending'
          : booking.status === 'declined'
  );

  // Pagination logic
  const indexOfLastBooking = currentPage * bookingsPerPage;
  const indexOfFirstBooking = indexOfLastBooking - bookingsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstBooking, indexOfLastBooking);

  const totalPages = Math.ceil(filteredBookings.length / bookingsPerPage);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isEditModalOpen && currentBooking) {
      // Update existing booking
      const updatedBookings = recentBookings.map(booking =>
        booking.id === currentBooking.id ? { ...formData, id: currentBooking.id } : booking
      );
      setRecentBookings(updatedBookings);
      setIsEditModalOpen(false);
    } else {
      // Add new booking
      const newBooking = {
        ...formData,
        id: `BK${String(recentBookings.length + 1).padStart(3, '0')}`,
      };
      setRecentBookings([...recentBookings, newBooking]);
      setIsAddModalOpen(false);
    }

    // Reset form
    setFormData({
      title: '',
      firstName: '',
      lastName: '',
      department: '',
      roomType: '',
      meetingRoom: '',
      building: '',
      date: '',
      time: '',
      notes: '',
      recurring: 'No', // No, Daily, Weekly, Monthly
      recurrenceEndDate: '', // End date for recurrence
      status: 'pending',
    });
    setCurrentBooking(null);
  };

  const handleEditClick = (booking) => {
    setCurrentBooking(booking);
    setFormData({ ...booking });
    setIsEditModalOpen(true);
  };

  const handleAddNewClick = () => {
    setIsAddModalOpen(true);
    setFormData({
      title: '',
      firstName: '',
      lastName: '',
      department: '',
      roomType: '',
      meetingRoom: '',
      building: '',
      date: '',
      time: '',
      notes: '',
      recurring: 'No', // No, Daily, Weekly, Monthly
      recurrenceEndDate: '', // End date for recurrence
      status: 'pending',
    });
  };

  const BookingForm = ({ isEdit }) => {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              required
              placeholder="Enter department"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
            <select
              name="roomType"
              value={formData.roomType}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Room Type</option>
              {roomTypeOptions.map(type => (
                <option key={type} value={type}>{type}</option>
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
              {buildingOptions.map(building => (
                <option key={building} value={building}>{building}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Room</label>
            <select
              name="meetingRoom"
              value={formData.meetingRoom}
              onChange={handleInputChange}
              required
              disabled={!formData.building}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Meeting Room</option>
              {formData.building && meetingRoomOptions[formData.building]?.map(room => (
                <option key={room} value={room}>{room}</option>
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input
              type="text"
              name="time"
              value={formData.time}
              onChange={handleInputChange}
              placeholder="e.g. 10:00 AM - 11:30 AM"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
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
            value={formData.notes}
            onChange={handleInputChange}
            rows="3"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setIsAddModalOpen(false);
              setIsEditModalOpen(false);
              setCurrentBooking(null);
            }}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {isEdit ? 'Update Booking' : 'Create Booking'}
          </button>
        </div>
      </form>
    );
  };

  const Modal = ({ isOpen, title, children }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-screen overflow-y-auto">
          <h3 className="text-xl font-bold mb-4">{title}</h3>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
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
              <button
                key={status}
                className={`px-4 py-2 rounded-lg font-medium transition ${activeBookingTab === status.toLowerCase()
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                onClick={() => {
                  setActiveBookingTab(status.toLowerCase());
                  setCurrentPage(1); // Reset to the first page when switching tabs
                }}
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
              {currentBookings.length > 0 ? (
                currentBookings.map((booking) => {
                  const recurringDates =
                    booking.recurring !== 'No' && booking.recurrenceEndDate
                      ? calculateRecurringDates(booking.date, booking.recurring, booking.recurrenceEndDate)
                      : [booking.date];

                  return (
                    <tr key={booking.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-2 border-b">{booking.title}</td>
                      <td className="px-4 py-2 border-b">{booking.department}</td>
                      <td className="px-4 py-2 border-b">{booking.roomType}</td>
                      <td className="px-4 py-2 border-b">{booking.meetingRoom}</td>
                      <td className="px-4 py-2 border-b">{booking.building}</td>
                      <td className="px-4 py-2 border-b">
                        {recurringDates.map((date, index) => (
                          <div key={index}>{formatDate(date)}</div>
                        ))}
                      </td>
                      <td className="px-4 py-2 border-b">{booking.time}</td>
                      <td className="px-4 py-2 border-b">{booking.notes}</td>
                      <td className="px-4 py-2 border-b">
                        <div>
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
                          <small className="block text-gray-500 mt-1">Booked by {booking.firstName} {booking.lastName}</small>
                        </div>
                      </td>
                      <td className="px-4 py-2 border-b">{booking.recurring}</td>
                      <td className="px-4 py-2 border-b">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => handleEditClick(booking)}
                        >
                          Edit
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

        {/* Pagination Controls */}
        {filteredBookings.length > 0 && (
          <div className="flex justify-between items-center mt-4">
            <button
              className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === 1 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white'
                }`}
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="text-gray-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              className={`px-4 py-2 rounded-lg font-medium transition ${currentPage === totalPages ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white'
                }`}
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
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
    </div>
  );
};

export default Bookings;