import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import Header from './Header';
import BookingForm from './BookingForm'; // Import the updated BookingForm component

const API_BASE_URL = 'http://localhost:5000/api';

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
      building: 'ACC Building',
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
      building: 'AIM Building',
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

  // Function to fetch existing bookings
  const fetchBookings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/bookings`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  // Fetch bookings when component mounts
  useEffect(() => {
    fetchBookings();
  }, []);

  const handleBookingSubmit = async (newBooking) => {
    try {
      // Add status to the booking
      const bookingWithStatus = {
        ...newBooking,
        status: 'pending',
      };

      // Send booking to the API
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` // Include auth token if needed
        },
        body: JSON.stringify(bookingWithStatus),
      });

      if (response.ok) {
        const savedBooking = await response.json();
        // Add the new booking to the state with ID from API
        setBookings(prev => [...prev, savedBooking]);
        alert('Booking submitted successfully!');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message || 'Failed to create booking'}`);
      }
    } catch (error) {
      console.error('Error submitting booking:', error);
      alert('Failed to submit booking. Please try again.');
    }
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
      
      {/* Add padding to prevent content from being hidden under fixed header */}
      <div style={{ paddingTop: '70px' }} className="flex flex-col md:flex-row gap-6 p-6">
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