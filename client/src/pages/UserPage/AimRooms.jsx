import React, { useState } from 'react';
import Header from './Header';

const AccRooms = () => {
  const [selectedRooms, setSelectedRooms] = useState([]);

  const roomTypes = [
    'Hybrid Caseroom',
    'Regular Caseroom',
    'Flatroom',
    'Meeting Room',
    'Mini Studio',
  ];

  const handleCheckboxChange = (room) => {
    setSelectedRooms((prevSelectedRooms) =>
      prevSelectedRooms.includes(room)
        ? prevSelectedRooms.filter((r) => r !== room)
        : [...prevSelectedRooms, room]
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Ensure the Header spans the full width */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 1000 }}>
        <Header />
      </div>

      {/* Main Content - Left aligned */}
      <div className="pl-4 pt-20">
        <h1 className="text-3xl font-bold mb-6">AIM Rooms Page</h1>
        <p className="text-gray-600 mb-8">Select the room types you want to book:</p>

        {/* Card for Room Types */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 max-w-md">
          <h5 className="text-xl font-bold mb-4">Available Room Types</h5>
          <p className="text-gray-600 mb-4">Select the room types you want to book below:</p>
          <ul className="space-y-4">
            {roomTypes.map((room, index) => (
              <li key={index} className="flex items-center">
                <input
                  className="form-check-input mr-2"
                  type="checkbox"
                  value={room}
                  id={`room-${index}`}
                  checked={selectedRooms.includes(room)}
                  onChange={() => handleCheckboxChange(room)}
                />
                <label className="form-check-label text-gray-700" htmlFor={`room-${index}`}>
                  {room}
                </label>
              </li>
            ))}
          </ul>
        </div>

        {/* Card for Selected Rooms */}
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
          <h5 className="text-xl font-bold mb-4">Selected Rooms</h5>
          {selectedRooms.length > 0 ? (
            <ul className="list-disc list-inside text-gray-700">
              {selectedRooms.map((room, index) => (
                <li key={index}>{room}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No rooms selected.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccRooms;