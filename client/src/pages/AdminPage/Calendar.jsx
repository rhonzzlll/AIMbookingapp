import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';

// API base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Department colors for visual differentiation
const departmentColors = {
  'Engineering': 'bg-blue-200',
  'Marketing': 'bg-green-200',
  'HR': 'bg-purple-200',
  'Finance': 'bg-amber-200',
  'Sales': 'bg-red-200',
  'IT': 'bg-sky-200'
};

const BookingCalendar = () => {
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month'); // 'month' or 'day'
  
  // Data state
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Calendar calculations
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Fetch bookings from the API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        // Format date strings for API request
        const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
        const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
        
        const token = localStorage.getItem('authToken');
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        };
        
        const response = await axios.get(`${API_BASE_URL}/bookings?startDate=${startDate}&endDate=${endDate}`, config);
        
        if (Array.isArray(response.data)) {
          setBookings(response.data);
        } else if (response.data.bookings && Array.isArray(response.data.bookings)) {
          setBookings(response.data.bookings);
        } else {
          console.error("Unexpected bookings response format:", response.data);
          setBookings([]);
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching bookings for calendar:", err);
        setError("Failed to load bookings for calendar. Please try again later.");
        setBookings([]);
        setLoading(false);
      }
    };

    fetchBookings();
  }, [currentMonth, currentYear, daysInMonth]);

  // Process bookings to account for recurring events
  const processedBookings = useMemo(() => {
    const expandedBookings = [];
    
    bookings.forEach(booking => {
      // Skip pending bookings as requested
      if (booking.status === 'pending') {
        return;
      }
      
      // For non-recurring bookings, add as-is
      if (booking.recurring === 'No' || !booking.recurring) {
        expandedBookings.push(booking);
        return;
      }
      
      // For recurring bookings, generate all occurrences within the current month
      const startDate = new Date(booking.date);
      const endDate = booking.recurrenceEndDate 
        ? new Date(booking.recurrenceEndDate) 
        : new Date(currentYear, currentMonth + 1, 0); // End of current month
      
      // Skip if start date is after end of month or end date is before start of month
      if (startDate > new Date(currentYear, currentMonth + 1, 0) || 
          endDate < new Date(currentYear, currentMonth, 1)) {
        return;
      }
      
      // Calculate dates based on recurrence pattern
      let currentOccurrence = new Date(Math.max(
        startDate,
        new Date(currentYear, currentMonth, 1) // Start of current month
      ));
      
      while (currentOccurrence <= endDate && 
             currentOccurrence <= new Date(currentYear, currentMonth + 1, 0)) {
        // Clone the booking and update the date
        const occurrenceDate = currentOccurrence.toISOString().split('T')[0];
        expandedBookings.push({
          ...booking,
          date: occurrenceDate,
          isRecurring: true
        });
        
        // Move to next occurrence based on recurrence type
        if (booking.recurring === 'Daily') {
          currentOccurrence.setDate(currentOccurrence.getDate() + 1);
        } else if (booking.recurring === 'Weekly') {
          currentOccurrence.setDate(currentOccurrence.getDate() + 7);
        } else if (booking.recurring === 'Monthly') {
          currentOccurrence.setMonth(currentOccurrence.getMonth() + 1);
        }
      }
    });
    
    return expandedBookings;
  }, [bookings, currentMonth, currentYear]);

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const selectDate = (day) => {
    setSelectedDate(new Date(currentYear, currentMonth, day));
    setView('day');
  };

  const goToPreviousDay = () => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)));
  const goToNextDay = () => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)));
  const backToCalendar = () => setView('month');

  // Format time for display
  const formatTime = (timeString) => {
    return timeString;
  };

  // Get bookings for a specific day, excluding pending
  const getBookingsForDay = (day) => {
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
 
    return processedBookings.filter(booking => booking.date === formattedDate);
  };

  // Calendar day cells generation
  const generateDays = () => {
    const days = [];
    const previousMonthDays = [];

    // Previous month days
    for (let i = 0; i < firstDayOfMonth; i++) {
      previousMonthDays.push(
        <div key={`prev-${i}`} className="h-32 border p-1 text-gray-400 bg-gray-50">
          <span className="text-sm">{new Date(currentYear, currentMonth, 0 - i).getDate()}</span>
        </div>
      );
    }
    days.push(...previousMonthDays.reverse());

    // Current month days
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();

      const isSelected =
        selectedDate &&
        day === selectedDate.getDate() &&
        currentMonth === selectedDate.getMonth() &&
        currentYear === selectedDate.getFullYear();

      // Get bookings for this day
      const dayBookings = getBookingsForDay(day);
      const hasBookings = dayBookings.length > 0;

      days.push(
        <div
          key={day}
          className={`h-32 border p-1 cursor-pointer flex flex-col ${
            isToday ? 'bg-blue-100' :
            isSelected ? 'bg-blue-200' : 'bg-white hover:bg-blue-50'
          }`}
          onClick={() => selectDate(day)}
        >
          <div className="flex justify-between">
            <span className={`inline-block w-8 h-8 text-center ${
              isToday ? 'bg-blue-500 text-white rounded-full flex items-center justify-center' : ''
            }`}>
              {day}
            </span>
            {hasBookings && (
              <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-200">
                {dayBookings.length}
              </span>
            )}
          </div>
          
          {/* Show booking previews */}
          <div className="mt-1 overflow-hidden flex flex-col gap-1">
            {dayBookings.slice(0, 3).map((booking, idx) => (
              <div 
                key={idx} 
                className={`text-xs p-1 rounded ${departmentColors[booking.department] || 'bg-gray-200'} truncate`}
                title={`${booking.title} (${booking.time}) - ${booking.firstName} ${booking.lastName}`}
              >
                <div className="flex items-center">
                  {booking.status === 'confirmed' && (
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                  )}
                  {booking.status === 'declined' && (
                    <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
                  )}
                  <span>{booking.title}</span>
                </div>
                {booking.isRecurring && (
                  <div className="text-xs text-gray-500">↻ {booking.recurring}</div>
                )}
              </div>
            ))}
            {dayBookings.length > 3 && (
              <div className="text-xs text-gray-500">+{dayBookings.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    // Next month days
    const totalCells = 42; // 6 rows of 7 days
    const nextMonthDays = totalCells - days.length;
    for (let i = 1; i <= nextMonthDays; i++) {
      days.push(
        <div key={`next-${i}`} className="h-32 border p-1 text-gray-400 bg-gray-50">
          <span className="text-sm">{i}</span>
        </div>
      );
    }

    return days;
  };

  // Month view rendering
  const renderMonthView = () => {
    if (loading) {
      return <div className="flex items-center justify-center h-full">Loading calendar data...</div>;
    }

    if (error) {
      return <div className="text-red-500 flex items-center justify-center h-full">{error}</div>;
    }

    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 px-4 py-2 bg-gray-50 border rounded">
          <div className="flex items-center space-x-2">
            <button onClick={goToPreviousMonth} className="p-2 rounded hover:bg-gray-200">
              <span className="font-bold">←</span>
            </button>
            <div className="flex items-center space-x-2">
              <select
                value={monthNames[currentMonth]}
                onChange={(e) => setCurrentDate(new Date(currentYear, monthNames.indexOf(e.target.value), 1))}
                className="p-2 border rounded"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={month}>{month}</option>
                ))}
              </select>
              <select
                value={currentYear}
                onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value), currentMonth, 1))}
                className="p-2 border rounded"
              >
                {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <button onClick={goToNextMonth} className="p-2 rounded hover:bg-gray-200">
              <span className="font-bold">→</span>
            </button>
          </div>
          <div className="flex items-center">
            {/* Removed status indicators */}
          </div>
          <div className="flex items-center space-x-4">
            {/* Department color legend */}
            <div className="hidden md:flex items-center space-x-2 text-xs">
              {Object.entries(departmentColors).map(([dept, color]) => (
                <div key={dept} className="flex items-center">
                  <div className={`w-3 h-3 ${color} rounded-full mr-1`}></div>
                  <span>{dept}</span>
                </div>
              ))}
            </div>
            
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Today
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center py-2 border-b font-medium text-gray-600">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        <div className="grid grid-cols-7 flex-grow w-full overflow-y-auto">
          {generateDays()}
        </div>
      </div>
    );
  };

  // Day view rendering with vertical time slots
  const renderDayView = () => {
    if (!selectedDate) return null;
    
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formattedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const dayBookings = processedBookings.filter(booking => booking.date === formattedDate);
    
    // Generate time slots for the day view - starting at 7:00 with 30-minute intervals
    const generateTimeSlots = () => {
      const slots = [];
      for (let hour = 7; hour < 20; hour++) { // 7:00 AM to 7:30 PM
        for (let minute = 0; minute < 60; minute += 30) {
          const formattedHour = hour % 12 || 12;
          const period = hour >= 12 ? 'PM' : 'AM';
          const formattedMinute = minute.toString().padStart(2, '0');
          const timeString = `${formattedHour}:${formattedMinute} ${period}`;
          slots.push(timeString);
        }
      }
      return slots;
    };
    
    const timeSlots = generateTimeSlots();

    // Group bookings by time
    const bookingsByTime = {};
    dayBookings.forEach(booking => {
      if (!bookingsByTime[booking.time]) {
        bookingsByTime[booking.time] = [];
      }
      bookingsByTime[booking.time].push(booking);
    });

    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 px-4 py-2 bg-gray-100 border rounded">
          <div>
            <h2 className="text-lg font-bold">{`${dayOfWeek[selectedDate.getDay()]}, ${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`}</h2>
            <p className="text-sm text-gray-600">{dayBookings.length} bookings</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={goToPreviousDay} className="p-2 bg-gray-200 rounded hover:bg-gray-300">← Previous</button>
            <button onClick={goToNextDay} className="p-2 bg-gray-200 rounded hover:bg-gray-300">Next →</button>
            <button onClick={backToCalendar} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Back to Calendar</button>
          </div>
        </div>
        
        <div className="flex flex-col h-full overflow-hidden">
          {/* Short summary of all bookings */}
          <div className="mb-4 bg-gray-50 p-4 rounded border">
            <h3 className="font-semibold mb-2">All Bookings for {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {dayBookings.length > 0 ? (
                dayBookings.map((booking, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded shadow-sm ${departmentColors[booking.department] || 'bg-gray-200'}`}
                  >
                    <div className="flex justify-between">
                      <h4 className="font-semibold">{booking.title}</h4>
                      <span className="text-xs px-2 py-1 bg-white rounded-full">
                        {booking.time}
                      </span>
                    </div>
                    <div className="mt-1 text-sm">
                      <p>{booking.firstName} {booking.lastName} ({booking.department})</p>
                      <p>Room: {booking.room}, Building: {booking.building}</p>
                      {booking.isRecurring && (
                        <p className="text-xs italic mt-1">↻ {booking.recurring} booking</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No bookings scheduled for this day.</p>
              )}
            </div>
          </div>
          
          {/* Vertical time slot display */}
          <div className="flex-grow overflow-y-auto">
            <h3 className="font-semibold mb-4">Daily Schedule</h3>
            <div className="border rounded">
              {timeSlots.map((timeSlot, index) => {
                const slotBookings = bookingsByTime[timeSlot] || [];
                const isOddSlot = index % 2 === 0;
                
                return (
                  <div 
                    key={index} 
                    className={`flex border-b ${isOddSlot ? 'bg-gray-50' : 'bg-white'} ${index === timeSlots.length - 1 ? 'border-b-0' : ''}`}
                  >
                    {/* Time indicator */}
                    <div className="w-24 py-3 px-2 text-right text-sm font-medium border-r">
                      {timeSlot}
                    </div>
                    
                    {/* Bookings for this time slot */}
                    <div className="flex-grow p-2 min-h-16">
                      {slotBookings.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {slotBookings.map((booking, idx) => (
                            <div 
                              key={idx} 
                              className={`p-2 rounded ${departmentColors[booking.department] || 'bg-gray-200'}`}
                            >
                              <div className="flex justify-between items-center">
                                <span className="font-medium">{booking.title}</span>
                                <span className={`text-xs px-2 py-1 rounded-full text-white ${
                                  booking.status === 'confirmed' ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                  {booking.status}
                                </span>
                              </div>
                              <p className="text-xs mt-1">{booking.firstName} {booking.lastName} - {booking.department}</p>
                              <p className="text-xs">Room: {booking.room}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-8 flex items-center text-gray-400 text-xs">
                          <span>Available</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed top-0 left-60 right-0 bottom-0 overflow-hidden">
      <div className="h-full w-full px-4 flex justify-center">
        <div className="h-full w-full max-w-[1200px] border rounded shadow-md overflow-auto">
          {view === 'month' ? renderMonthView() : renderDayView()}
        </div>
      </div>
    </div>
  );
  
  
  
};

export default BookingCalendar;