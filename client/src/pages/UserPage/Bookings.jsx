import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// --- Helper functions (copy from BookingForm.jsx) ---
const convertTo24HourFormat = (time12h) => {
  if (!time12h) return '';
  const [time, modifier] = time12h.split(' ');
  let [hours, minutes] = time.split(':');
  if (hours === '12') {
    hours = modifier === 'PM' ? '12' : '00';
  } else {
    hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours.padStart(2, '0');
  }
  return `${hours}:${minutes}:00`;
};

// ...add other helpers if needed...

const Bookings = () => {
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    email: '',
    buildingId: '',
    buildingName: '',
    categoryId: '',
    categoryName: '',
    roomId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    department: '',
    isRecurring: false,
    recurrenceType: '',
    recurrenceDays: [],
    recurrenceEndDate: '',
    notes: '',
    isMealRoom: false,
    isBreakRoom: false,
    bookingCapacity: 1,
    status: 'pending'
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const userId = localStorage.getItem('userId');
  const token = localStorage.getItem('token');

  // --- Booking creation logic (same as BookingForm.jsx) ---
  const handleCreateBooking = async () => {
    if (!formData.startTime || !formData.endTime || !formData.roomId || !formData.buildingId || !userId) {
      setError('All fields (startTime, endTime, roomId, buildingId, and userId) are required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startTimeSQL = convertTo24HourFormat(formData.startTime);
      const endTimeSQL = convertTo24HourFormat(formData.endTime);

      const bookingPayload = {
        userId,
        title: formData.title,
        firstName: formData.firstName,
        lastName: formData.lastName,
        buildingId: formData.buildingId,
        categoryId: formData.categoryId,
        roomId: formData.roomId,
        date: formData.date,
        startTime: startTimeSQL,
        endTime: endTimeSQL,
        department: formData.department,
        isRecurring: formData.isRecurring,
        recurrenceEndDate: formData.recurrenceEndDate === '' ? null : formData.recurrenceEndDate,
        notes: formData.notes === '' ? null : formData.notes,
        isMealRoom: formData.isMealRoom,
        isBreakRoom: formData.isBreakRoom,
        bookingCapacity: formData.bookingCapacity,
        status: formData.status,
        // Do NOT send timeSubmitted
      };

      console.log('Booking Payload:', bookingPayload);

      const response = await fetch(`${API_BASE_URL}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking.');
      }

      // Optionally refresh bookings list here
      // const data = await response.json();
      // ...handle success...

    } catch (err) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ...rest of your component logic (fetch bookings, render list, etc.)...

  return (
    <div>
      {/* ...your bookings list UI... */}
      {/* Example: */}
      <button onClick={handleCreateBooking} disabled={loading}>
        {loading ? 'Creating...' : 'Create Booking'}
      </button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
};

export default Bookings;