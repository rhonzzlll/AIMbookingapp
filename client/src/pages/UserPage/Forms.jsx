import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isToday, isBefore, isAfter, parse, set, addDays, addWeeks, differenceInDays, differenceInWeeks } from 'date-fns';import Header from './Header';
import BookingForm from './BookingForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
import { X, AlertCircle } from 'lucide-react';
import ConfirmationModal from '../../components/ui/ConfirmationModal';
import PrivacyModal from '../../components/ui/PrivacyModal';
import CancelBookingConfirmation from './modals/CancelBookingConfirmation';
import { useLocation } from 'react-router-dom';
 
const API_BASE_URL = import.meta.env.VITE_API_URI;

// Helper function to expand recurring bookings
const expandRecurringBookings = (bookings) => {
  const expandedBookings = [];
  
  bookings.forEach(booking => {
    if (booking.isRecurring && booking.recurrenceEndDate && booking.recurrencePattern) {
      const startDate = parseISO(booking.date);
      const endDate = parseISO(booking.recurrenceEndDate);
      
      // Add the original booking
      expandedBookings.push(booking);
      
      let currentDate = startDate;
      let increment = 1; // Default to daily
      
      // Determine increment based on recurrence pattern
      if (booking.recurrencePattern.toLowerCase() === 'weekly') {
        increment = 7;
      } else if (booking.recurrencePattern.toLowerCase() === 'daily') {
        increment = 1;
      }
      
      // Generate recurring dates
      while (true) {
        currentDate = addDays(currentDate, increment);
        
        // Stop if we've exceeded the end date
        if (currentDate > endDate) break;
        
        // Create a new booking instance for this recurring date
        const recurringBooking = {
          ...booking,
          // Generate a unique booking ID for each recurring instance
          bookingId: `${booking.bookingId}-recurring-${format(currentDate, 'yyyy-MM-dd')}`,
          date: format(currentDate, 'yyyy-MM-dd'),
          isRecurringInstance: true, // Flag to identify generated instances
          originalBookingId: booking.bookingId // Reference to original booking
        };
        
        expandedBookings.push(recurringBooking);
      }
    } else {
      // Non-recurring booking, add as-is
      expandedBookings.push(booking);
    }
  });
  
  return expandedBookings;
};

// Helper function to get available intervals (fixed buffer and local time)
const getAvailableIntervals = (bookings, businessHours) => {
  const buffer = 30; // <-- Change from 0 to 30
  // Helper: convert to minutes (local time)
  const toMinutesFromISO = iso => {
    // Handles "HH:mm:ss" or "HH:mm"
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(iso)) {
      const [h, m] = iso.split(':');
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    }
    // Handles full ISO string
    const d = new Date(iso);
    if (!isNaN(d)) {
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    }
    return NaN;
  };
  const toMinutes = str => {
    const [h, m] = str.split(":").map(Number);
    return h * 60 + m;
  };
  if (!bookings || bookings.length === 0) {
    return [{
      start: toMinutes(businessHours.start),
      end: toMinutes(businessHours.end),
    }];
  }
  const busy = bookings
    .map(b => ({
      start: Math.max(toMinutesFromISO(b.startTime) - buffer, toMinutes(businessHours.start)),
      end: Math.min(toMinutesFromISO(b.endTime) + buffer, toMinutes(businessHours.end)),
    }))
    .sort((a, b) => a.start - b.start);

  // Debug log
  console.log('Busy periods:', busy);

  const slots = [];
  let current = toMinutes(businessHours.start);
  for (const period of busy) {
    if (period.start > current) {
      slots.push({ start: current, end: period.start });
    }
    current = Math.max(current, period.end);
  }
  if (current < toMinutes(businessHours.end)) {
    slots.push({ start: current, end: toMinutes(businessHours.end) });
  }
  // Debug log
  console.log('Available time slots:', slots);

  return slots.filter(slot => slot.end > slot.start);
};

