import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import Header from './Header';
import BookingForm from './BookingForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { X, AlertCircle } from 'lucide-react';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import CancelBookingConfirmation from './modals/CancelBookingConfirmation';
 
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
    // Use the same time options as in BookingForm for consistency
    const timeOptions = [
      '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
      '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
      '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
      '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
    ];
    return timeOptions;
  };

  const getBookingsForTimeSlot = (timeSlot) => {
    return bookings.filter(
      (booking) => {
        return booking.date === selectedDate && 
               booking.startTime <= timeSlot && 
               booking.endTime > timeSlot;
      }
    );
  };

  const timeSlots = generateTimeSlots();
  const formattedDate = selectedDate ? 
    (selectedDate instanceof Date ? format(selectedDate, 'MMMM dd, yyyy') : 
    format(parseISO(selectedDate), 'MMMM dd, yyyy')) : 'Select a date';

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">{formattedDate}</h2>
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

const MyBookings = ({ bookings, onCancelBooking }) => {
  const [activeTab, setActiveTab] = useState('upcoming');
  
  const filteredBookings = useMemo(() => {
    const now = new Date();
    
    if (activeTab === 'upcoming') {
      return bookings.filter(booking => {
        // Handle booking.date as string or Date
        const bookingDate = typeof booking.date === 'string' ? 
          new Date(booking.date) : booking.date;
        return bookingDate >= now;
      });
    } else if (activeTab === 'past') {
      return bookings.filter(booking => {
        const bookingDate = typeof booking.date === 'string' ? 
          new Date(booking.date) : booking.date;
        return bookingDate < now;
      });
    } else {
      return bookings;
    }
  }, [bookings, activeTab]);

  // Handler for booking cancellation
  const handleCancelBooking = (bookingId) => {
    if (typeof onCancelBooking === 'function') {
      onCancelBooking(bookingId);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">My Bookings</h2>
        <div className="flex rounded-lg overflow-hidden border">
          <button
            className={`px-4 py-1 text-sm ${activeTab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            className={`px-4 py-1 text-sm ${activeTab === 'past' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => setActiveTab('past')}
          >
            Past
          </button>
          <button
            className={`px-4 py-1 text-sm ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
            onClick={() => setActiveTab('all')}
          >
            All
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredBookings.length > 0 ? (
          filteredBookings.map((booking, index) => {
            // Handle date formatting safely
            const formattedDate = booking.date ? 
              (typeof booking.date === 'string' ? 
                format(parseISO(booking.date), 'yyyy-MM-dd') :
                format(booking.date, 'yyyy-MM-dd')) : 
              'Invalid date';
              
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
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        booking.status === 'Confirmed'
                          ? 'bg-green-100 text-green-600'
                          : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-red-100 text-red-600'
                      }`}
                    >
                      {booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Unknown'}
                    </span>
                    {activeTab === 'upcoming' && (
                      <button 
                        onClick={() => handleCancelBooking(booking._id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <AlertCircle size={32} className="mx-auto" />
            </div>
            <p className="text-gray-500">No bookings found</p>
            <button className="mt-4 text-blue-600 text-sm font-medium hover:underline">
              Book a room now
            </button>
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

  // Fetch bookings from backend
  const fetchBookings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch bookings:', response.statusText);
        return;
      }
      
      const data = await response.json();
      setBookings(data);
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
      // Get user ID from localStorage
      const userId = localStorage.getItem('_id');
      const token = localStorage.getItem('token');

      // The booking payload is already complete from BookingForm
      const bookingPayload = {
        ...pendingBooking,
        userId: userId,
      };

      // Send the booking request to the server
      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });
  
      // Skip error handling for required fields
      const savedBooking = await response.json();
  
      // Update local bookings list with the new booking
      setBookings((prev) => [...prev, savedBooking]);
      setPendingBooking(null);
  
      // Show confirmation modal
      setIsConfirmationModalOpen(true);
  
      // Refresh bookings to ensure we have the latest data
      fetchBookings();
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

  return (
    <div className="min-h-screen bg-gray-50">
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
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/2">
            <BookingForm 
              onBookingSubmit={handleBookingSubmit} 
            />
          </div>
          
          <div className="w-full lg:w-1/2">
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              bookings={bookings}
            />
            <DaySchedule 
              selectedDate={selectedDate} 
              bookings={bookings} 
            />
            <MyBookings 
              bookings={bookings} 
              onCancelBooking={handleCancelBooking}
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