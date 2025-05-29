import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from './Header';
import bg from '../../images/bg.png';

const API_BASE_URL = 'http://localhost:5000';

const TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', 
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

const BuildingDetails = () => {
  const { buildingId } = useParams();
  const navigate = useNavigate();

  const [building, setBuilding] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [roomCategories, setRoomCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useState({
    fromDate: format(new Date(), 'yyyy-MM-dd'),
    fromTime: '',
    toDate: format(new Date(), 'yyyy-MM-dd'),
    toTime: '',
    isRecurring: false,
  });

  function format(date, formatStr) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return formatStr.replace('yyyy', year).replace('MM', month).replace('dd', day);
  }

  useEffect(() => {
    fetchBuildingDetails();
  }, [buildingId]);

  const fetchBuildingDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch building details
      const buildingResponse = await axios.get(`${API_BASE_URL}/api/buildings/${buildingId}`, { headers });
      setBuilding(buildingResponse.data);
      
      // Fetch rooms in this building
      const roomsResponse = await axios.get(`${API_BASE_URL}/api/rooms?buildingId=${buildingId}`, { headers });
      const roomsData = roomsResponse.data;
      
      // Fetch bookings for these rooms
      const bookingsResponse = await axios.get(`${API_BASE_URL}/api/bookings`, { headers });
      const bookingsData = bookingsResponse.data;

      // Fetch room categories specifically for this building
      const categoriesResponse = await axios.get(`${API_BASE_URL}/api/categories`, { headers });
      
      // Filter categories for current building
      const relevantCategories = categoriesResponse.data 
        ? categoriesResponse.data.filter(cat => cat.buildingId.toString() === buildingId.toString())
        : [];
      
      // Create a map of category names to their descriptions for easier lookup
      const categoryDetails = {};
      if (relevantCategories.length > 0) {
        relevantCategories.forEach(cat => {
          categoryDetails[cat.categoryName] = {
            description: cat.categoryDescription,
            id: cat.categoryId
          };
        });
      }
      
      // Attach bookings and category details to their respective rooms
      const roomsWithDetails = roomsData.map(room => ({
        ...room,
        bookings: bookingsData.filter(booking => booking.room === room._id),
        categoryDetails: room.category ? categoryDetails[room.category] : null
      }));
      
      // Extract unique room categories from the API response
      const uniqueCategories = relevantCategories.length > 0
        ? relevantCategories.map(cat => cat.categoryName)
        : [...new Set(roomsData.map(room => room.category).filter(Boolean))];
      
      setRooms(roomsWithDetails);
      setFilteredRooms(roomsWithDetails);
      setRoomCategories(uniqueCategories);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching building details:', err);
      setError('Failed to load building details');
      setLoading(false);
    }
  };

  const handleCategoryChange = (category) => {
    setCurrentCategory(category);
    filterRooms(category, searchTerm);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    filterRooms(currentCategory, value);
  };

    // Filter rooms by comparing room.categoryId (number) to selected categoryId