const Calendar = ({ selectedDate, onDateSelect, bookings }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Expand recurring bookings for calendar display
  const expandedBookings = useMemo(() => {
    return expandRecurringBookings(bookings);
  }, [bookings]);

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
      
      // Check for bookings on this date (including recurring instances)
      const dayBookings = expandedBookings.filter((booking) => booking.date === formattedDate);
      const hasRegularBookings = dayBookings.some(b => !b.isRecurring);
      const hasRecurringBookings = dayBookings.some(b => b.isRecurring || b.isRecurringInstance);
      
      days.push({
        day: i,
        date: formattedDate,
        hasBookings: dayBookings.length > 0,
        hasRegularBookings,
        hasRecurringBookings,
        bookingCount: dayBookings.length
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
            className={`h-12 p-1 border relative ${
              day.date === selectedDate ? 'bg-blue-100 border-blue-500' : 'border-gray-200'
            } ${day.date ? 'cursor-pointer hover:bg-gray-100' : ''}`}
          >
            <div className="text-sm">{day.day}</div>
            {day.hasBookings && (
              <div className="absolute bottom-1 right-1 flex gap-1">
                {day.hasRegularBookings && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full" title="Regular booking"></div>
                )}
                {day.hasRecurringBookings && (
                  <div className="w-2 h-2 bg-purple-600 rounded-full" title="Recurring booking"></div>
                )}
                {day.bookingCount > 1 && (
                  <div className="text-xs text-gray-600 font-bold">{day.bookingCount}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          <span>Regular</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
          <span>Recurring</span>
        </div>
      </div>
    </div>
  );
};

const AvailableRooms = ({ rooms, bookings, selectedDate, fromTime, toTime }) => {
  // Utility to check if a room is free for the given range
  const isRoomAvailable = (roomId) => {
  // Get bookings for this room and date
  const roomBookings = bookings.filter(
    booking =>
      booking.roomId === roomId &&
      booking.date === selectedDate &&
      ['confirmed', 'pending'].includes((booking.status || '').toLowerCase())
  );
  // Get available intervals for this room
  const intervals = getAvailableIntervals(roomBookings, { start: "08:00", end: "22:00" });
  const toMinutes = (str) => {
    const [h, m] = str.split(":").map(Number);
    return h * 60 + m;
  };
  const desiredStart = toMinutes(fromTime);
  const desiredEnd = toMinutes(toTime);

  // Check if any interval fully contains the desired range
  return intervals.some(interval => desiredStart >= interval.start && desiredEnd <= interval.end);
};

  // Memoize for speed
  const availableRooms = useMemo(
    () =>
      rooms && fromTime && toTime && selectedDate
        ? rooms.filter(room => isRoomAvailable(room.roomId))
        : [],
    [rooms, bookings, selectedDate, fromTime, toTime]
  );

  // UI
  if (!selectedDate || !fromTime || !toTime) {
    return (
      <div className="mt-2 text-gray-500">Select date, start, and end time to view available rooms.</div>
    );
  }

  return (
    <div className="relative bg-white rounded-lg shadow-md p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">
        Available Rooms from <span className="text-blue-600">{fromTime}</span> to <span className="text-blue-600">{toTime}</span>
      </h2>
      {availableRooms.length > 0 ? (
        <ul className="space-y-2">
          {availableRooms.map(room => (
            <li key={room.roomId} className="p-3 bg-green-50 rounded border border-green-200 flex justify-between items-center">
              <span className="font-medium">{room.roomName}</span>
              {room.capacity && (
                <span className="ml-4 text-xs text-gray-500">Capacity: {room.capacity}</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-500 py-6 text-center">No available rooms for this time range.</div>
      )}
    </div>
  );
};


const AvailableTime = ({
  selectedDate,
  bookings,
  businessHours = { start: "08:00", end: "22:00" },
  roomName,
}) => {
  // Helper: convert ISO string to minutes (local time)
  const toMinutesFromISO = iso => {
    // Handles "HH:mm:ss" or "HH:mm"
    if (/^\d{2}:\d{2}(:\d{2})?$/.test(iso)) {
      const [h, m] = iso.split(':');
      return parseInt(h, 10) * 60 + parseInt(m, 10);
    }
    // Handles full ISO string
    const d = new Date(iso);
    if (!isNaN(d)) {
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    }
    return NaN;
  };
  // ...use this everywhere you convert ISO to minutes...

  // Helper: convert "08:00" string to minutes
  const toMinutes = (timeString) => {
    const [h, m] = timeString.split(":").map(Number);
    return h * 60 + m;
  };

  // Helper: format minutes (from midnight) as "h:mm AM/PM"
  const formatMinutesToAMPM = (minutes) => {
    let hour = Math.floor(minutes / 60);
    let minute = minutes % 60;
    let suffix = "AM";
    if (hour === 0) hour = 12;
    else if (hour === 12) suffix = "PM";
    else if (hour > 12) {
      hour -= 12;
      suffix = "PM";
    }
    return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
  };

  const availableTimeSlots = useMemo(() => {
    const buffer = 30; // <-- Change from 0 to 30

    // Expand recurring bookings before processing
    const expandedBookings = expandRecurringBookings(bookings);

    // No bookings? Full business hours available
    if (!expandedBookings || expandedBookings.length === 0) {
      return [
        {
          start: toMinutes(businessHours.start),
          end: toMinutes(businessHours.end),
        },
      ];
    }
    
    const busy = expandedBookings
      .map((b) => ({
        start: Math.max(toMinutesFromISO(b.startTime) - buffer, toMinutes(businessHours.start)),
        end: Math.min(toMinutesFromISO(b.endTime) + buffer, toMinutes(businessHours.end)),
      }))
      .sort((a, b) => a.start - b.start);

    // Debug log
    console.log('Busy periods:', busy);

    // Calculate available slots as gaps between busy slots
    const slots = [];
    let current = toMinutes(businessHours.start);

    for (const period of busy) {
      if (period.start > current) {
        slots.push({ start: current, end: period.start });
      }
      current = Math.max(current, period.end);
    }
    if (current < toMinutes(businessHours.end)) {
      slots.push({ start: current, end: toMinutes(businessHours.end) });
    }

    // Debug log
    console.log('Available time slots:', slots);

    // Only show slots longer than 0 minutes and not in the past for today
    return slots
      .map(slot => {
        if (!selectedDate) return slot;
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const isTodaySelected = (format(parseISO(selectedDate), 'yyyy-MM-dd') === todayStr);
        if (!isTodaySelected) return slot;

        // Current time in minutes, and the next future half hour
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const nextHalfHour = currentMinutes % 30 === 0
          ? currentMinutes
          : currentMinutes + (30 - (currentMinutes % 30));

        // If the slot is entirely in the past, skip
        if (slot.end <= nextHalfHour) return null;

        // If the slot starts before nextHalfHour but ends after, truncate
        if (slot.start < nextHalfHour && slot.end > nextHalfHour) {
          return { start: nextHalfHour, end: slot.end };
        }

        // If the slot starts after nextHalfHour, keep as is
        if (slot.start >= nextHalfHour) return slot;

        // Otherwise, skip
        return null;
      })
      .filter(slot => slot && slot.end > slot.start);
  }, [bookings, businessHours, selectedDate]);

  // Render:
  const formattedDate = selectedDate
    ? format(parseISO(selectedDate), "MMMM dd, yyyy")
    : "Select a date";

  return (
    <div className="relative bg-white rounded-lg shadow-md p-4 mt-4">
      <h2 className="text-xl font-bold mb-4">
        Available time for {roomName ? `"${roomName}"` : "room"} on {formattedDate}
      </h2>
      <div className="overflow-y-auto max-h-96">
        {availableTimeSlots.length > 0 ? (
          availableTimeSlots.map((slot, index) => (
            <div
              key={index}
              className="bg-green-100 text-gray-800 rounded-md p-4 mb-4 shadow"
            >
              <div className="font-semibold text-lg">
                {formatMinutesToAMPM(slot.start)} - {formatMinutesToAMPM(slot.end)}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-10">
            No available time slots for this day.
          </div>
        )}
      </div>
    </div>
  );
};

const DaySchedule = ({ selectedDate, bookings }) => {
  const [roomMap, setRoomMap] = useState({});

  // Expand recurring bookings for day schedule
  const expandedBookings = useMemo(() => {
    const expanded = expandRecurringBookings(bookings);
    // Filter for selected date
    const formattedSelectedDate = format(
      typeof selectedDate === 'string' ? parseISO(selectedDate) : selectedDate,
      'yyyy-MM-dd'
    );
    return expanded.filter(booking => booking.date === formattedSelectedDate);
  }, [bookings, selectedDate]);

  const generateTimeSlots = () => {
    const slots = [];
    // Use the same time options as in BookingForm for consistency
  };

  const getBookingsForTimeSlot = (timeSlot) => {
    return expandedBookings.filter((booking) => {
      const bookingStart = parseISO(booking.startTime);
      const bookingEnd = parseISO(booking.endTime);
      const slotTime = parse(timeSlot, 'h:mm a', new Date(selectedDate));
  
      return bookingStart <= slotTime && slotTime < bookingEnd;
    });
  };
  
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    // If AM/PM already, return as-is
    if (/am|pm/i.test(timeString)) return timeString;

    // If it's ISO string with T, extract the time part and convert to AM/PM
    if (timeString.includes('T')) {
      // Parse as UTC so time doesn't get offset
      const date = new Date(timeString);
      if (!isNaN(date)) {
        let hour = date.getUTCHours();
        let minute = date.getUTCMinutes();
        let suffix = 'AM';
        if (hour === 0) { hour = 12; }
        else if (hour === 12) { suffix = 'PM'; }
        else if (hour > 12) { hour -= 12; suffix = 'PM'; }
        return `${hour}:${minute.toString().padStart(2, '0')} ${suffix}`;
      }
    }

    // If it's "HH:mm:ss" or "HH:mm"
    const match = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      let [h, m] = [parseInt(match[1]), match[2]];
      let suffix = 'AM';
      if (h === 0) { h = 12; }
      else if (h === 12) { suffix = 'PM'; }
      else if (h > 12) { h -= 12; suffix = 'PM'; }
      return `${h}:${m} ${suffix}`;
    }

    // Fallback
    return timeString;
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
          map[room.roomId] = room.roomName;
          if (room.subRooms) {
            room.subRooms.forEach((sub, idx) => {
              map[`${room.roomId}-sub-${idx}`] = sub.roomName;
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
        Bookings for {formattedDate}
      </h2>
      <div className="overflow-y-auto max-h-96">
        {expandedBookings && expandedBookings.length > 0 ? (
          expandedBookings
            .sort((a, b) => a.startTime.localeCompare(b.startTime)) // sort by time
            .map((booking, index) => (
              <div
                key={`${booking.bookingId}-${index}`}
                className={`${
                  booking.isRecurring || booking.isRecurringInstance 
                    ? 'bg-purple-100 border-l-4 border-purple-500' 
                    : 'bg-blue-100'
                } text-gray-800 rounded-md p-4 mb-4 shadow`}
              >
                <div className="font-semibold text-lg">
                  {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                  {(booking.isRecurring || booking.isRecurringInstance) && (
                    <span title={`Recurring booking (${booking.recurrencePattern})`} className="ml-2 text-xs text-purple-600">
                      ↻ {booking.recurrencePattern}
                    </span>
                  )}
                </div>
                <div className="text-sm mt-1">
                  Name: {booking.firstName} {booking.lastName}
                </div>
                <div className="text-sm">
                  Room: {booking.roomName || 'Unknown Room'}
                </div>
                {booking.isRecurringInstance && (
                  <div className="text-xs text-purple-600 mt-1">
                    Part of recurring series (ID: {booking.originalBookingId})
                  </div>
                )}
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
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedRoomName, setSelectedRoomName] = useState('');
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [fromTime, setFromTime] = useState('');
  const [toTime, setToTime] = useState('');

  useEffect(() => {
    if (
      location.state &&
      location.state.bookingData &&
      location.state.bookingData.room
    ) {
      const { room } = location.state.bookingData;
      setSelectedRoomId(room._id || room.roomId);
      setSelectedRoomName(room.roomName);
    }
  }, [location.state]);

  useEffect(() => {
  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch rooms');
      const data = await res.json();
      setRooms(data);
    } catch (err) {
      console.error(err);
    }
  };
  fetchRooms();
}, []);

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
        roomMap[room.roomId] = room.roomName;
        room.subRooms?.forEach((sub, idx) => {
          roomMap[`${room.roomId}-sub-${idx}`] = sub.roomName;
        });
      });
  
      const processed = bookings.map(b => ({
        ...b,
        roomName: roomMap[b.roomId] || b.roomId
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
    setPendingBooking(newBooking); // Store the booking for later use
    setIsPrivacyModalOpen(true);   // Open the privacy modal
    setIsConfirmationModalOpen(false); // Make sure confirmation modal is closed
  };

  const handlePrivacyConfirm = async () => {
    setIsPrivacyModalOpen(false);
    setBookingError(null);

    if (!pendingBooking) return;

    try {
      const userId = localStorage.getItem('userId');
      const token = localStorage.getItem('token');

      const bookingPayload = {
        ...pendingBooking,
        userId: userId,
        submittedAt: new Date().toISOString(),
      };

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });

      await response.json();

      setPendingBooking(null);
      setIsConfirmationModalOpen(true);

      await fetchBookings();
    } catch (error) {
      console.error('Error submitting booking:', error);
    }
  };

  const handlePrivacyCancel = () => {
    setIsPrivacyModalOpen(false);
    setPendingBooking(null); // Clear pending booking so it won't be submitted
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
    if (!bookingToCancel?.bookingId) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingToCancel.bookingId}`, {
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
      setBookings((prev) => prev.filter((booking) => booking.bookingId !== bookingToCancel.bookingId));
      setIsCancelModalOpen(false);
      setBookingToCancel(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error.message}`);
    }
  };

  const confirmedBookings = useMemo(() => {
return bookings.filter(
  b => ['confirmed', 'pending'].includes(b.status?.toLowerCase())
);
  }, [bookings]);
  
  const bookingsForSelectedDate = useMemo(() => {
    const formattedSelectedDate = format(
      typeof selectedDate === 'string' ? parseISO(selectedDate) : selectedDate,
      'yyyy-MM-dd'
    );

    const expanded = expandRecurringBookings(bookings);
    return expanded.filter(
      (booking) =>
        booking.date === formattedSelectedDate &&
    ['confirmed', 'pending'].includes(booking.status?.toLowerCase())
    );
  }, [bookings, selectedDate]);

  const formattedSelectedDate = format(
    typeof selectedDate === 'string' ? parseISO(selectedDate) : selectedDate,
    'yyyy-MM-dd'
  );

  const availableIntervals = useMemo(() => {
    const expanded = expandRecurringBookings(bookings);
    return getAvailableIntervals(
      expanded.filter(
        (booking) =>
          booking.roomId === selectedRoomId &&
          booking.date === formattedSelectedDate &&
    ['confirmed', 'pending'].includes(booking.status?.toLowerCase())
      ),
      { start: "08:00", end: "22:00" }
    );
  }, [bookings, selectedRoomId, formattedSelectedDate]);

  const bookingsForSelectedRoomAndDate = useMemo(() => {
    const expanded = expandRecurringBookings(bookings);
    return expanded.filter(
      (booking) =>
        booking.roomId === selectedRoomId &&
        booking.date === formattedSelectedDate &&
    ['confirmed', 'pending'].includes(booking.status?.toLowerCase())
    );
  }, [bookings, selectedRoomId, selectedDate, formattedSelectedDate]);

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
          <div className="w-full lg:w-[500px] xl:w-[600px] 2xl:w-[700px]">
            <BookingForm
              onBookingSubmit={handleBookingSubmit}
              setSelectedRoomId={setSelectedRoomId}
              setSelectedRoomName={setSelectedRoomName}
              selectedRoomId={selectedRoomId}
              availableIntervals={availableIntervals}
            />
          </div>
          
            <div className="w-full lg:w-[500px] xl:w-[600px] 2xl:w-[700px]">
              <Calendar
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                bookings={
                  selectedRoomId
                    ? confirmedBookings.filter(b => b.roomId === selectedRoomId)
                    : []
                }
              />
            <AvailableTime
              selectedDate={selectedDate}
              bookings={
                bookings.filter(
                  (booking) =>
                    booking.roomId === selectedRoomId &&
                    format(parseISO(booking.date), 'yyyy-MM-dd') ===
                      format(typeof selectedDate === 'string' ? parseISO(selectedDate) : selectedDate, 'yyyy-MM-dd') &&
                        ['confirmed', 'pending'].includes(booking.status?.toLowerCase())
                )
              }
              roomName={selectedRoomName}
              businessHours={{ start: "08:00", end: "22:00" }}
            />

            <div className="flex gap-4 mb-4">
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
    <input
      type="time"
      value={fromTime}
      onChange={e => setFromTime(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-md"
      min="08:00"
      max="21:30"
    />
  </div>
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
    <input
      type="time"
      value={toTime}
      onChange={e => setToTime(e.target.value)}
      className="px-3 py-2 border border-gray-300 rounded-md"
      min="08:30"
      max="22:00"
    />
  </div>
</div>
            <AvailableRooms
              rooms={rooms}
              bookings={bookings}
              selectedDate={selectedDate}
              fromTime={fromTime}
              toTime={toTime}
            />
            <DaySchedule
              selectedDate={selectedDate}
              bookings={bookingsForSelectedRoomAndDate}
              roomName={selectedRoomName}
            />
          </div>
        </div>
      </div>

      {/* Privacy Confirmation Modal */}
      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onOpenChange={setIsPrivacyModalOpen}
        onConfirm={handlePrivacyConfirm}
        onCancel={handlePrivacyCancel}
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