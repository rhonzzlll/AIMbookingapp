import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import Header from './Header';
import BookingForm from './BookingForm'; // Import the updated BookingForm component
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button"; // Fixed import
import { Checkbox } from "../../components/ui/checkbox";
import { X } from 'lucide-react';
 

const API_BASE_URL = 'http://localhost:5000/api';

export function PrivacyModal({ isOpen, onOpenChange, onConfirm }) {
  const [isAgreed, setIsAgreed] = useState(false);

  const handleConfirm = () => {
    if (isAgreed) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle>Data Privacy Confirmation</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="mt-2">
          <p className="text-sm text-muted-foreground">
            Before proceeding with your booking, please review and agree to our data privacy terms.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Your personal information will be securely stored and processed</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>We will only use your data for booking and related communication</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Your data will not be shared with third parties without consent</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>You can request data deletion at any time</span>
            </li>
          </ul>

          <div className="mt-6 flex items-start space-x-2">
            <Checkbox
 
                      id="privacy-agreement"
                      checked={isAgreed}
                      onChange={(e) => setIsAgreed(e.target.checked)}
                    />
            <label
              htmlFor="privacy-agreement"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I agree to the data privacy terms
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isAgreed}
            className={!isAgreed ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Confirm Booking
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
          bookings.map((booking, index) => {
            const formattedDate = booking.date ? format(parseISO(booking.date), 'yyyy-MM-dd') : 'Invalid date';
            return (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold">{booking.title}</h3>
                    <p className="text-sm text-gray-600">
                      {formattedDate} · {booking.startTime || 'N/A'} - {booking.endTime || 'N/A'}
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
            );
          })
        ) : (
          <p className="text-center text-gray-500 py-4">No bookings found</p>
        )}
      </div>
    </div>
  );
};

const BookingApp = () => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bookings, setBookings] = useState([]);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);

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

  const handleBookingSubmit = (newBooking) => {
    setPendingBooking(newBooking);
    setIsPrivacyModalOpen(true); // Open PrivacyModal
  };

  const handlePrivacyConfirm = async () => {
    setIsPrivacyModalOpen(false);

    if (pendingBooking) {
      try {
        const bookingWithStatus = {
          ...pendingBooking,
          status: 'pending',
        };

        const response = await fetch(`${API_BASE_URL}/bookings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(bookingWithStatus),
        });

        if (response.ok) {
          const savedBooking = await response.json();
          setBookings((prev) => [...prev, savedBooking]);
          alert('Booking submitted successfully!');
        } else {
          const errorData = await response.json();
          alert(`Error: ${errorData.message || 'Failed to create booking'}`);
        }
      } catch (error) {
        console.error('Error submitting booking:', error);
        alert('Failed to submit booking. Please try again.');
      } finally {
        setPendingBooking(null);
      }
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
  };

  return (
    <div>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
        <Header />
      </div>
      <div style={{ paddingTop: '70px' }} className="flex flex-col md:flex-row gap-6 p-6">
        <div className="w-full md:w-1/2">
          <BookingForm onBookingSubmit={handleBookingSubmit} />
        </div>
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

      {/* Privacy Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onOpenChange={setIsPrivacyModalOpen}
        onConfirm={handlePrivacyConfirm}
      />
    </div>
  );
};

export default BookingApp;