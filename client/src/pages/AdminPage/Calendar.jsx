import React, { useState } from 'react';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month'); // 'month' or 'day'

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

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

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour % 12 || 12;
        const period = hour >= 12 ? 'PM' : 'AM';
        const formattedMinute = minute.toString().padStart(2, '0');
        slots.push(`${formattedHour}:${formattedMinute} ${period}`);
      }
    }
    return slots;
  };

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

      days.push(
        <div
          key={day}
          className={`h-32 border p-1 cursor-pointer flex flex-col justify-between ${isToday ? 'bg-blue-100' :
            isSelected ? 'bg-blue-200' : 'bg-white hover:bg-blue-50'
            }`}
          onClick={() => selectDate(day)}
        >
          <span className={`inline-block w-8 h-8 text-center ${isToday ? 'bg-blue-500 text-white rounded-full' : ''
            }`}>{day}</span>
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

  const renderMonthView = () => {
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
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Today
          </button>
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
        <div className="grid grid-cols-7 flex-grow w-full">
          {generateDays()}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const timeSlots = generateTimeSlots();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-4 px-4 py-2 bg-gray-100 border rounded">
          <div>
            <h2 className="text-lg font-bold">{`${dayOfWeek[selectedDate.getDay()]}, ${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`}</h2>
          </div>
          <div className="flex space-x-2">
            <button onClick={goToPreviousDay} className="p-2 bg-gray-200 rounded hover:bg-gray-300">← Previous</button>
            <button onClick={goToNextDay} className="p-2 bg-gray-200 rounded hover:bg-gray-300">Next →</button>
            <button onClick={backToCalendar} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">Back to Calendar</button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 flex-grow overflow-y-auto">
          {timeSlots.map((timeSlot, index) => (
            <div key={index} className="flex items-center border-b py-2">
              <div className="w-1/4 text-right pr-4 text-gray-500">{timeSlot}</div>
              <div className="flex-1 bg-gray-100 p-2 rounded h-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen min-h-screen bg-white flex items-center justify-center">
      <div className="h-full w-full">
        {view === 'month' ? renderMonthView() : renderDayView()}
      </div>
    </div>
  );

};

export default Calendar;