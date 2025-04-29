import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import Header from './Header';
import BookingForm from './BookingForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { X, AlertCircle } from 'lucide-react';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import PrivacyModal from '../../components/ui/PrivacyModal';
import CancelBookingConfirmation from './modals/CancelBookingConfirmation';
import { parse, add } from 'date-fns'; // Add this at the top if not already imported

 
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
      const formattedDate = format(date, 'yyyy-MM-dd');
      days.push({
        day: i,
        date: formattedDate,
        hasBookings: bookings.some((booking) => booking.date === formattedDate),
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
    <div className="relative bg-white rounded-lg shadow-md p-4">
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
  const [roomMap, setRoomMap] = useState({});
  const generateTimeSlots = () => {
    const slots = [];
    // Use the same time options as in BookingForm for consistency
  };

  const getBookingsForTimeSlot = (timeSlot) => {
    return bookings.filter((booking) => {
      if (booking.date !== selectedDate) return false;
  
      const bookingStart = parseISO(booking.startTime);
      const bookingEnd = parseISO(booking.endTime);
      const slotTime = parse(timeSlot, 'h:mm a', new Date(selectedDate));
  
      return bookingStart <= slotTime && slotTime < bookingEnd;
    });
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    try {
      // Handle ISO date strings
      if (timeString.includes('T') || timeString.includes('Z')) {
        const date = new Date(timeString);
        if (isNaN(date)) return '';
        return format(date, 'h:mm a');
      }

      // Handle 24-hour format (HH:MM)
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return format(date, 'h:mm a');
      }
      
      return timeString; // Return as is if format is unknown
    } catch (error) {
      console.error('Time formatting error:', error);
      return timeString;
    }
  };

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/rooms`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
  
        if (!response.ok) {
          console.error('Failed to fetch rooms:', response.statusText);
          return;
        }
  
        const rooms = await response.json();
  
        const map = {};
        rooms.forEach(room => {
          map[room._id] = room.roomName;
          if (room.subRooms) {
            room.subRooms.forEach((sub, idx) => {
              map[`${room._id}-sub-${idx}`] = sub.roomName;
            });
          }
        });
  
        setRoomMap(map);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };
  
    fetchRooms();
  }, []);

  const timeSlots = generateTimeSlots();
  const formattedDate = selectedDate ? 
    (selectedDate instanceof Date ? format(selectedDate, 'MMMM dd, yyyy') : 
    format(parseISO(selectedDate), 'MMMM dd, yyyy')) : 'Select a date';

  return (
    <div className="relative bg-white rounded-lg shadow-md p-4 mt-4">
        <h2 className="text-xl font-bold mb-4">
          Confirmed bookings for {formattedDate}
        </h2>
      <div className="overflow-y-auto max-h-96">
        {bookings && bookings.length > 0 ? (
          bookings
            .sort((a, b) => a.startTime.localeCompare(b.startTime)) // sort by time
            .map((booking, index) => (
              <div
                key={index}
                className="bg-blue-100 text-gray-800 rounded-md p-4 mb-4 shadow"
              >
                <div className="font-semibold text-lg">
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                </div>
                <div className="text-sm mt-1">
                  Name: {booking.firstName} {booking.lastName}
                </div>
                <div className="text-sm">
                Room: { booking.roomName || 'Unknown Room' }
                </div>
              </div>
            ))
        ) : (
          <div className="text-center text-gray-500 py-10">
            No bookings for this day.
          </div>
        )}
      </div>
    </div>
  );
};

const BookingApp = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookings, setBookings] = useState([]);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [bookingError, setBookingError] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);

  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const [bookingRes, roomRes] = await Promise.all([
        fetch(`${API_BASE_URL}/bookings`, {
          headers: { 'Authorization': `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/rooms`, {
          headers: { 'Authorization': `Bearer ${token}` },
        })
      ]);
  
      if (!bookingRes.ok || !roomRes.ok) {
        throw new Error('Failed to fetch bookings or rooms');
      }
  
      const bookings = await bookingRes.json();
      const rooms = await roomRes.json();
  
      const roomMap = {};
      rooms.forEach(room => {
        roomMap[room._id] = room.roomName;
        room.subRooms?.forEach((sub, idx) => {
          roomMap[`${room._id}-sub-${idx}`] = sub.roomName;
        });
      });
  
      const processed = bookings.map(b => ({
        ...b,
        roomName: roomMap[b.room] || b.room
      }));
  
      setBookings(processed);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };  

  // Fetch bookings when component mounts
  useEffect(() => {
    fetchBookings();
  }, []);

  // Triggered when booking is submitted from form
  const handleBookingSubmit = (newBooking) => {
    // Store the booking data which will be processed after privacy confirmation
    setPendingBooking(newBooking);
    setIsPrivacyModalOpen(true);
  };

const handlePrivacyConfirm = async () => {
  setIsPrivacyModalOpen(false);
  setBookingError(null);

  if (!pendingBooking) return;

  try {
    const userId = localStorage.getItem('_id');
    const token = localStorage.getItem('token');

    const bookingPayload = {
      ...pendingBooking,
      userId: userId,
    };

    const response = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(bookingPayload),
    });

    await response.json(); // No need to manually push into setBookings

    setPendingBooking(null);
    setIsConfirmationModalOpen(true);

    // ✅ Wait for server to give back full and clean booking data (with populated rooms)
    await fetchBookings(); // Ensure fresh and full booking data is loaded
  } catch (error) {
    console.error('Error submitting booking:', error);
  }
};

  
  // For date picker or calendar input
  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  // Handle booking cancellation
  const handleCancelBooking = (booking) => {
    setBookingToCancel(booking);
    setIsCancelModalOpen(true);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel?._id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingToCancel._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }

      // Remove the booking from local state
      setBookings((prev) => prev.filter((booking) => booking._id !== bookingToCancel._id));
      setIsCancelModalOpen(false);
      setBookingToCancel(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error.message}`);
    }
  };

  const confirmedBookings = useMemo(() => {
    return bookings.filter(b => b.status?.toLowerCase() === 'confirmed');
  }, [bookings]);
  
  const bookingsForSelectedDate = useMemo(() => {
    const formattedSelectedDate = format(
      typeof selectedDate === 'string' ? parseISO(selectedDate) : selectedDate,
      'yyyy-MM-dd'
    );
  
    return bookings.filter(
      (booking) =>
        format(parseISO(booking.date), 'yyyy-MM-dd') === formattedSelectedDate &&
        booking.status?.toLowerCase() === 'confirmed'
    );
  }, [bookings, selectedDate]);  

  return (
    <div className="relative min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>
      
      <div className="pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Error display */}
        {bookingError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
            {bookingError}
            <button 
              className="ml-2 text-red-800 font-bold"
              onClick={() => setBookingError(null)}
            >
              ×
            </button>
          </div>
        )}
        
        <div className="relative flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/2">
            <BookingForm 
              onBookingSubmit={handleBookingSubmit} 
            />
          </div>
          
          <div className="w-full lg:w-1/2">
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              bookings={confirmedBookings}
            />
            <DaySchedule 
              selectedDate={selectedDate} 
              bookings={bookingsForSelectedDate} 
            />
          </div>
        </div>
      </div>

      {/* Privacy Confirmation Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onOpenChange={setIsPrivacyModalOpen}
        onConfirm={handlePrivacyConfirm}
      />

      {/* Booking Success Modal */}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        onOpenChange={setIsConfirmationModalOpen}
        title="Booking Confirmed"
        description="Your booking has been successfully submitted. You will receive a confirmation email shortly."
        onConfirm={() => setIsConfirmationModalOpen(false)}
      />

      {/* Cancel Booking Confirmation Modal */}
      {isCancelModalOpen && (
        <CancelBookingConfirmation
          booking={bookingToCancel}
          onConfirm={confirmCancelBooking}
          onCancel={() => setIsCancelModalOpen(false)}
        />
      )}
    </div>
  );
};

export default BookingApp;