const filterRooms = (categoryName, search) => {
  let filtered = rooms;

  if (categoryName) {
    filtered = filtered.filter(room => room.category === categoryName);
  }

  // Optional: Filter by search term too
  if (search) {
    filtered = filtered.filter(room =>
      room.roomName.toLowerCase().includes(search.toLowerCase()) ||
      (room.roomDescription && room.roomDescription.toLowerCase().includes(search.toLowerCase()))
    );
  }

  setFilteredRooms(filtered);
};

  const handleDateTimeChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchParams(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSearch = () => {
    const { fromDate, fromTime, toDate, toTime } = searchParams;
    
    // Filter by category and search term first
    let filtered = rooms;
    if (currentCategory) {
      filtered = filtered.filter(room => room.category === currentCategory);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(room =>
        room.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // If time filters are set, apply them
    if (fromTime && toTime) {
      const fromDateTime = new Date(`${fromDate}T${convertTo24HourFormat(fromTime)}`);
      const toDateTime = new Date(`${toDate}T${convertTo24HourFormat(toTime)}`);
      
      filtered = filtered.filter(room => {
        if (!room.bookings || room.bookings.length === 0) return true;
        
        return room.bookings.every(booking => {
          // Skip if dates don't match
          if (booking.fromDate !== fromDate && booking.toDate !== toDate) {
            return true;
          }
          
          const bookingStart = new Date(`${booking.fromDate}T${booking.fromTime}`);
          const bookingEnd = new Date(`${booking.toDate}T${booking.toTime}`);
          
          // Check for time overlap (return true if there's no conflict)
          return !(toDateTime > bookingStart && fromDateTime < bookingEnd);
        });
      });
    }
    
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
    if (!time) return false;
    
    const todayDate = new Date();
    const selectedDate = new Date(searchParams.fromDate);
  
    const todayFormatted = format(todayDate, 'yyyy-MM-dd');
    const selectedFormatted = format(selectedDate, 'yyyy-MM-dd');
  
    const time24 = convertTo24HourFormat(time);
    const optionDateTime = new Date(`${selectedFormatted}T${time24}:00`);
  
    // If user is searching today → compare to NOW
    if (todayFormatted === selectedFormatted) {
      if (compareTime) {
        const compareDateTime = new Date(`${todayFormatted}T${convertTo24HourFormat(compareTime)}:00`);
        return optionDateTime > compareDateTime;
      }
      return optionDateTime > todayDate;
    }
  
    // If user is searching future day → check against compare time if provided
    if (compareTime) {
      const compareDateTime = new Date(`${selectedFormatted}T${convertTo24HourFormat(compareTime)}:00`);
      return optionDateTime > compareDateTime;
    }
    
    return true; // All times allowed if different date
  };

  const isTimeSlotTaken = (timeStr) => {
    if (!rooms || rooms.length === 0 || !timeStr) return false;
    
    const fromDate = searchParams.fromDate;
    const time24 = convertTo24HourFormat(timeStr);
    const selectedTime = new Date(`${fromDate}T${time24}`);
  
    return rooms.some(room => 
      room.bookings &&
      room.bookings.some(booking => {
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
      fromTime: searchParams.fromTime || '09:00 AM',
      toDate: searchParams.toDate || format(new Date(), 'yyyy-MM-dd'),
      toTime: searchParams.toTime || '10:00 AM',
    };

    const bookingData = { room, searchParams: validatedSearchParams };

    navigate('/forms', {
      state: { bookingData },
    });
  };

  const futureStartTimes = useMemo(() => {
    return TIME_OPTIONS.filter(time => 
      isFutureTime(time) && 
      !isTimeSlotTaken(time)
    );
  }, [searchParams.fromDate, rooms]);
  
  const futureEndTimes = useMemo(() => {
    return TIME_OPTIONS.filter(time => 
      isFutureTime(time) &&
      (!searchParams.fromTime || isFutureTime(time, searchParams.fromTime)) &&
      !isTimeSlotTaken(time)
    );
  }, [searchParams.fromDate, searchParams.fromTime, rooms]);

  if (loading) return (
    <div className="flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="ml-3">Loading building details...</p>
    </div>
  );
  
  if (error) return (
    <div className="text-center py-10">
      <p className="text-red-600">{error}</p>
      <Link to="/Home" className="text-blue-600 hover:underline mt-4 inline-block">
        Return to Home
      </Link>
    </div>
  );
  
  const getRoomImageSrc = (room) => {
  if (room.roomImageUrl) return room.roomImageUrl;
  if (room.roomImage && !room.roomImage.startsWith('roomImage-')) {
    return `data:image/jpeg;base64,${room.roomImage}`;
  }
  if (room.roomImage) {
    return `${API_BASE_URL}/api/uploads/${room.roomImage}`;
  }
  return null;
};

  return (
    <div className="font-sans">
      <div className="fixed top-0 left-0 w-full z-50">
        <Header />
      </div>

      <div className=" pt-16 px-4 pb-8">
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
      
      <div className="relative w-full">
        {building && (
          <div>
            {/* Sidebar */}
            <div className="fixed top-21 left-20 bottom-5 w-80 overflow-y-auto p-6 z-20">
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
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
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

                {/* Room Categories */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 mt-2">Room Types</h2>
                  <ul className="space-y-3 mt-2">
                    <li className="flex items-center">
                      <input
                        className="mr-2"
                        type="radio"
                        id="allRooms"
                        checked={currentCategory === ''}
                        onChange={() => handleCategoryChange('')}
                      />
                      <label htmlFor="allRooms" className="text-gray-700">All Rooms</label>
                    </li>
                    {roomCategories.map((category, index) => (
                      <li key={index} className="flex items-center">
                        <input
                          className="mr-2"
                          type="radio"
                          id={`category-${index}`}
                          checked={currentCategory === category}
                          onChange={() => handleCategoryChange(category)}
                        />
                        <label htmlFor={`category-${index}`} className="text-gray-700">
                          {category}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="ml-40 pr-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  {currentCategory ? currentCategory + ' Rooms' : 'Available Rooms'}
                </h2>
                
                {filteredRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px] text-black-600 bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold">No rooms available</h3>
                    <p className="mt-2 text-sm">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredRooms.map(room => (
                      <div key={room._id} className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col p-6 min-h-[400px]">
                        {room.roomImage && (
                        <div className="h-48 overflow-hidden">
                            <img
                            src={getRoomImageSrc(room)}
                            alt={room.roomName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.src = '/placeholder-room.png';
                            }}
                            />
                        </div>
                        )}
                        
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{room.roomName}</h3>
                            <p className="text-gray-600 mb-4">{room.roomDescription || "No description available"}</p>
                            
                            {room.capacity && (
                              <p className="text-sm text-gray-500 mb-2">
                                Capacity: {room.capacity} people
                              </p>
                            )}
                            
                            {room.features && room.features.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {room.features.map((feature, index) => (
                                  <span key={index} className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full">
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            )}
                            
                            {room.category && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                                {room.category}
                              </span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleReserve(room)}
                            className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium"
                          >
                            Reserve
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default BuildingDetails;