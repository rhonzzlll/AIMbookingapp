import React, { useState } from 'react';
import Header from './Header';

const AccRooms = () => {
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [currentRoomType, setCurrentRoomType] = useState('Hybrid Caseroom');

  const roomTypes = [
    'Hybrid Caseroom',
    'Regular Caseroom',
    'Flatroom',
    'Meeting Room',
    'Mini Studio',
  ];

  // Sample room data
  const roomsByType = {
    'Hybrid Caseroom': [
      { id: 1, name: 'ABS-CBN', image: '/room-placeholder.jpg' },
      { id: 2, name: 'Lopez', image: '/room-placeholder.jpg' },
      { id: 3, name: 'FPH', image: '/room-placeholder.jpg' },
      { id: 4, name: 'Meralco', image: '/room-placeholder.jpg' },
    ],
    'Regular Caseroom': [
      { id: 5, name: 'Room A', image: '/room-placeholder.jpg' },
      { id: 6, name: 'Room B', image: '/room-placeholder.jpg' },
    ],
    // Add data for other room types
  };

  const handleRoomTypeChange = (roomType) => {
    setCurrentRoomType(roomType);
  };

  const handleCheckboxChange = (room) => {
    setSelectedRooms((prevSelectedRooms) =>
      prevSelectedRooms.includes(room)
        ? prevSelectedRooms.filter((r) => r !== room)
        : [...prevSelectedRooms, room]
    );
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
          <SearchBar />
        </div>

        {/* Room Selection Area */}
        <div className="flex flex-col md:flex-row max-w-6xl mx-auto">
          {/* Left Sidebar - Room Types */}
          <div className="w-full md:w-64 mb-6 md:mb-0 md:mr-6">
            <div className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-bold mb-4">Room Types</h2>
              <ul className="space-y-2">
                {roomTypes.map((roomType, index) => (
                  <li key={index} className="flex items-center">
                    <input
                      className="form-check-input mr-2"
                      type="checkbox"
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
              
              <div className="mt-8">
                <button className="w-full bg-blue-100 text-blue-700 py-2 px-4 rounded-md border border-blue-300 hover:bg-blue-200 transition duration-200">
                  Back
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area - Room Cards */}
          <div className="flex-1">
            {/* Room Type Title */}
            <h1 className="text-3xl font-bold mb-6 uppercase">{currentRoomType}</h1>

            {/* Room Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(roomsByType[currentRoomType] || []).map((room) => (
                <div key={room.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Room Image */}
                  <div className="h-48 bg-gray-200 relative">
                    <img
                      src="/api/placeholder/400/320"
                      alt={`${room.name} room`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Room Details */}
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-2">{room.name}</h3>
                    <div className="flex space-x-2 mb-4">
                      <div className="bg-gray-200 rounded-full px-3 py-1 text-sm">&nbsp;</div>
                      <div className="bg-gray-200 rounded-full px-3 py-1 text-sm w-16">&nbsp;</div>
                    </div>
                    <div className="bg-gray-200 rounded-full px-3 py-1 text-sm w-24 mb-4">&nbsp;</div>
                    
                    <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-200">
                      Reserve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Search Bar Component
const SearchBar = () => {
  const [fromDate, setFromDate] = useState('2025-03-28');
  const [fromTime, setFromTime] = useState('');
  const [toDate, setToDate] = useState('2025-03-28');
  const [toTime, setToTime] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  const handleSearch = () => {
    const searchData = {
      fromDate,
      fromTime,
      toDate,
      toTime,
      isRecurring,
    };

    console.log('Search data:', searchData);
    // Add API call logic here if needed
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row md:items-end md:space-x-4 space-y-4 md:space-y-0">
        {/* From Section */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
          <div className="flex space-x-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
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
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Recurring Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="recurring"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="recurring" className="ml-2 text-sm text-gray-700">
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