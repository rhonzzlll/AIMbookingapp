import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
// Removed: import { utcToZonedTime } from 'date-fns-tz';
import { Link } from 'react-router-dom';
import Header from './Header';
import { Calendar, Clock, MapPin, AlertCircle, Phone, Mail, User, MessageCircle, Trash2, X, Pencil } from 'lucide-react'; // Add Trash2 and X, Pencil

import AIMLogo from "../../images/AIM_Logo.png";
// import AIMbg from "../../images/AIM_bldg.jpng";
import home from "../../images/home.png";
 
import FacilityModal from '../../components/FacilityModal';
import { AuthContext } from '../../context/AuthContext';
import CancelBookingConfirmation from './modals/CancelBookingConfirmation'; // Import your modal

const API_BASE_URL = import.meta.env.VITE_API_URI;

const token = localStorage.getItem('token');
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

const initialFormState = {
  title: '',
  firstName: '',
  lastName: '',
  userId: null,
  categoryId: '',
  roomId: null,
  buildingId: '',
  date: new Date().toISOString().split('T')[0],  
  startTime: null,
  endTime: null,
  notes: '',
  isRecurring: false,
  recurrenceEndDate: '',
  status: 'pending',
  bookingCapacity: 1,
  isMealRoom: false,
  isBreakRoom: false,
  remarks: '',
  bookingId: null,
  numberOfPaxBreakRoom: '',
  startTimeBreakRoom: '',
  endTimeBreakRoom: '',
  isToCharge: ''
};

