import React, { useState, useEffect } from 'react';
import { useMemo } from 'react'; 
import { useNavigate } from 'react-router-dom';
import { format as dateFormat } from 'date-fns'; // Import date-fns format function
import bg from '../../images/bg.png';
import Header from './Header';

const API_BASE_URL = 'http://localhost:5000/api';

const TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', 
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

const AccRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [currentRoomType, setCurrentRoomType] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useState({
    fromDate: format(new Date(), 'yyyy-MM-dd'),
    fromTime: '',
    toDate: format(new Date(), 'yyyy-MM-dd'),
    toTime: '',
    isRecurring: false,
  });  

  const navigate = useNavigate();

  // Custom format function for dates
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
      const roomsResponse = await fetch(`${API_BASE_URL}/rooms`);
      if (!roomsResponse.ok) throw new Error('Failed to fetch rooms');
      const roomsData = await roomsResponse.json();
  
      const bookingsResponse = await fetch(`${API_BASE_URL}/bookings`);
      if (!bookingsResponse.ok) throw new Error('Failed to fetch bookings');
      const bookingsData = await bookingsResponse.json();
  
      // Attach bookings to rooms manually
      const roomsWithBookings = roomsData.map(room => ({
        ...room,
        bookings: bookingsData.filter(booking => booking.room === room._id),
      }));
  
      const accBuildingRooms = roomsWithBookings.filter(
        (room) => room.building && room.building === 'ACC Building'
      );
  
      const uniqueRoomTypes = [...new Set(accBuildingRooms.map((room) => room.category))];
      setRoomTypes(uniqueRoomTypes);
      setRooms(accBuildingRooms);
      setFilteredRooms(accBuildingRooms);
    } catch (error) {
      console.error('Error fetching ACC Building rooms:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRoomTypeChange = (roomType) => {
    setCurrentRoomType(roomType);
    const base = roomType
      ? rooms.filter((room) => room.category === roomType)
      : rooms;
    const filtered = searchTerm
      ? base.filter((room) =>
          room.roomName.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : base;
    setFilteredRooms(filtered);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    const base = currentRoomType
      ? rooms.filter((room) => room.category === currentRoomType)
      : rooms;

    const filtered = base.filter((room) =>
      room.roomName.toLowerCase().includes(value.toLowerCase())
    );

    setFilteredRooms(filtered);
  };

  const handleDateTimeChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSearch = () => {
    const { fromDate, fromTime, toDate, toTime } = searchParams;
  
    const base = currentRoomType
      ? rooms.filter((room) => room.category === currentRoomType)
      : rooms;
  
    if (!fromTime || !toTime) {
      const filtered = searchTerm
        ? base.filter((room) =>
            room.roomName.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : base;
  
      setFilteredRooms(filtered);
      return;
    }
  
    const fromDateTime = new Date(`${fromDate}T${fromTime}`);
    const toDateTime = new Date(`${toDate}T${toTime}`);
  
    const filtered = base.filter((room) => {
      if (!room.bookings || room.bookings.length === 0) return true;
  
      return room.bookings.every((booking) => {
        if (booking.fromDate !== fromDate && booking.toDate !== toDate) {
          return true; // No date conflict
        }
  
        const bookingStart = new Date(`${booking.fromDate}T${booking.fromTime}`);
        const bookingEnd = new Date(`${booking.toDate}T${booking.toTime}`);
  
        // Conflict if time ranges overlap
        const isConflict = !(toDateTime <= bookingStart || fromDateTime >= bookingEnd);
        return !isConflict; // Only keep room if NO conflict
      });
    });
  
    setFilteredRooms(filtered);
  };

  const convertTo24HourFormat = (timeStr) => {
    if (!timeStr) return '';
    
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
  
    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
  
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const isFutureTime = (time, compareTime = null) => {
    const todayDate = new Date();
    const selectedDate = new Date(searchParams.fromDate); // User selected date
  
    const todayFormatted = format(todayDate, 'yyyy-MM-dd');
    const selectedFormatted = format(selectedDate, 'yyyy-MM-dd');
  
    const time24 = convertTo24HourFormat(time);
    const optionDateTime = new Date(`${selectedFormatted}T${time24}:00`);
  
    // If user is searching today ➔ compare to NOW
    if (todayFormatted === selectedFormatted) {
      if (compareTime) {
        const compareDateTime = new Date(`${todayFormatted}T${convertTo24HourFormat(compareTime)}:00`);
        return optionDateTime > compareDateTime;
      }
      return optionDateTime > todayDate;
    }
  
    // If user is searching future day ➔ all times allowed
    if (compareTime) {
      const compareDateTime = new Date(`${selectedFormatted}T${convertTo24HourFormat(compareTime)}:00`);
      return optionDateTime > compareDateTime;
    }
    
    return true; // all times allowed if different date
  };

  const isTimeSlotTaken = (timeStr) => {
    if (!rooms || rooms.length === 0) return false;
    
    const fromDate = searchParams.fromDate;
    const time24 = convertTo24HourFormat(timeStr);
    if (!time24) return false;
    
    const selectedTime = new Date(`${fromDate}T${time24}`);
  
    return rooms.some((room) => 
      room.bookings &&
      room.bookings.some((booking) => {
        const bookingStart = new Date(`${booking.fromDate}T${booking.fromTime}`);
        const bookingEnd = new Date(`${booking.toDate}T${booking.toTime}`);
        return selectedTime >= bookingStart && selectedTime < bookingEnd;
      })
    );
  };
  
  const handleReserve = (room) => {
    const validatedSearchParams = {
      ...searchParams,
      fromDate: searchParams.fromDate || format(new Date(), 'yyyy-MM-dd'),
      fromTime: searchParams.fromTime || '09:00',
      toDate: searchParams.toDate || format(new Date(), 'yyyy-MM-dd'),
      toTime: searchParams.toTime || '10:00',
    };

    const bookingData = { room, searchParams: validatedSearchParams };

    navigate('/forms', {
      state: { bookingData },
    });
  };

  const futureStartTimes = useMemo(() => {
    return TIME_OPTIONS.filter((time) => 
      isFutureTime(time) && 
      !isTimeSlotTaken(time)   
    );
  }, [searchParams.fromDate, rooms]);
  
  const futureEndTimes = useMemo(() => {
    return TIME_OPTIONS.filter((time) => 
      isFutureTime(time) &&
      (!searchParams.fromTime || isFutureTime(time, searchParams.fromTime)) &&
      !isTimeSlotTaken(time)  
    );
  }, [searchParams.fromDate, searchParams.fromTime, rooms]);
  
  return (
    <div className="font-sans">
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>

      <div className="pt-16 px-4 pb-8">
        {/* Background */}
        <div className="fixed inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              backgroundAttachment: "fixed",
            }}
          />
          <div className="absolute inset-0 bg-black bg-opacity-10" />
        </div>

        {/* Main Layout */}
        <div className="relative w-full">
          {/* Sidebar */}
          <div className="fixed top-16 left-0 bottom-0 w-80 overflow-y-auto p-6 z-20">
            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">Find a Room</h2>
              {/* Search input */}
              <div className="relative w-full">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder=""
                  className="w-full px-4 py-2 pr-10 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                  aria-label="Search"
                />
                {!searchTerm && (
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-black pointer-events-none">
                    Search
                  </span>
                )}
                <span
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300"
                  aria-hidden="true"
                >
                  🔍
                </span>
              </div>

              {/* From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="date"
                    name="fromDate"
                    value={searchParams.fromDate}
                    onChange={handleDateTimeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <select
                    name="fromTime"
                    value={searchParams.fromTime}
                    onChange={handleDateTimeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Select Start Time</option>
                    {futureStartTimes.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="date"
                    name="toDate"
                    value={searchParams.toDate}
                    onChange={handleDateTimeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <select
                    name="toTime"
                    value={searchParams.toTime}
                    onChange={handleDateTimeChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="">Select End Time</option>
                    {futureEndTimes.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search button */}
              <button
                onClick={handleSearch}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 rounded-md hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
              >
                Search
              </button>

              {/* Room Types */}
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mt-2">Room Types</h2>
                <ul className="space-y-3 mt-2">
                  <li className="flex items-center">
                    <input
                      className="mr-2"
                      type="radio"
                      id="allRooms"
                      checked={currentRoomType === ''}
                      onChange={() => handleRoomTypeChange('')}
                    />
                    <label htmlFor="allRooms" className="text-gray-700">All Rooms</label>
                  </li>
                  {roomTypes.map((roomType, index) => (
                    <li key={index} className="flex items-center">
                      <input
                        className="mr-2"
                        type="radio"
                        id={`roomType-${index}`}
                        checked={currentRoomType === roomType}
                        onChange={() => handleRoomTypeChange(roomType)}
                      />
                      <label htmlFor={`roomType-${index}`} className="text-gray-700">
                        {roomType}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Room Cards */}
          <div className="w-full right-10">
            {loading ? (
              <div className="text-center py-20">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Loading rooms...</p>
              </div>
            ) : (
              <>
                <h1 className="text-3xl font-bold mb-6 uppercase text-gray-800">
                  {currentRoomType || 'All Rooms'}
                </h1>
                
                {filteredRooms.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10 w-full px-4">
                    {filteredRooms.map((room) => (
                      <div
                        key={room._id}
                        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-gray-200 flex flex-col h-full w-full"
                      >
                        {/* Room Image */}
                        <div className="h-64 bg-gray-100">
                          {room.roomImage ? (
                            <img
                              src={`data:image/jpeg;base64,${room.roomImage}`}
                              alt={`${room.roomName} room`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Room Info */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2">
                            <h3 className="text-xl font-semibold text-gray-800">{room.roomName}</h3>
                            <p className="text-sm text-gray-600">{room.description}</p>
                          </div>

                          {/* Bottom: Capacity, Category, Button */}
                          <div className="mt-4 space-y-2">
                            <div className="flex justify-between text-sm text-gray-700">
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                                {room.category}
                              </span>
                              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                                Capacity: {room.capacity || 'N/A'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleReserve(room)}
                              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium"
                            >
                              Reserve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-600">
                    <h2 className="text-2xl font-semibold">No available rooms found.</h2>
                    <p className="mt-2 text-sm">Try adjusting your search time or filters.</p>
                  </div>
                )}  
                <div className="flex justify-center mt-10">
                  <button
                    onClick={() => navigate('/aim-rooms')}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm md:text-base font-semibold py-2 px-4 transition-all duration-300 shadow-md"
                  >
                    Book AIM Room
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccRooms;