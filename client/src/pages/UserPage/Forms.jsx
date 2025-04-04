import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import Header from './Header';

const BookingForm = ({ onBookingSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    building: '',  // Fixed syntax error
    roomType: '',  // Added roomType field
    room: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    department: '',
    isRecurring: false,
    recurrenceType: '',
    recurrenceDays: [],
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleRecurrenceDaysChange = (day) => {
    setFormData((prevFormData) => {
      const { recurrenceDays } = prevFormData;
      if (recurrenceDays.includes(day)) {
        return {
          ...prevFormData,
          recurrenceDays: recurrenceDays.filter((d) => d !== day)
        };
      } else {
        return {
          ...prevFormData,
          recurrenceDays: [...recurrenceDays, day]
        };
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Booking submitted:', formData);
    onBookingSubmit(formData);
    alert('Booking submitted successfully!');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Booking</h2>
      <form onSubmit={handleSubmit}>
        {/* Booking Title */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Booking Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter a title for your booking"
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* First Name and Last Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="Enter your first name"
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Enter your last name"
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Email */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email address"
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Building Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Building <span className="text-red-500">*</span>
          </label>
          <select
            name="building"
            value={formData.building}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Building</option>
            <option value="ACC">ACC</option>
            <option value="AIM">AIM</option>
          </select>
        </div>

        {/* Room Type */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Room Type <span className="text-red-500">*</span>
          </label>
          <select
            name="roomType"
            value={formData.roomType}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Room Type</option>
            <option value="Conference">Conference Room</option>
            <option value="Meeting">Meeting Room</option>
            <option value="Board">Board Room</option>
            <option value="Training">Training Room</option>
          </select>
        </div>

        {/* Room Selection */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">
            Room Selection <span className="text-red-500">*</span>
          </label>
          <select
            name="room"
            value={formData.room}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select Room</option>
            <option value="Conference Room A">Conference Room A</option>
            <option value="Meeting Room 1">Meeting Room 1</option>
            <option value="Board Room">Board Room</option>
            <option value="Training Room">Training Room</option>
          </select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Department */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Department</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleChange}
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select department</option>
            <option value="HR">HR</option>
            <option value="Finance">Finance</option>
            <option value="Marketing">Marketing</option>
            <option value="IT">IT</option>
            <option value="Operations">Operations</option>
          </select>
        </div>

        {/* Recurring Booking */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Recurring Booking</label>
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="isRecurring"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="isRecurring" className="text-gray-700">
              Make this a recurring booking
            </label>
          </div>

          {formData.isRecurring && (
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">Recurrence Type</label>
              <select
                name="recurrenceType"
                value={formData.recurrenceType}
                onChange={handleChange}
                className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select recurrence type</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="yearly">Yearly</option>
              </select>

              {formData.recurrenceType === 'weekly' && (
                <div className="mt-4">
                  <label className="block text-gray-700 font-medium mb-2">Select Days</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <label key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          value={day}
                          checked={formData.recurrenceDays.includes(day)}
                          onChange={() => handleRecurrenceDaysChange(day)}
                          className="mr-2"
                        />
                        {day}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Additional Notes */}
        <div className="mb-6">
          <label className="block text-gray-700 font-medium mb-2">Special Instructions </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Any special requirements or information..."
            rows="4"
            className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Submit Booking
          </button>
        </div>
      </form>
    </div>
  );
};

const Calendar = ({ selectedDate, onDateSelect, bookings }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const generateDays = () => {
    const days = [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      days.push({ day: '', date: null });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        day: i,
        date: format(date, 'yyyy-MM-dd'),
        hasBookings: bookings.some((booking) => booking.date === format(date, 'yyyy-MM-dd')),
      });
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100">
          ◀
        </button>
        <h2 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100">
          ▶
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-medium text-gray-500 mb-2">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {generateDays().map((day, index) => (
          <div
            key={index}
            onClick={() => day.date && onDateSelect(day.date)}
            className={`h-12 p-1 border ${
              day.date === selectedDate ? 'bg-blue-100 border-blue-500' : 'border-gray-200'
            } ${day.hasBookings ? 'relative' : ''} ${
              day.date ? 'cursor-pointer hover:bg-gray-100' : ''
            }`}
          >
            <div className="text-sm">{day.day}</div>
            {day.hasBookings && (
              <div className="absolute bottom-1 right-1 w-2 h-2 bg-blue-600 rounded-full"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const DaySchedule = ({ selectedDate, bookings }) => {
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 20; hour++) {  // Business hours: 8 AM to 8 PM
      for (let min = 0; min < 60; min += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const getBookingsForTimeSlot = (timeSlot) => {
    return bookings.filter(
      (booking) => booking.date === selectedDate && booking.startTime <= timeSlot && booking.endTime > timeSlot
    );
  };

  const timeSlots = generateTimeSlots();
  const formattedDate = selectedDate ? format(parseISO(selectedDate), 'MMMM dd, yyyy') : '';

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">{formattedDate || 'Select a date'}</h2>
      <div className="overflow-y-auto max-h-96">
        {timeSlots.map((timeSlot, index) => {
          const slotBookings = getBookingsForTimeSlot(timeSlot);
          return (
            <div key={index} className="flex py-2 border-b last:border-b-0">
              <div className="w-16 text-gray-500 font-medium">{timeSlot}</div>
              <div className="flex-1">
                {slotBookings.map((booking, idx) => (
                  <div
                    key={idx}
                    className="bg-blue-500 text-white p-2 rounded mb-1"
                  >
                    {booking.title} - {booking.room}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MyBookings = ({ bookings }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">My Bookings</h2>
      <div className="space-y-4">
        {bookings.length > 0 ? (
          bookings.map((booking, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold">{booking.title}</h3>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(booking.date), 'yyyy-MM-dd')} · {booking.startTime} -{' '}
                    {booking.endTime}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Booked by: {booking.firstName} {booking.lastName}
                  </p>
                  {booking.building && (
                    <p className="text-xs text-gray-500">
                      Location: {booking.building}, {booking.room}
                    </p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    booking.status === 'approved'
                      ? 'bg-green-100 text-green-600'
                      : booking.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-red-100 text-red-600'
                  }`}
                >
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 py-4">No bookings found</p>
        )}
      </div>
    </div>
  );
};

const BookingApp = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookings, setBookings] = useState([
    {
      id: 1,
      title: 'Team Meeting',
      firstName: 'Rhonzel',
      lastName: 'Santos',
      email: 'rasantos@aim.edu',
      building: 'ACC',
      room: 'SGV HALL',
      date: '2025-04-05',
      startTime: '10:00',
      endTime: '11:30',
      department: 'Marketing',
      isRecurring: false,
      notes: '',
      status: 'approved',
    },
    {
      id: 2,
      title: 'Project Review',
      firstName: 'Rhonzel',
      lastName: 'Santos',
      email: 'rasantos@aim.edu',
      building: 'AIM',
      room: 'Meeting Room 1',
      date: '2025-04-20',
      startTime: '10:00',
      endTime: '11:00',
      department: 'IT',
      isRecurring: false,
      notes: '',
      status: 'pending',
    },
  ]);

  const handleBookingSubmit = (newBooking) => {
    const bookingWithId = {
      ...newBooking,
      id: bookings.length + 1,
      status: 'pending',
    };
    setBookings([...bookings, bookingWithId]);
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  return (
    <div>
    {/* Ensure the Header spans the full width */}
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
      <Header />
    </div>
      






      <div className="flex flex-col md:flex-row gap-6 p-6">
        {/* Left Column: Booking Form */}
        <div className="w-full md:w-1/2">
          <BookingForm onBookingSubmit={handleBookingSubmit} />
        </div>

        {/* Right Column: Calendar, DaySchedule, and MyBookings */}
        <div className="w-full md:w-1/2">
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            bookings={bookings}
          />
          <DaySchedule selectedDate={selectedDate} bookings={bookings} />
          <MyBookings bookings={bookings} />
        </div>
      </div>
    </div>
  );
};

export default BookingApp;