import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const DEPARTMENTS = ['Engineering', 'Marketing', 'HR', 'Finance', 'Sales', 'IT', 'ICT'];

// Helper function to generate time options
const generateTimeOptions = () => [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', 
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

const BookingForm = ({ isEdit, initialData, onClose }) => {
  const token = localStorage.getItem('token');
  
  // Initial form state
  const initialFormState = {
    title: '',
    firstName: '',
    lastName: '',
    userId: null,
    department: '',
    categoryId: '',
    roomId: null,
    buildingId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: null,
    endTime: null,
    notes: '',
    recurring: 'No',
    recurrenceEndDate: '',
    status: 'pending',
    bookingCapacity: 1,
    isMealRoom: false,
    isBreakRoom: false,
    remarks: '',
    bookingId: null,
  };

  // Form data state
  const [formData, setFormData] = useState(initialData || initialFormState);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState({});
  
  // Data state
  const [buildings, setBuildings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  
  // Time options
  const timeOptions = useMemo(() => generateTimeOptions(), []);

  // Fetch buildings and rooms data when component mounts
  useEffect(() => {
    const fetchRoomsData = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/rooms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setAllRooms(response.data);
        
        // Extract unique buildings with their IDs
        const uniqueBuildingsMap = {};
        response.data.forEach(room => {
          const buildingId = room.buildingId || room.Building?.id || '';
          const buildingName = room.Building?.buildingName || room.building || 'Unknown Building';
          
          if (!uniqueBuildingsMap[buildingId]) {
            uniqueBuildingsMap[buildingId] = {
              id: buildingId,
              name: buildingName
            };
          }
        });
        
        // Convert to array and sort by name
        const uniqueBuildings = Object.values(uniqueBuildingsMap)
          .filter(building => building.id) // Filter out empty IDs
          .sort((a, b) => a.name.localeCompare(b.name));
          
        setBuildings(uniqueBuildings);
        
        // If edit mode, set the relevant data
        if (isEdit && initialData) {
          handleBuildingChangeWithId(initialData.buildingId || initialData.building);
          
          if (initialData.categoryId || initialData.category) {
            const categoriesForBuilding = getCategoriesForBuilding(initialData.buildingId || initialData.building);
            setCategories(categoriesForBuilding);
            
            // Find category ID from name if needed
            const categoryId = initialData.categoryId || categoriesForBuilding.find(cat => 
              cat.name === initialData.category)?.id;
              
            if (categoryId) {
              handleCategoryChangeWithId(categoryId);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching rooms data:', err);
        setError('Failed to load rooms data. Please try again.');
      }
    };
    
    fetchRoomsData();
  }, [token, isEdit, initialData]);

  // Get categories for a specific building
  const getCategoriesForBuilding = useCallback((buildingId) => {
    if (!buildingId || !allRooms.length) return [];
    
    // Filter rooms in this building
    const roomsInBuilding = allRooms.filter(room => {
      const roomBuildingId = room.buildingId || (room.Building?.id);
      return roomBuildingId === buildingId;
    });
    
    // Extract unique categories
    const uniqueCategoriesMap = {};
    roomsInBuilding.forEach(room => {
      const categoryId = room.categoryId || (room.Category?.id);
      const categoryName = room.Category?.categoryName || room.category || 'Unknown Category';
      
      if (categoryId && !uniqueCategoriesMap[categoryId]) {
        uniqueCategoriesMap[categoryId] = {
          id: categoryId,
          name: categoryName
        };
      }
    });
    
    return Object.values(uniqueCategoriesMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRooms]);

  // Handle building selection
  const handleBuildingChange = (e) => {
    const buildingId = e.target.value;
    handleBuildingChangeWithId(buildingId);
  };
  
  const handleBuildingChangeWithId = (buildingId) => {
    // Update form data and reset dependent fields
    setFormData(prev => ({
      ...prev,
      buildingId: buildingId,
      categoryId: '',
      roomId: null
    }));
    
    // Update available categories
    const categoriesForBuilding = getCategoriesForBuilding(buildingId);
    setCategories(categoriesForBuilding);
    
    // Clear available rooms
    setAvailableRooms([]);
    
    // Clear any building-related errors
    setFormError(prev => ({ ...prev, building: '', room: '' }));
  };

  // Handle category selection
  const handleCategoryChange = (e) => {
    const categoryId = e.target.value;
    handleCategoryChangeWithId(categoryId);
  };
  
  const handleCategoryChangeWithId = (categoryId) => {
    // Update form data
    setFormData(prev => ({
      ...prev,
      categoryId: categoryId,
      roomId: null
    }));
    
    // Filter available rooms based on building and category
    const buildingId = formData.buildingId;
    const roomsForBuildingAndCategory = allRooms.filter(room => {
      return room.buildingId === buildingId && room.categoryId === categoryId;
    });
    
    setAvailableRooms(roomsForBuildingAndCategory);
    
    // Clear any category-related errors
    setFormError(prev => ({ ...prev, room: '' }));
  };

  // Handle room selection
  const handleRoomChange = (e) => {
    const roomId = e.target.value;
    
    // Find the selected room
    const selectedRoom = allRooms.find(room => room.roomId.toString() === roomId);
    
    if (selectedRoom) {
      setFormData(prev => ({
        ...prev,
        roomId: roomId,
        bookingCapacity: selectedRoom.capacity || 1
      }));
      
      // Clear room-related errors
      setFormError(prev => ({ ...prev, room: '' }));
    }
  };

  // Handle general input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear any errors for this field
    if (formError[name]) {
      setFormError(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle time selection
  const handleTimeChange = (timeField, value) => {
    setFormData(prev => ({ ...prev, [timeField]: value }));
    
    // Validate start and end times
    if (timeField === 'startTime' && formData.endTime && value) {
      const startIndex = timeOptions.indexOf(value);
      const endIndex = timeOptions.indexOf(formData.endTime);
      
      if (startIndex >= endIndex) {
        setFormError(prev => ({
          ...prev,
          time: 'Start time must be before end time'
        }));
      } else {
        setFormError(prev => ({ ...prev, time: '' }));
      }
    } else if (timeField === 'endTime' && formData.startTime && value) {
      const startIndex = timeOptions.indexOf(formData.startTime);
      const endIndex = timeOptions.indexOf(value);
      
      if (startIndex >= endIndex) {
        setFormError(prev => ({
          ...prev,
          time: 'End time must be after start time'
        }));
      } else {
        setFormError(prev => ({ ...prev, time: '' }));
      }
    }
  };

  // Get filtered start times (all times)
  const getFilteredStartTimes = () => timeOptions;
  
  // Get filtered end times (only times after selected start time)
  const getFilteredEndTimes = () => {
    if (!formData.startTime) return timeOptions;
    
    const startIndex = timeOptions.indexOf(formData.startTime);
    return startIndex >= 0 ? timeOptions.slice(startIndex + 1) : timeOptions;
  };

  // Form validation
  const validateForm = () => {
    const errors = {};
    
    // Required fields
    if (!formData.title) errors.title = 'Title is required';
    if (!formData.firstName || !formData.lastName) errors.name = 'First and last name are required';
    if (!formData.department) errors.department = 'Department is required';
    if (!formData.buildingId) errors.building = 'Building is required';
    if (!formData.categoryId) errors.category = 'Category is required';
    if (!formData.roomId) errors.room = 'Room is required';
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.startTime) errors.startTime = 'Start time is required';
    if (!formData.endTime) errors.endTime = 'End time is required';
    
    // Validate recurring booking end date
    if (formData.recurring !== 'No' && !formData.recurrenceEndDate) {
      errors.recurrenceEndDate = 'Recurrence end date is required for recurring bookings';
    }
    
    // Check if end date is after start date for recurring bookings
    if (formData.recurring !== 'No' && formData.date && formData.recurrenceEndDate) {
      const startDate = new Date(formData.date);
      const endDate = new Date(formData.recurrenceEndDate);
      
      if (endDate <= startDate) {
        errors.recurrenceEndDate = 'Recurrence end date must be after booking date';
      }
    }
    
    setFormError(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Please correct the errors in the form.');
      return;
    }
    
    setSubmitLoading(true);
    setError('');
    
    // Convert time formats for API
    const convertTo24HourFormat = (time12h) => {
      if (!time12h) return '';
      
      const [time, modifier] = time12h.split(' ');
      let [hours, minutes] = time.split(':');
      
      if (hours === '12') {
        hours = modifier === 'PM' ? '12' : '00';
      } else {
        hours = modifier === 'PM' ? String(parseInt(hours, 10) + 12) : hours.padStart(2, '0');
      }
      
      return `${hours}:${minutes}`;
    };
    
    // Prepare submission data
    const bookingData = {
      ...formData,
      isRecurring: formData.recurring !== 'No',
      startTime: convertTo24HourFormat(formData.startTime),
      endTime: convertTo24HourFormat(formData.endTime),
      // Add other fields for API as needed
    };
    
    try {
      if (isEdit) {
        // Update existing booking
        await axios.put(
          `${API_BASE_URL}/bookings/${formData.bookingId || formData._id}`,
          bookingData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new booking
        await axios.post(
          `${API_BASE_URL}/bookings`,
          bookingData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      // On success
      onClose && onClose(true); // true indicates success
    } catch (err) {
      console.error('Error submitting booking:', err);
      setError(err.response?.data?.message || 'Failed to save booking. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setFormData(initialData || initialFormState);
    setError('');
    setFormError({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Booking Title</label>
          <input
            type="text"
            name="title"
            defaultValue={formData.title}
            onBlur={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
            onFocus={(e) => e.target.select()}
            required
            placeholder="Enter booking title"
            autoComplete="off"
            className={`w-full p-2 border ${formError.title ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          />
          {formError.title && <p className="text-red-500 text-xs mt-1">{formError.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            type="text"
            name="firstName"
            defaultValue={formData.firstName}
            onBlur={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
            required
            placeholder="Enter first name"
            autoComplete="off"
            className={`w-full p-2 border ${formError.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            type="text"
            name="lastName"
            defaultValue={formData.lastName}
            onBlur={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
            required
            placeholder="Enter last name"
            autoComplete="off"
            className={`w-full p-2 border ${formError.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select
            name="department"
            value={formData.department}
            onChange={handleInputChange}
            required
            className={`w-full p-2 border ${formError.department ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">Select Department</option>
            {DEPARTMENTS.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          {formError.department && <p className="text-red-500 text-xs mt-1">{formError.department}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
          <select
            name="buildingId"
            value={formData.buildingId || ''}
            onChange={handleBuildingChange}
            required
            className={`w-full p-2 border ${formError.building ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">Select Building</option>
            {buildings.map(building => (
              <option key={building.id} value={building.id}>
                {building.name}
              </option>
            ))}
          </select>
          {formError.building && <p className="text-red-500 text-xs mt-1">{formError.building}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            name="categoryId"
            value={formData.categoryId || ''}
            onChange={handleCategoryChange}
            required
            disabled={!formData.buildingId}
            className={`w-full p-2 border ${formError.category ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          {formError.category && <p className="text-red-500 text-xs mt-1">{formError.category}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
          <select
            name="roomId"
            value={formData.roomId || ''}
            onChange={handleRoomChange}
            required
            disabled={!formData.categoryId}
            className={`w-full p-2 border ${formError.room ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">Select Room</option>
            {availableRooms.map(room => (
              <option key={room.roomId} value={room.roomId}>
                {room.roomName} {room.capacity ? `(Capacity: ${room.capacity})` : ''}
              </option>
            ))}
          </select>
          {formError.room && <p className="text-red-500 text-xs mt-1">{formError.room}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleInputChange}
            required
            min={new Date().toISOString().split('T')[0]} // disables past dates
            className={`w-full p-2 border ${formError.date ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
          />
          {formError.date && <p className="text-red-500 text-xs mt-1">{formError.date}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <select
            name="startTime"
            value={formData.startTime || ''}
            onChange={(e) => handleTimeChange('startTime', e.target.value)}
            className={`w-full p-2 border ${formError.startTime || formError.time ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white`}
            required
          >
            <option value="">Select Start Time</option>
            {getFilteredStartTimes().map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {formError.startTime && <p className="text-red-500 text-xs mt-1">{formError.startTime}</p>}
          {formError.time && <p className="text-red-500 text-xs mt-1">{formError.time}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <select
            name="endTime"
            value={formData.endTime || ''}
            onChange={(e) => handleTimeChange('endTime', e.target.value)}
            className={`w-full p-2 border ${formError.endTime || formError.time ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white`}
            required
            disabled={!formData.startTime}
          >
            <option value="">Select End Time</option>
            {getFilteredEndTimes().map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
          {formError.endTime && <p className="text-red-500 text-xs mt-1">{formError.endTime}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recurring</label>
          <select
            name="recurring"
            value={formData.recurring}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="No">No</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
          </select>
        </div>

        {formData.recurring !== 'No' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence End Date</label>
            <input
              type="date"
              name="recurrenceEndDate"
              value={formData.recurrenceEndDate}
              onChange={handleInputChange}
              required
              min={formData.date} // End date must be after start date
              className={`w-full p-2 border ${formError.recurrenceEndDate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:ring-blue-500 focus:border-blue-500`}
            />
            {formError.recurrenceEndDate && <p className="text-red-500 text-xs mt-1">{formError.recurrenceEndDate}</p>}
          </div>
        )}

        {isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          name="notes"
          defaultValue={formData.notes}
          onBlur={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          rows="3"
          placeholder="Add any additional notes here"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isMealRoom"
            name="isMealRoom"
            checked={formData.isMealRoom}
            onChange={(e) => setFormData((prev) => ({ ...prev, isMealRoom: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isMealRoom" className="ml-2 block text-sm text-gray-700">
            Meal Room
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isBreakRoom"
            name="isBreakRoom"
            checked={formData.isBreakRoom}
            onChange={(e) => setFormData((prev) => ({ ...prev, isBreakRoom: e.target.checked }))}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isBreakRoom" className="ml-2 block text-sm text-gray-700">
            Break Room
          </label>
        </div>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Remarks</label>
        <textarea
          name="remarks"
          defaultValue={formData.remarks}
          onBlur={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
          rows="2"
          placeholder="Add any additional remarks here"
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => {
            onClose && onClose(false);
            resetForm();
          }}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          disabled={submitLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 ${submitLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
          disabled={submitLoading}
        >
          {submitLoading ? 'Processing...' : isEdit ? 'Update Booking' : 'Create Booking'}
        </button>
      </div>
    </form>
  );
};

export default BookingForm;