function EditBookingModal({ booking, user, onClose, onBookingUpdated }) {
  // Use user prop for default info
  const [formData, setFormData] = useState({
    ...initialFormState,
    ...booking,
    firstName: user.firstName,
    lastName: user.lastName,
    department: user.department,
    recurring: booking.isRecurring ? booking.recurring || "Daily" : "No",
  });
  const [formError, setFormError] = useState({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const modalRef = React.useRef();

  const TIME_OPTIONS = [
    '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
    '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', 
    '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
  ];

  const formatTime = (timeString) => {
    if (!timeString) return '';
    if (/am|pm/i.test(timeString)) return timeString;
    if (timeString.includes('T')) {
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
    const match = timeString.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (match) {
      let [h, m] = [parseInt(match[1]), match[2]];
      let suffix = 'AM';
      if (h === 0) { h = 12; }
      else if (h === 12) { suffix = 'PM'; }
      else if (h > 12) { h -= 12; suffix = 'PM'; }
      return `${h}:${m} ${suffix}`;
    }
    return timeString;
  };

  const getAvailableIntervals = (bookings, businessHours = { start: "08:00", end: "22:00" }) => {
    const buffer = 30;
    const toMinutesFromISO = iso => {
      const d = new Date(iso);
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    };
    const toMinutes = str => {
      const [h, m] = str.split(":").map(Number);
      return h * 60 + m;
    };
    if (!bookings || bookings.length === 0) {
      return [{ start: toMinutes(businessHours.start), end: toMinutes(businessHours.end) }];
    }
    const busy = bookings
      .map(b => ({
        start: Math.max(toMinutesFromISO(b.startTime) - buffer, toMinutes(businessHours.start)),
        end: Math.min(toMinutesFromISO(b.endTime) + buffer, toMinutes(businessHours.end)),
      }))
      .sort((a, b) => a.start - b.start);
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
    return slots.filter(slot => slot.end > slot.start);
  };

  const timeToMinutes = (timeString) => {
    const [time, period] = timeString.split(" ");
    let [h, m] = time.split(":").map(Number);
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };

  const minutesToTime = (minutes) => {
    let h = Math.floor(minutes / 60);
    let m = minutes % 60;
    let suffix = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${m.toString().padStart(2, "0")} ${suffix}`;
  };

  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem('token');
      // Rooms and bookings
      const resRooms = await fetch(`${API_BASE_URL}/rooms`, { headers: { Authorization: `Bearer ${token}` } });
      const roomData = await resRooms.json();
      setRooms(roomData);
      const resBookings = await fetch(`${API_BASE_URL}/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      const bookingData = await resBookings.json();
      setAllBookings(bookingData);

      // Set buildings
      const buildingMap = {};
      roomData.forEach(room => {
        if (room.buildingId) buildingMap[room.buildingId] = room.Building?.buildingName || room.building || 'Unknown Building';
      });
      setBuildings(Object.entries(buildingMap).map(([id, name]) => ({ id, name })));

      // Set categories for current building
      if (booking.buildingId) {
        const filtered = roomData.filter(r => r.buildingId?.toString() === booking.buildingId?.toString());
        const categoryMap = {};
        filtered.forEach(room => {
          if (room.categoryId) categoryMap[room.categoryId] = room.Category?.categoryName || room.category || 'Unknown Category';
        });
        setCategories(Object.entries(categoryMap).map(([id, name]) => ({ id, name })));
        // Set available rooms
        if (booking.categoryId) {
          setAvailableRooms(filtered.filter(room => room.categoryId?.toString() === booking.categoryId?.toString()));
        }
      }
    }
    fetchData();
  }, [booking.buildingId, booking.categoryId]);

  // Handlers for dropdowns and times
  const handleBuildingChange = (e) => {
    const val = e.target.value;
    setFormData(f => ({ ...f, buildingId: val, categoryId: '', roomId: '' }));
    const filtered = rooms.filter(r => r.buildingId?.toString() === val);
    const categoryMap = {};
    filtered.forEach(room => {
      if (room.categoryId) categoryMap[room.categoryId] = room.Category?.categoryName || room.category || 'Unknown Category';
    });
    setCategories(Object.entries(categoryMap).map(([id, name]) => ({ id, name })));
    setAvailableRooms([]);
  };
  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setFormData(f => ({ ...f, categoryId: val, roomId: '' }));
    setAvailableRooms(
      rooms.filter(r =>
        r.buildingId?.toString() === formData.buildingId?.toString() &&
        r.categoryId?.toString() === val
      )
    );
  };
  const handleRoomChange = (e) => setFormData(f => ({ ...f, roomId: e.target.value }));

  // Time logic
  const getAvailableStartTimes = () => {
    if (!formData.roomId || !formData.date) return [];
    const confirmed = allBookings.filter(
      b => b.roomId === formData.roomId &&
        b.date === formData.date &&
        b.status?.toLowerCase() === 'confirmed' &&
        b.bookingId !== booking.bookingId
    );
    const intervals = getAvailableIntervals(confirmed);
    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = formData.date === todayStr;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let options = [];
    intervals.forEach(({ start, end }) => {
      for (let t = start; t + 30 <= end; t += 30) {
        if (!isToday || t > currentMinutes) options.push(minutesToTime(t));
      }
    });
    if (
      formData.startTime &&
      !options.includes(formatTime(formData.startTime))
    ) {
      options.push(formatTime(formData.startTime));
      options.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    }
    return options;
  };
  const getAvailableEndTimes = () => {
    if (!formData.startTime || !formData.roomId || !formData.date) return [];
    const confirmed = allBookings.filter(
      b => b.roomId === formData.roomId &&
        b.date === formData.date &&
        b.status?.toLowerCase() === 'confirmed' &&
        b.bookingId !== booking.bookingId
    );
    const intervals = getAvailableIntervals(confirmed);
    const startMinutes = timeToMinutes(formatTime(formData.startTime));
    const interval = intervals.find(
      ({ start, end }) => start <= startMinutes && startMinutes < end
    );
    let times = [];
    if (interval) {
      for (let t = startMinutes + 30; t <= interval.end; t += 30) {
        times.push(minutesToTime(t));
      }
    }
    if (
      formData.endTime &&
      !times.includes(formatTime(formData.endTime))
    ) {
      times.push(formatTime(formData.endTime));
      times.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
    }
    return times;
  };

  // Input handler
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Save
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    // Validation
    let hasError = false;
    const errors = {};
    if (!formData.startTime || !formData.endTime) {
      errors.time = 'Start and end times are required';
      hasError = true;
    }
    if (formData.bookingCapacity < 1) {
      errors.bookingCapacity = 'Pax must be at least 1';
      hasError = true;
    }
    if (!formData.roomId) {
      errors.room = 'Room selection is required';
      hasError = true;
    }
    if (!formData.buildingId) {
      errors.building = 'Building is required';
      hasError = true;
    }
    if (formData.isRecurring && !formData.recurrenceEndDate) {
      errors.recurrence = 'Recurrence end date is required';
      hasError = true;
    }
    if (hasError) {
      setFormError(errors);
      setSubmitLoading(false);
      return;
    }

    // 24-hour time conversion (from Bookings.jsx)
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

    // Build payload (like Bookings.jsx)
    let recurringGroupId = formData.recurringGroupId;
    if (formData.isRecurring && !recurringGroupId) {
      recurringGroupId = Math.random().toString(36).substring(2, 15); // fallback, or use uuid if you have it
    }
    const payload = {
      userId: booking.userId || user.userId, // Use current
      title: formData.title,
      firstName: user.firstName,
      lastName: user.lastName,
      buildingId: formData.buildingId,
      categoryId: formData.categoryId,
      roomId: formData.roomId,
      date: formData.date,
      startTime: convertTo24HourFormat(formData.startTime),
      endTime: convertTo24HourFormat(formData.endTime),
      department: user.department,
      isRecurring: Boolean(formData.isRecurring),
      recurrencePattern: formData.recurring || "Daily",
      recurrenceEndDate: formData.isRecurring ? formData.recurrenceEndDate : null,
      notes: formData.notes || null,
      isMealRoom: Boolean(formData.isMealRoom),
      isBreakRoom: Boolean(formData.isBreakRoom),
      bookingCapacity: Number(formData.bookingCapacity) || 1,
      status: (formData.status || 'pending').toLowerCase(),
      recurringGroupId: formData.isRecurring ? recurringGroupId : null,
      numberOfPaxBreakRoom: formData.numberOfPaxBreakRoom || null,
      startTimeBreakRoom: formData.startTimeBreakRoom || null,
      endTimeBreakRoom: formData.endTimeBreakRoom || null,
      isToCharge: formData.isToCharge,
    };

    try {
      // PUT to update booking
      await fetch(`${API_BASE_URL}/bookings/${booking.bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payload),
      });
      setSubmitLoading(false);
      if (onBookingUpdated) onBookingUpdated();
      onClose();
    } catch (err) {
      setSubmitLoading(false);
      alert('Failed to update booking');
    }
  };

  // Cancel
  const handleCancel = () => setShowCancelModal(true);

  const handleCancelConfirm = async (reason) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/${booking.bookingId}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ cancelReason: reason }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }
      setStatus('cancelled'); // Update status
      setShowCancelModal(false); // Close modal after success
    } catch (error) {
      alert('Failed to cancel booking. Please try again.');
    }
  };

  const handleCancelClose = () => setShowCancelModal(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <form
        ref={modalRef}
        className="bg-white rounded-xl shadow-lg w-full max-w-xl max-h-[90vh] p-8 relative flex flex-col overflow-y-auto"
        style={{ minHeight: '500px' }}
        onSubmit={handleSubmit}
      >
        <button type="button" onClick={onClose} className="absolute top-4 right-4 text-2xl font-bold text-gray-400 hover:text-gray-600">×</button>
        <h2 className="text-2xl font-bold mb-6 text-center">Edit Booking</h2>
        
        {/* Booking Title & Building */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Booking Title</label>
            <input
              name="title"
              value={formData.title || ''}
              onChange={handleInputChange}
              required
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
            <select
              name="buildingId"
              value={formData.buildingId || ''}
              onChange={handleBuildingChange}
              required
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Select Building</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="categoryId"
              value={formData.categoryId || ''}
              onChange={handleCategoryChange}
              required
              disabled={!formData.buildingId}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {/* Room */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
            <select
              name="roomId"
              value={formData.roomId || ''}
              onChange={handleRoomChange}
              required
              disabled={!formData.categoryId}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Select Room</option>
              {availableRooms.map(r => (
                <option key={r.roomId} value={r.roomId}>
                  {r.roomName} {r.capacity ? `(Capacity: ${r.capacity})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date - full width */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date || ''}
            onChange={e => setFormData(f => ({ ...f, date: e.target.value }))}
            required
            min={new Date().toISOString().split('T')[0]}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Start & End Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <select
              value={formData.startTime || ''}
              onChange={e => setFormData(f => ({ ...f, startTime: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Select Start Time</option>
              {getAvailableStartTimes().map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <select
              value={formData.endTime || ''}
              onChange={e => setFormData(f => ({ ...f, endTime: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded"
              disabled={!formData.startTime}
            >
              <option value="">Select End Time</option>
              {getAvailableEndTimes().map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Pax & Charge To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pax</label>
            <input
              type="number"
              name="bookingCapacity"
              value={formData.bookingCapacity || 1}
              onChange={e => setFormData(f => ({ ...f, bookingCapacity: e.target.value }))}
              min={1}
              required
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Charge To</label>
            <input
              name="isToCharge"
              value={formData.isToCharge || ''}
              onChange={e => setFormData(f => ({ ...f, isToCharge: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="Enter department/account to charge"
            />
          </div>
        </div>

        {/* Other Request - Centered Checkboxes */}
        <div className="border-t pt-6 mt-6">
          <div className="w-full flex flex-col items-center mb-4">
            <span className="block text-base font-semibold text-gray-700 mb-2 text-center">Other Request</span>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isMealRoom"
                  name="isMealRoom"
                  checked={formData.isMealRoom}
                  onChange={e => setFormData(f => ({ ...f, isMealRoom: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isMealRoom" className="text-sm text-gray-700">
                  Meal Venue Required
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isBreakRoom"
                  name="isBreakRoom"
                  checked={formData.isBreakRoom}
                  onChange={e => setFormData(f => ({
                    ...f,
                    isBreakRoom: e.target.checked,
                    ...(e.target.checked
                      ? {}
                      : {
                          numberOfPaxBreakRoom: '',
                          startTimeBreakRoom: '',
                          endTimeBreakRoom: '',
                        }),
                  }))}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isBreakRoom" className="text-sm text-gray-700">
                  Breakout Room Required
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isRecurring"
                  name="isRecurring"
                  checked={formData.isRecurring}
                  onChange={e => setFormData(f => ({
                    ...f,
                    isRecurring: e.target.checked,
                    recurring: e.target.checked ? (f.recurring || "Daily") : "No",
                    recurrenceEndDate: e.target.checked ? f.recurrenceEndDate || formData.date : ""
                  }))}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isRecurring" className="text-sm text-gray-700">
                  Recurring Booking
                </label>
              </div>
            </div>
          </div>

          {/* Recurring Details */}
          {formData.isRecurring && (
            <div className="flex flex-col items-center justify-center gap-4 mt-2 w-full">
              <div className="flex flex-row items-center gap-4">
                <select
                  name="recurring"
                  value={formData.recurring || "Daily"}
                  onChange={e => setFormData(f => ({ ...f, recurring: e.target.value }))}
                  className="p-2 border border-gray-300 rounded"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
                <input
                  type="date"
                  name="recurrenceEndDate"
                  value={formData.recurrenceEndDate || ""}
                  onChange={e => setFormData(f => ({ ...f, recurrenceEndDate: e.target.value }))}
                  min={formData.date}
                  className="p-2 border border-gray-300 rounded"
                  required
                />
              </div>
            </div>
          )}

          {/* Breakout Room Details */}
          {formData.isBreakRoom && (
            <div className="flex flex-col items-center justify-center gap-4 mt-2 w-full">
              <div className="w-full md:w-2/3">
                <label className="block text-gray-700 font-medium mb-2">
                  Number of Pax (Breakout Room)
                </label>
                <input
                  type="number"
                  name="numberOfPaxBreakRoom"
                  value={formData.numberOfPaxBreakRoom || ''}
                  onChange={e => setFormData(f => ({ ...f, numberOfPaxBreakRoom: e.target.value }))}
                  min={1}
                  className="w-full p-2 border border-gray-300 rounded"
                  placeholder="Enter number"
                  required={formData.isBreakRoom}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-2/3">
                <div className="flex-1">
                  <label className="block text-gray-700 mb-1">Breakout Start Time</label>
                  <select
                    name="startTimeBreakRoom"
                    value={formData.startTimeBreakRoom || ''}
                    onChange={e => setFormData(f => ({ ...f, startTimeBreakRoom: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded"
                    required={formData.isBreakRoom}
                  >
                    <option value="">Select Start Time</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-gray-700 mb-1">Breakout End Time</label>
                  <select
                    name="endTimeBreakRoom"
                    value={formData.endTimeBreakRoom || ''}
                    onChange={e => setFormData(f => ({ ...f, endTimeBreakRoom: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded"
                    required={formData.isBreakRoom}
                    disabled={!formData.startTimeBreakRoom}
                  >
                    <option value="">Select End Time</option>
                    {TIME_OPTIONS
                      .filter(
                        (time) =>
                          !formData.startTimeBreakRoom ||
                          TIME_OPTIONS.indexOf(time) > TIME_OPTIONS.indexOf(formData.startTimeBreakRoom)
                      )
                      .map((time) => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Notes / Other Requests</label>
          <textarea
            name="notes"
            value={formData.notes || ''}
            onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
            rows={5}
            className="w-full p-3 border border-gray-300 rounded resize-y min-h-[120px]"
            placeholder="Add any special requests, notes, or instructions..."
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end items-center mt-10 gap-4">
          <button
            type="button"
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded shadow hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded shadow"
            disabled={submitLoading}
          >
            {submitLoading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
 

const HomePage = () => {
  const { userId, token, setAuth } = useContext(AuthContext);

  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    profileImage: '',
    department: '',
  });
  const [bookings, setBookings] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [visibleCount, setVisibleCount] = useState(5); // Limit to 5 bookings by default
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [buildingsLoading, setBuildingsLoading] = useState(true);
  const [buildingsError, setBuildingsError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);


  // Fetch buildings from API
  const fetchBuildings = async () => {
    setBuildingsLoading(true);
    setBuildingsError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/buildings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('Raw facilities data:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        // Process building data to ensure consistent structure
        const processedFacilities = response.data.map(facility => {
          // Check if image URL is already complete or needs to be prefixed with API URL
          let imageUrl = facility.buildingImageUrl || facility.buildingImage;
          if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
            imageUrl = `${API_BASE_URL}/uploads/${imageUrl}`;
          } else if (imageUrl && imageUrl.startsWith('/')) {
            imageUrl = `${API_BASE_URL}${imageUrl}`;
          }
          
          return {
            buildingId: facility.buildingId || '',
            buildingName: facility.buildingName || 'Unnamed Facility',
            buildingDescription: facility.buildingDescription || 'No description available',
            buildingImage: imageUrl,
            amenities: facility.amenities || []
          };
        });
        
        setFacilities(processedFacilities);
        console.log('Processed facilities:', processedFacilities);
      } else {
        setFacilities([]);
        console.log('No facilities found or data is not an array');
      }
    } catch (err) {
      console.error('Error fetching buildings:', err);
      setBuildingsError('Failed to load buildings');
    } finally {
      setBuildingsLoading(false);
    }
  };

  useEffect(() => {
    const fetchUserAndBookings = async () => {
      try {
        const userResponse = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = userResponse.data;
        setUser({
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImage: userData.profileImage
            ? `${API_BASE_URL}/uploads/${userData.profileImage}` // <-- FIXED: removed /api
            : (localStorage.getItem('profileImage')
              ? `${API_BASE_URL}/uploads/${localStorage.getItem('profileImage')}` // <-- FIXED: removed /api
              : '/default-avatar.png'),
          department: userData.department || '',
        });

        // Fetch bookings but handle 404 gracefully
        try {
          const bookingsResponse = await axios.get(`${API_BASE_URL}/bookings/user/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          setBookings(bookingsResponse.data || []);
        } catch (bookingsErr) {
          setBookings([]);
        }

        setLoading(false);
      } catch (err) {
        // Fallback to localStorage if API fails
        setUser({
          firstName: localStorage.getItem('firstName') || '',
          lastName: localStorage.getItem('lastName') || '',
          profileImage: localStorage.getItem('profileImage')
            ? `${API_BASE_URL}/uploads/${localStorage.getItem('profileImage')}` // <-- FIXED: removed /api
            : '/default-avatar.png',
          department: localStorage.getItem('department') || '',
        });
        setError('Failed to load user profile');
        setLoading(false);
      }
    };

    // Listen for profile updates
    const handleUserProfileUpdated = () => {
      fetchUserAndBookings();
    };
    window.addEventListener('userProfileUpdated', handleUserProfileUpdated);

    // Call the function if userId and token exist
    if (userId && token) {
      fetchUserAndBookings();
      fetchBuildings();
    } else {
      setError('User not authenticated');
      setLoading(false);
    }

    // Listen for building data changes from the admin panel
    const handleBuildingsDataChanged = () => {
      fetchBuildings();
    };
    window.addEventListener('buildingsDataChanged', handleBuildingsDataChanged);

    // Check sessionStorage for updates
    const checkForBuildingUpdates = () => {
      const lastUpdated = sessionStorage.getItem('buildingsLastUpdated');
      if (lastUpdated && lastUpdated !== localStorage.getItem('lastBuildingFetch')) {
        fetchBuildings();
        localStorage.setItem('lastBuildingFetch', lastUpdated);
      }
    };

    // Check for updates periodically
    const intervalId = setInterval(checkForBuildingUpdates, 5000);

    return () => {
      window.removeEventListener('buildingsDataChanged', handleBuildingsDataChanged);
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdated);
      clearInterval(intervalId);
    };
  }, [userId, token]);

  // ...existing code...
const now = new Date();
const getBookingDateTime = (booking) => {
  if (booking.date && booking.startTime && !booking.startTime.includes('T')) {
    // Parse as local time
    const [year, month, day] = booking.date.split('-').map(Number);
    const [hour, minute, second = '00'] = booking.startTime.split(':');
    return new Date(year, month - 1, day, Number(hour), Number(minute), Number(second));
  } else if (booking.startTime && booking.startTime.includes('T')) {
    return new Date(booking.startTime);
  } else if (booking.date) {
    const [year, month, day] = booking.date.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0);
  }
  return null;
};

const filteredBookings = bookings
  .filter((booking) => {
    const bookingDateTime = getBookingDateTime(booking);
    if (!bookingDateTime) return false;
    if (activeTab === 'upcoming') {
      return bookingDateTime >= now;
    } else if (activeTab === 'past') {
      return bookingDateTime < now;
    }
    return true; // all tab
  })
  .sort((a, b) => {
    const aDate = getBookingDateTime(a);
    const bDate = getBookingDateTime(b);
    // For upcoming and all: soonest first. For past: most recent first.
    if (activeTab === 'past') {
      return bDate - aDate;
    }
    return aDate - bDate;
  });
  const displayedBookings =
    activeTab === 'all' ? filteredBookings : filteredBookings.slice(0, visibleCount);

   const getImageByName = (name) => {
    if (name && name.toLowerCase().includes('conference center')) {
      return ACCImage;
    } 
    return AIMImage;
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="relative min-h-screen w-full overflow-x-auto">
      {/* Fixed Background Image and Overlay */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${home})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-10" />
      </div>
      {/* Scrollable Foreground Layer */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
          <Header />
        </header>

        {/* Main content with dark overlay */}
        <main className="pt-24 text-white flex-grow">
          {/* Hero Section */}
          <div className="container mx-auto px-4 pb-4 text-center">
            <h1 className="text-4xl font-bold">Welcome, {user.firstName}!</h1>
            <p className="text-blue-100">Find and book your ideal meeting space today</p>
          </div>

          {/* Dashboard Content */}
          <div className="container mx-auto px-4 pb-16">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                {/* User Info Card */}
                <div className="bg-white bg-opacity-90 text-gray-800 rounded-xl shadow-sm p-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 rounded-full overflow-hidden">
                      <img
                        src={user.profileImage || "/placeholder.svg"}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">{`${user.firstName} ${user.lastName}`}</h2>
                      {user.department && <p className="text-sm text-gray-500">{user.department}</p>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="md:col-span-2 space-y-8">
                {/* My Bookings */}
                <div className="bg-white bg-opacity-90 text-gray-800 rounded-xl shadow-sm p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">My Bookings</h2>
                    <div className="flex rounded-lg overflow-hidden border">
                      {["upcoming", "past", "all"].map((tab) => (
                        <button
                          key={tab}
                          className={`px-4 py-1 text-sm ${
                            activeTab === tab ? "bg-blue-600 text-white" : "bg-white text-gray-700"
                          }`}
                          onClick={() => {
                            setActiveTab(tab);
                            if (tab === 'all') setVisibleCount(filteredBookings.length);
                          }}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`space-y-4 ${
                      displayedBookings.length > 3 ? 'max-h-96 overflow-y-auto' : ''
                    }`}
                  >
                    {displayedBookings.length > 0 ? (
                      displayedBookings.map((booking) => (
                        <BookingCard
                          key={booking.bookingId}
                          booking={booking}
                          setShowEditModal={setShowEditModal}
                          setEditingBooking={setEditingBooking}
                        />
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <AlertCircle size={32} className="mx-auto" />
                        </div>
                        <p className="text-gray-500">No bookings found</p>
                        <button
                          onClick={() => setShowFacilityModal(true)}
                          className="mt-4 text-blue-600 text-sm font-medium hover:underline block"
                        >
                          Book a room now
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Facilities - Now Dynamic */}
                <div>
                  <h2 className="text-xl font-bold mb-4 text-black">Available Facilities</h2>
                  
                  {buildingsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="ml-2 text-black">Loading facilities...</p>
                    </div>
                  ) : buildingsError ? (
                    <div className="text-center py-8 bg-white bg-opacity-90 rounded-xl p-4">
                      <div className="text-red-500 mb-2">
                        <AlertCircle size={32} className="mx-auto" />
                      </div>
                      <p className="text-gray-800">{buildingsError}</p>
                      <button
                        onClick={fetchBuildings}
                        className="mt-4 text-blue-600 text-sm font-medium hover:underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : facilities.length === 0 ? (
                    <div className="text-center py-8 col-span-2 bg-white bg-opacity-80 rounded-xl p-6">
                      <div className="text-gray-400 mb-2">
                        <AlertCircle size={32} className="mx-auto" />
                      </div>
                      <p className="text-gray-500">No facilities available at the moment</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      {facilities.map((facility) => (
                        <FacilityCard
                          key={facility.buildingId}
                          imageSrc={facility.buildingImage || getImageByName(facility.buildingName)}
                          title={facility.buildingName}
                          description={facility.buildingDescription || "Available for booking"}
                          bookingLink={`/building/${facility.buildingId}`}
                          features={facility.amenities || []}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <footer className="bg-blue-900 text-white w-full">
            <div className="px-4 py-10">
              <div className="mb-8 text-center">
                <h2 className="font-serif text-3xl md:text-4xl font-light tracking-wide">
                  Lead. Inspire. Transform.
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Contact info */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 mt-1 flex-shrink-0" />
                    <p>Eugenio Lopez Foundation Bldg. 123, Paseo de Roxas Makati City 1229, Philippines</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="h-5 w-5 flex-shrink-0" />
                    <p>2133</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 flex-shrink-0" />
                    <p>atirazona@aim.edu</p>
                  </div>
                </div>

                {/* Logo */}
                <div className="flex items-center justify-center">
                  <div className="h-32 p-2">
                    <img src={AIMLogo || "/placeholder.svg"} alt="AIM Logo" className="object-contain h-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-purple-800 py-4 px-4 flex flex-col md:flex-row justify-between items-center">
              <div className="text-sm text-purple-200 mb-2 md:mb-0">
                &copy; {new Date().getFullYear()} AIM Room Booking. All rights reserved.
              </div>
            </div>
          </footer>
        </main>
      </div>
      
      {/* Facility Modal */}
      {showFacilityModal && (
        <FacilityModal onClose={() => setShowFacilityModal(false)} />
      )}
            {/* Edit Booking Modal */}
      {showEditModal && editingBooking && (
      <EditBookingModal
        booking={editingBooking}
        user={user} // <-- ADD THIS LINE
        onClose={() => setShowEditModal(false)}
        onBookingUpdated={() => {
          setShowEditModal(false);
          setEditingBooking(null);
          window.location.reload();
        }}
      />
      )}
    </div>
  );
};

// Loading State Component
const LoadingState = () => (
  <div className="flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading your dashboard...</p>
    </div>
  </div>
);

// Error State Component
const ErrorState = ({ message }) => (
  <div className="flex items-center justify-center">
    <div className="text-center p-8 bg-white rounded-xl shadow-md max-w-md">
      <div className="text-red-500 mb-4">
        <AlertCircle size={48} className="mx-auto" />
      </div>
      <h2 className="text-xl font-bold text-red-600 mb-2">Oops! Something went wrong</h2>
      <p className="text-gray-600 mb-4">{message}</p>
      <Link to="/login" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block">
        Back to Login
      </Link>
    </div>
  </div>
);

// Booking Card Component
const BookingCard = ({ booking, setShowEditModal, setEditingBooking }) => {
  const [roomName, setRoomName] = useState('Loading...');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [status, setStatus] = useState(booking.status || 'pending');

  // Fetch room details using roomId
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        if (booking.roomId) {
          const roomResponse = await axios.get(
            `${API_BASE_URL}/rooms/${booking.roomId}`
          );
          setRoomName(roomResponse.data.roomName || 'Unknown Room');
        } else {
          setRoomName('Unknown Room');
        }
      } catch (error) {
        console.error('Error fetching room details:', error);
        setRoomName('Unknown Room');
      }
    };

    fetchDetails();
  }, [booking.roomId]);

  // Format booking date as UTC
  const formatBookingDate = (dateString) => {
    try {
      if (!dateString) return { day: '', date: '', month: '' };
      const utcDate = new Date(dateString);
      if (isNaN(utcDate)) return { day: '', date: '', month: '' };
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        day: days[utcDate.getUTCDay()],
        date: String(utcDate.getUTCDate()).padStart(2, '0'),
     month: months[utcDate.getUTCMonth()],
      };
    } catch (error) {
      console.error('Date formatting error:', error);
      return { day: '', date: '', month: '' };
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    try {
      const date = new Date(timeString);
      if (isNaN(date)) return '';
      const hours = String(date.getUTCHours()).padStart(2, '0');
      const minutes = String(date.getUTCMinutes()).padStart(2, '0');
      const hour12 = ((date.getUTCHours() + 11) % 12) + 1;
      const ampm = date.getUTCHours() >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${ampm} `;
    } catch (error) {
      console.error('Time formatting error:', error);
      return timeString;
    }
  };

  const { day, date, month } = formatBookingDate(booking.date);
  const startTimeFormatted = formatTime(booking.startTime);
  const endTimeFormatted = formatTime(booking.endTime);

  // Cancel booking handler (like confirm/decline)
  const handleCancel = () => setShowCancelModal(true);

  const handleCancelConfirm = async (reason) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/bookings/${booking.bookingId}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ cancelReason: reason }),
        }
      );
      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }
      setStatus('cancelled'); // Update status
      setShowCancelModal(false); // Close modal after success
    } catch (error) {
      alert('Failed to cancel booking. Please try again.');
    }
  };

  const handleCancelClose = () => setShowCancelModal(false);

  // Status color and label
  let statusColor = '';
  let statusLabel = '';
  if (status === 'confirmed' || status === 'approved') {
    statusColor = 'bg-green-100 text-green-600';
    statusLabel = 'Confirmed';
  } else if (status === 'pending') {
    statusColor = 'bg-yellow-100 text-yellow-600';
    statusLabel = 'Pending';
  } else if (status === 'cancelled') {
    statusColor = 'bg-gray-200 text-gray-500';
    statusLabel = 'Cancelled';
  } else {
    statusColor = 'bg-red-100 text-red-600';
    statusLabel = status.charAt(0).toUpperCase() + status.slice(1);
  }

  return (
    <div className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Left side - Date */}
        <div
          className={`p-4 text-center flex-shrink-0 ${
            status === 'confirmed' || status === 'approved'
              ? 'bg-green-50'
              : status === 'pending'
              ? 'bg-yellow-50'
              : status === 'cancelled'
              ? 'bg-gray-100'
              : 'bg-red-50'
          }`}
        >
          <div className="md:w-24">
            <p className="text-sm font-medium text-gray-500">{day}</p>
            <p className="text-2xl font-bold">{date}</p>
            <p className="text-sm font-medium">{month}</p>
          </div>
        </div>

        {/* Right side - Details */}
        <div className="p-4 flex-grow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">{booking.title || 'Untitled Booking'}</h3>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <Clock size={14} className="mr-1" />
                <span className="font-medium">Time:</span> {startTimeFormatted} - {endTimeFormatted}
              </div>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <MapPin size={14} className="mr-1" />
                <span className="font-medium">Location:</span> {roomName}
              </div>
              <div className="flex flex-col text-gray-500 text-sm mt-1">
                {booking.changedBy && (
                  <div className="flex items-center">
                    <User size={14} className="mr-1" />
                    Changed by {booking.changedBy}
                  </div>
                )}
                {/* Show message icon and reason if declined */}
                {status === 'declined' && booking.declineReason && (
                  <div className="flex items-center mt-1 text-red-600">
                    <MessageCircle size={16} className="mr-1" />
                    <span className="font-semibold mr-1">Reason for decline:</span>
                    <span className="italic">{booking.declineReason}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full ${statusColor}`}
              >
                {statusLabel}
              </span>
              {/* Show pencil and X icon if pending */}
              {status === 'pending' && (
                <div className="flex gap-2 mt-2">
                  <button
                    className="text-blue-500 hover:text-blue-700"
                    title="Edit Booking"
                    onClick={() => {
                      setEditingBooking(booking);
                      setShowEditModal(true);
                    }}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="text-red-500 hover:text-red-700"
                    title="Cancel Booking"
                    onClick={() => setShowCancelModal(true)}
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Cancel Booking Modal */}
      {showCancelModal && (
        <CancelBookingConfirmation
          booking={booking}
          onConfirm={handleCancelConfirm}
          onCancel={handleCancelClose}
        />
      )}
    </div>
  );
};

// Facility Card Component
const FacilityCard = ({ imageSrc, title, description, bookingLink, features }) => {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const handleImageError = () => {
    console.log(`Error loading image for ${title}`);
    setImgError(true);
    setIsLoading(false);
  };
  
  const handleImageLoad = () => {
    setIsLoading(false);
  };
  
  return (
    <div className="bg-white text-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 overflow-hidden relative">
        {/* Show loading indicator while image is loading */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-0">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        )}
        
        {/* Use fallback image logic */}
        <img 
          src={imgError ? '/placeholder-building.png' : (imageSrc || '/placeholder-building.png')}
          alt={title} 
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 relative z-10" 
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold">{title || 'Unnamed Facility'}</h3>
        </div>
        
        <p className="text-gray-600 text-sm mb-4">{description || 'Available for booking'}</p>

        {features && features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {features.map((feature, index) => (
              <span key={index} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full">
                {feature}
              </span>
            ))}
          </div>
        )}

        <Link
          to={bookingLink}
          className="block text-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Book Now
        </Link>
      </div>
    </div>
  );
};

export default HomePage;