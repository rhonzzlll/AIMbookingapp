import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';

const API_BASE_URL = 'http://localhost:5000/api';

const AccRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [currentRoomType, setCurrentRoomType] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState({
    fromDate: format(new Date(), 'yyyy-MM-dd'),
    fromTime: '09:00',
    toDate: format(new Date(), 'yyyy-MM-dd'),
    toTime: '10:00',
    isRecurring: false,
  });

  const navigate = useNavigate();

  // Helper function for date formatting
  function format(date, formatStr) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return formatStr.replace('yyyy', year).replace('MM', month).replace('dd', day);
  }

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`);
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();

      // Filter rooms to include only those from the ACC Building
      const accBuildingRooms = data.filter(
        (room) => room.building && room.building === 'ACC Building'
      );

      // Extract unique room types for filtering
      const uniqueRoomTypes = [...new Set(accBuildingRooms.map((room) => room.category))];
      setRoomTypes(uniqueRoomTypes);

      setRooms(accBuildingRooms);
      setFilteredRooms(accBuildingRooms); // Initially show all ACC Building rooms
    } catch (error) {
      console.error('Error fetching ACC Building rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoomTypeChange = (roomType) => {
    setCurrentRoomType(roomType);
    if (roomType) {
      setFilteredRooms(rooms.filter((room) => room.category === roomType));
    } else {
      setFilteredRooms(rooms); // Show all rooms if no type is selected
    }
  };

  const handleReserve = (room) => {
    // Make sure we have date/time values set before navigating
    const validatedSearchParams = {
      ...searchParams,
      fromDate: searchParams.fromDate || format(new Date(), 'yyyy-MM-dd'),
      fromTime: searchParams.fromTime || '09:00',
      toDate: searchParams.toDate || format(new Date(), 'yyyy-MM-dd'),
      toTime: searchParams.toTime || '10:00',
    };

    // Pass only the room ID and search parameters
    const bookingData = {
      roomId: room._id, // Save the room ID
      searchParams: validatedSearchParams,
    };

    console.log('Navigating to booking form with data:', bookingData);

    // Navigate to the booking form with the room ID and search parameters
    navigate('/forms', {
      state: { bookingData },
    });
  };

  const handleSearchChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchParams({
      ...searchParams,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSearch = () => {
    console.log('Search parameters:', searchParams);
    // In a real application, you would filter rooms based on availability
    // For now, we'll just log the search parameters
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header at the top */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>

      {/* Main Content */}
      <div className="pt-16 px-4 pb-8">
        {/* Centered Search Bar */}
        <div className="max-w-3xl mx-auto mb-8">
          <SearchBar
            searchParams={searchParams}
            handleSearchChange={handleSearchChange}
            handleSearch={handleSearch}
          />
        </div>

        {/* Room Selection Area */}
        <div className="flex flex-col md:flex-row max-w-6xl mx-auto">
          {/* Left Sidebar - Room Types */}
          <div className="w-full md:w-64 mb-6 md:mb-0 md:mr-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-bold mb-4">Room Types</h2>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <input
                    className="form-check-input mr-2"
                    type="radio"
                    id="allRooms"
                    checked={currentRoomType === ''}
                    onChange={() => handleRoomTypeChange('')}
                  />
                  <label className="form-check-label text-gray-700" htmlFor="allRooms">
                    All Rooms
                  </label>
                </li>
                {roomTypes.map((roomType, index) => (
                  <li key={index} className="flex items-center">
                    <input
                      className="form-check-input mr-2"
                      type="radio"
                      id={`roomType-${index}`}
                      checked={currentRoomType === roomType}
                      onChange={() => handleRoomTypeChange(roomType)}
                    />
                    <label className="form-check-label text-gray-700" htmlFor={`roomType-${index}`}>
                      {roomType}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Main Content Area - Room Cards */}
          <div className="flex-1">
            {loading ? (
              <div className="text-center py-16">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Loading rooms...</p>
              </div>
            ) : (
              <>
                {/* Room Type Title */}
                <h1 className="text-3xl font-bold mb-6 uppercase">
                  {currentRoomType || 'All Rooms'}
                </h1>

                {/* Room Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredRooms.map((room) => (
                    <div key={room._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      {/* Room Image */}
                      <div className="h-48 bg-gray-200 relative">
                        <img
                          src={
                            room.roomImage
                              ? `data:image/jpeg;base64,${room.roomImage}`
                              : '/placeholder.jpg'
                          }
                          alt={`${room.roomName} room`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Room Details */}
                      <div className="p-4">
                        <h3 className="text-xl font-bold mb-2">{room.roomName}</h3>
                        <p className="text-gray-600 mb-4">{room.description}</p>
                        <div className="flex justify-between mb-4">
                          <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {room.category}
                          </span>
                          <span className="text-sm bg-gray-100 text-gray-800 px-2 py-1 rounded">
                            Capacity: {room.capacity || 'N/A'}
                          </span>
                        </div>
                        <button
                          onClick={() => handleReserve(room)}
                          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200"
                        >
                          Reserve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Search Bar Component
const SearchBar = ({ searchParams, handleSearchChange, handleSearch }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
        {/* From Section */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <div className="flex space-x-2">
            <input
              type="date"
              name="fromDate"
              value={searchParams.fromDate}
              onChange={handleSearchChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="time"
              name="fromTime"
              value={searchParams.fromTime}
              onChange={handleSearchChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* To Section */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
          <div className="flex space-x-2">
            <input
              type="date"
              name="toDate"
              value={searchParams.toDate}
              onChange={handleSearchChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="time"
              name="toTime"
              value={searchParams.toTime}
              onChange={handleSearchChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Recurring Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isRecurring"
            name="isRecurring"
            checked={searchParams.isRecurring}
            onChange={handleSearchChange}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="isRecurring" className="ml-2 text-sm text-gray-700">
            Recurring
          </label>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="bg-blue-600 text-white py-2 px-8 rounded-md hover:bg-blue-700 transition duration-200"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default AccRooms;