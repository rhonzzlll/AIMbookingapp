import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from './Header';

const API_BASE_URL = 'http://localhost:5000';

const TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM',
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

const RoomCard = ({ room, onReserve }) => {
  const [imgError, setImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleImageError = () => {
    setImgError(true);
    setIsLoading(false);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  let imageUrl = room.roomImage;
  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
    imageUrl = `${API_BASE_URL}/uploads/${imageUrl}`;
  } else if (imageUrl && imageUrl.startsWith('/')) {
    imageUrl = `${API_BASE_URL}${imageUrl}`;
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="h-48 overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-0">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        )}
        <img
          src={imgError ? '/placeholder-room.png' : (imageUrl || '/placeholder-room.png')}
          alt={room.roomName}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 relative z-10"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-800 mb-2">{room.roomName}</h3>
          <p className="text-gray-600 mb-4">{room.roomDescription || "No description available"}</p>
          {room.roomCapacity && (
            <p className="text-sm text-gray-500 mb-2">
              Capacity: {room.roomCapacity} people
            </p>
          )}
        </div>
        <button
          onClick={() => onReserve(room)}
          className="w-full mt-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 rounded-md hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-medium"
        >
          Reserve
        </button>
      </div>
    </div>
  );
};

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

      const buildingResponse = await axios.get(`${API_BASE_URL}/api/buildings/${buildingId}`, { headers });
      setBuilding(buildingResponse.data);

      const roomsResponse = await axios.get(`${API_BASE_URL}/api/rooms?buildingId=${buildingId}`, { headers });
      const roomsData = roomsResponse.data;

      const bookingsResponse = await axios.get(`${API_BASE_URL}/api/bookings`, { headers });
      const bookingsData = bookingsResponse.data;

      const categoriesResponse = await axios.get(`${API_BASE_URL}/api/categories`, { headers });

      const relevantCategories = categoriesResponse.data
        ? categoriesResponse.data.filter(cat => cat.buildingId.toString() === buildingId.toString())
        : [];

      const categoryDetails = {};
      if (relevantCategories.length > 0) {
        relevantCategories.forEach(cat => {
          categoryDetails[cat.categoryName] = {
            description: cat.categoryDescription,
            id: cat.categoryId,
          };
        });
      }

      // Attach bookings and category details to their respective rooms
      let roomsWithDetails = roomsData.map(room => ({
        ...room,
        bookings: bookingsData.filter(booking => booking.room === room._id),
        categoryDetails: room.category ? categoryDetails[room.category] : null,
      }));

      // Sort rooms by categoryId (ascending)
      roomsWithDetails = roomsWithDetails.sort((a, b) => {
        if (a.categoryId && b.categoryId) {
          return a.categoryId - b.categoryId;
        }
        return 0;
      });

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

  const filterRooms = (category, search) => {
    let filtered = rooms;

    if (category) {
      filtered = filtered.filter(room => room.category === category);
    }

    if (search) {
      filtered = filtered.filter(room =>
        room.roomName.toLowerCase().includes(search.toLowerCase()) ||
        (room.description && room.description.toLowerCase().includes(search.toLowerCase()))
      );
    }

    setFilteredRooms(filtered);
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

  const groupedRooms = useMemo(() => {
    const groups = {};
    rooms.forEach(room => {
      const catName = room.Category?.categoryName || 'Uncategorized';
      const catId = room.Category?.categoryId || 0;
      if (!groups[catId]) {
        groups[catId] = { name: catName, rooms: [] };
      }
      groups[catId].rooms.push(room);
    });
    // Sort by categoryId
    return Object.entries(groups)
      .sort((a, b) => a[0] - b[0])
      .map(([id, group]) => ({ id, ...group }));
  }, [rooms]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="ml-3">Loading building details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600">{error}</p>
        <Link to="/Home" className="text-blue-600 hover:underline mt-4 inline-block">
          Return to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto pt-16 pb-8">
        {building && (
          <div className="flex">
            <div className="w-80 flex-shrink-0 mr-8 p-6">
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">Find a Room</h2>
                <div className="relative w-full">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search"
                    className="w-full px-4 py-2 pr-10 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
                    aria-label="Search"
                  />
                  <span
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-300"
                    aria-hidden="true"
                  >
                    🔍
                  </span>
                </div>
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
            <div className="flex-1">
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">{building.buildingName}</h1>
                <p className="text-gray-600">{building.buildingDescription}</p>
              </div>
              <div className="mb-10">
                {groupedRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px] text-gray-600 bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-semibold">No rooms available</h3>
                    <p className="mt-2 text-sm">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  groupedRooms.map(category => (
                    <div key={category.id} className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-800 mb-4">{category.name} Rooms</h2>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {category.rooms.map(room => (
                          <RoomCard key={room.roomId} room={{
                            ...room,
                            roomImage: room.roomImageUrl || room.roomImage,
                            roomName: room.roomName,
                            roomDescription: room.roomDescription,
                            roomCapacity: room.roomCapacity
                          }} onReserve={handleReserve} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BuildingDetails;