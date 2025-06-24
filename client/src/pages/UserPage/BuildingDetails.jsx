import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Header from './Header';
import bg from '../../images/bg.png';

// Use environment variable for API base URL
const API_BASE_URL = import.meta.env.VITE_API_URI;

const TIME_OPTIONS = [
  '8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', 
  '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM', '10:00 PM',
];

const BuildingDetails = () => {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const bookNowMode = location.state?.searchAllBuildings === true;

  const [building, setBuilding] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [roomCategories, setRoomCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchParams, setSearchParams] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '',
    endTime: '',
    isRecurring: false,
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchAllBuildings, setSearchAllBuildings] = useState(bookNowMode);

  function format(date, formatStr) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return formatStr.replace('yyyy', year).replace('MM', month).replace('dd', day);
  }

  useEffect(() => {
    fetchBuildingDetails();
    // eslint-disable-next-line
  }, [buildingId, searchAllBuildings]);

  // Apply filters whenever rooms, currentCategory, or searchTerm changes
  useEffect(() => {
    applyFilters();
  }, [rooms, currentCategory, searchTerm]);

  // This effect handles the initial setting of searchAllBuildings from location state
  useEffect(() => {
    if (location.state?.searchAllBuildings) {
      setSearchAllBuildings(true);
      // Optionally clear the state (if using React Router v6+)
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Helper function to flatten rooms and subrooms into a single array
  const flattenRoomsWithSubrooms = (roomsData, bookingsData) => {
    const flattenedRooms = [];

    roomsData.forEach(room => {
      // Add the main room
      const mainRoom = {
        ...room,
        bookings: bookingsData.filter(booking => booking.room === room._id),
        category: room.Category?.categoryName || room.category || '',
        categoryDetails: room.Category || null,
        isSubroom: false,
        parentRoomId: null,
        parentRoomName: null,
        displayName: room.roomName,
        uniqueId: room._id || room.roomId,
        capacity: room.roomCapacity,
        description: room.roomDescription,
        image: room.roomImage,
        imageUrl: room.roomImageUrl,
      };
      flattenedRooms.push(mainRoom);

      // Add each subroom as a separate room
      if (room.subRooms && room.subRooms.length > 0) {
        room.subRooms.forEach(subroom => {
          const subroomAsRoom = {
            ...subroom,
            // Use subroom's own ID for bookings
            bookings: bookingsData.filter(booking => booking.room === subroom.subroomId),
            category: room.Category?.categoryName || room.category || '',
            categoryDetails: room.Category || null,
            isSubroom: true,
            parentRoomId: room._id || room.roomId,
            parentRoomName: room.roomName,
            displayName: `${room.roomName} - ${subroom.subRoomName}`,
            uniqueId: subroom.subroomId,
            roomName: `${room.roomName} - ${subroom.subRoomName}`,
            capacity: subroom.subRoomCapacity,
            roomCapacity: subroom.subRoomCapacity,
            description: subroom.subRoomDescription,
            roomDescription: subroom.subRoomDescription,
            image: subroom.subRoomImage,
            roomImage: subroom.subRoomImage,
            imageUrl: subroom.subRoomImageUrl,
            roomImageUrl: subroom.subRoomImageUrl,
            // Keep original IDs for reservation
            _id: subroom.subroomId,
            roomId: subroom.subroomId,
            originalParentRoom: room,
          };
          flattenedRooms.push(subroomAsRoom);
        });
      }
    });

    console.log("🛏️ Flattened Rooms:", flattenedRooms);
    flattenedRooms.forEach(room => {
      console.log(`📦 Room: ${room.displayName || room.roomName}`);
      room.bookings.forEach(bk => {
        console.log("  🧾 Booking:", bk);
      });
    });

    return flattenedRooms;
  };

  const fetchBuildingDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
<<<<<<< HEAD
      
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
=======

      // Fetch building details (always fetch for sidebar info)
      const buildingResponse = await axios.get(`${API_BASE_URL}/buildings/${buildingId}`, { headers });
      setBuilding(buildingResponse.data);

      // Fetch rooms: use buildingId only if not searching all buildings
      let roomsUrl = `${API_BASE_URL}/rooms`;
      if (!searchAllBuildings) {
        roomsUrl += `?buildingId=${buildingId}`;
      }
      const roomsResponse = await axios.get(roomsUrl, { headers });
      const roomsData = roomsResponse.data;

      // Fetch bookings for these rooms
      const bookingsResponse = await axios.get(`${API_BASE_URL}/bookings`, { headers });
      const bookingsData = bookingsResponse.data;

      // Flatten rooms and subrooms
      const flattenedRooms = flattenRoomsWithSubrooms(roomsData, bookingsData);

      // Extract unique categories
      const uniqueCategories = [
        ...new Set(
          flattenedRooms
            .map(room => (room.category || '').trim())
            .filter(Boolean)
        ),
      ];

      setRooms(flattenedRooms);
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
      setRoomCategories(uniqueCategories);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching building details:', err);
      setError('Failed to load building details');
      setLoading(false);
    }
  };

  // Separate function to apply filters (called by useEffect)
  const applyFilters = () => {
    let filtered = [...rooms];

<<<<<<< HEAD
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
=======
    // Apply category filter
    if (currentCategory) {
      filtered = filtered.filter(room =>
        room.category &&
        room.category.toString().toLowerCase() === currentCategory.toString().toLowerCase()
      );
    }

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(room =>
        (room.displayName && room.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (room.roomName && room.roomName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (room.roomDescription && room.roomDescription.toLowerCase().includes(searchTerm.toLowerCase()))
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
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

<<<<<<< HEAD
  const convertTo24HourFormat = (timeStr) => {
    if (!timeStr) return '';
    
    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
  
=======
  const handleCategoryChange = (category) => {
    setCurrentCategory(category);
    // The useEffect will handle the filtering
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    // The useEffect will handle the filtering
  };

  const handleDateTimeChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSearchParams((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  function buildISODate(dateString, timeString) {
    // Ensure date is provided
    if (!dateString || !timeString) return null;
    // Convert time to 24-hour and add seconds if missing
    let time24 = timeString;
    if (typeof time24 !== "string") return null;
    if (time24.match(/am|pm/i)) {
      time24 = convertTo24HourFormat(time24);
    }
    if (/^\d{2}:\d{2}$/.test(time24)) {
      time24 = time24 + ':00';
    }
    // If after all that, still not valid, bail out
    if (!/^\d{2}:\d{2}:\d{2}$/.test(time24)) return null;
    return `${dateString}T${time24}`;
  }

  const handleSearch = async () => {
    setSearchLoading(true);
    const { date, startTime, endTime } = searchParams;

    if (!startTime || !endTime) {
      setSearchLoading(false);
      return;
    }

    // Use the currently filtered rooms (by category/search)
    // Always start from all rooms, then apply category and search term filters
let base = [...rooms];
if (currentCategory) {
  base = base.filter(room =>
    room.category &&
    room.category.toString().toLowerCase() === currentCategory.toString().toLowerCase()
  );
}
if (searchTerm) {
  base = base.filter(room =>
    (room.displayName && room.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (room.roomName && room.roomName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (room.roomDescription && room.roomDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  );
}
    // Prepare all availability checks in parallel
    const availabilityPromises = base.map(async (room) => {
      try {
        const res = await axios.post(
          `${API_BASE_URL}/bookings/check-availability`, // <-- use dash, not camelCase
          {
            date,
            startTime: convertTo24HourFormat(startTime) + ':00',
            endTime: convertTo24HourFormat(endTime) + ':00',
            roomId: room.uniqueId,
            buildingId: room.buildingId || buildingId,
            categoryId: room.categoryDetails?._id || room.categoryId || undefined,
          }
        );
        return res.data.available ? room : null;
      } catch (err) {
        // If error, treat as unavailable
        return null;
      }
    });

    // Wait for all checks to finish
    const availableRooms = (await Promise.all(availabilityPromises)).filter(Boolean);

    setFilteredRooms(availableRooms);
    setSearchLoading(false);
  };

  // --- Helper functions and the rest ---

  const convertTo24HourFormat = (timeStr) => {
    if (!timeStr) return '';

    const [time, modifier] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
    if (modifier === 'PM' && hours !== 12) {
      hours += 12;
    }
    if (modifier === 'AM' && hours === 12) {
      hours = 0;
    }
<<<<<<< HEAD
  
=======

>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const isFutureTime = (time, compareTime = null) => {
    if (!time) return false;
<<<<<<< HEAD
    
    const todayDate = new Date();
    const selectedDate = new Date(searchParams.fromDate);
  
    const todayFormatted = format(todayDate, 'yyyy-MM-dd');
    const selectedFormatted = format(selectedDate, 'yyyy-MM-dd');
  
    const time24 = convertTo24HourFormat(time);
    const optionDateTime = new Date(`${selectedFormatted}T${time24}:00`);
  
    // If user is searching today → compare to NOW
=======

    const todayDate = new Date();
    const selectedDate = new Date(searchParams.date);

    const todayFormatted = format(todayDate, 'yyyy-MM-dd');
    const selectedFormatted = format(selectedDate, 'yyyy-MM-dd');

    const time24 = convertTo24HourFormat(time);
    const optionDateTime = new Date(`${selectedFormatted}T${time24}:00`);

>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
    if (todayFormatted === selectedFormatted) {
      if (compareTime) {
        const compareDateTime = new Date(`${todayFormatted}T${convertTo24HourFormat(compareTime)}:00`);
        return optionDateTime > compareDateTime;
      }
      return optionDateTime > todayDate;
    }
<<<<<<< HEAD
  
    // If user is searching future day → check against compare time if provided
=======

>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
    if (compareTime) {
      const compareDateTime = new Date(`${selectedFormatted}T${convertTo24HourFormat(compareTime)}:00`);
      return optionDateTime > compareDateTime;
    }
<<<<<<< HEAD
    
    return true; // All times allowed if different date
=======

    return true;
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
  };

  const isTimeSlotTaken = (timeStr) => {
    if (!rooms || rooms.length === 0 || !timeStr) return false;
<<<<<<< HEAD
    
    const fromDate = searchParams.fromDate;
    const time24 = convertTo24HourFormat(timeStr);
    const selectedTime = new Date(`${fromDate}T${time24}`);
  
    return rooms.some(room => 
      room.bookings &&
      room.bookings.some(booking => {
        const bookingStart = new Date(`${booking.fromDate}T${booking.fromTime}`);
        const bookingEnd = new Date(`${booking.toDate}T${booking.toTime}`);
=======

    const date = searchParams.date;
    const time24 = convertTo24HourFormat(timeStr);
    const selectedTime = new Date(`${date}T${time24}:00`);

    return rooms.some(room => 
      room.bookings &&
      room.bookings.some(booking => {
        const bookingStart = new Date(`${booking.date}T${booking.startTime}`);
        const bookingEnd = new Date(`${booking.date}T${booking.endTime}`);
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
        return selectedTime >= bookingStart && selectedTime < bookingEnd;
      })
    );
  };
<<<<<<< HEAD
  
=======

>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
  const handleReserve = (room) => {
    // Use defaults only if empty
    const validatedSearchParams = {
      ...searchParams,
      date: searchParams.date || format(new Date(), 'yyyy-MM-dd'),
      startTime: searchParams.startTime || '09:00 AM',
      endTime: searchParams.endTime || '10:00 AM',
    };

    let roomForReservation = { ...room };

    // If it's a subroom, cascade parent room's details
    if (room.isSubroom && room.originalParentRoom) {
      roomForReservation = {
        ...room,
        buildingId: room.originalParentRoom.buildingId,
        buildingName: room.originalParentRoom.buildingName,
        categoryId: room.originalParentRoom.categoryId,
        categoryName: room.originalParentRoom.categoryName,
        roomId: room.uniqueId,
        roomName: room.displayName || room.roomName,
      };
    } else {
      // For main rooms, ensure all fields are present
      roomForReservation = {
        ...room,
        buildingId: room.buildingId,
        buildingName: room.buildingName,
        categoryId: room.categoryId,
        categoryName: room.categoryName,
        roomId: room.uniqueId,
        roomName: room.displayName || room.roomName,
      };
    }

    const bookingData = { room: roomForReservation, searchParams: validatedSearchParams };

    navigate('/forms', {
      state: { bookingData },
    });
  };

<<<<<<< HEAD
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
=======
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Only filter by present/future time if date is today, else show all times
  const availableStartTimes = useMemo(() => {
    if (searchParams.date === todayStr) {
      const now = new Date();
      return TIME_OPTIONS.filter(time => {
        const [hour, minute] = convertTo24HourFormat(time).split(':').map(Number);
        const nowHour = now.getHours();
        const nowMinute = now.getMinutes();
        return hour > nowHour || (hour === nowHour && minute > nowMinute);
      });
    }
    return TIME_OPTIONS;
  }, [searchParams.date]);

  const availableEndTimes = useMemo(() => {
    // End time must be after start time
    const startIdx = searchParams.startTime ? TIME_OPTIONS.indexOf(searchParams.startTime) + 1 : 0;
    return TIME_OPTIONS.slice(startIdx);
  }, [searchParams.startTime]);
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c

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
<<<<<<< HEAD
  if (room.roomImageUrl) return room.roomImageUrl;
  if (room.roomImage && !room.roomImage.startsWith('roomImage-')) {
    return `data:image/jpeg;base64,${room.roomImage}`;
  }
  if (room.roomImage) {
    return `${API_BASE_URL}/api/uploads/${room.roomImage}`;
  }
  return null;
};
=======
    // Handle both room and subroom images
    const imageUrl = room.imageUrl || room.roomImageUrl;
    const image = room.image || room.roomImage;
    
    if (imageUrl) return imageUrl;
    if (image && !image.startsWith('roomImage-')) {
      return `data:image/jpeg;base64,${image}`;
    }
    if (image) {
      return `${API_BASE_URL}/api/uploads/${image}`;
    }
    return null;
  };
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c

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
<<<<<<< HEAD
            <div className="fixed top-21 left-20 bottom-5 w-80 overflow-y-auto p-6 z-20">
              <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">Find a Room</h2>
                
=======
              <div className="fixed left-20 bottom-5 w-[420px] overflow-y-auto p-6 z-20">
                <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">Find a Room</h2>
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
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
                  <ul className="space-y-3 mt-2 px-3 py-2">
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
                    {[...roomCategories]
                      .map(cat => (cat || '').trim())
                      .filter(Boolean)
                      .sort((a, b) => a.localeCompare(b))
                      .map((category, index) => (
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

                <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md mx-auto">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Search Available</h2>
                  
                  {/* Date */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      name="date"
                      value={searchParams.date}
                      onChange={handleDateTimeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  
                  {/* From Time */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                    <select
                      name="startTime"
                      value={searchParams.startTime}
                      onChange={handleDateTimeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="">Select Start Time</option>
                      {availableStartTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* To Time */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                    <select
                      name="endTime"
                      value={searchParams.endTime}
                      onChange={handleDateTimeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                    >
                      <option value="">Select End Time</option>
                      {availableEndTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Search All Buildings Toggle - moved above the button */}
                  {!bookNowMode && (
                    <div className="flex items-center mb-6">
                      <input
                        type="checkbox"
                        id="searchAllBuildings"
                        checked={searchAllBuildings}
                        onChange={(e) => setSearchAllBuildings(e.target.checked)}
                        className="w-6 h-6 mr-2"
                      />
                      <label htmlFor="searchAllBuildings" className="text-lg font-bold text-blue-700">
                        Search all buildings
                      </label>
                    </div>
                  )}

                  {/* Search Button */}
                  <button
                    onClick={handleSearch}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-all duration-300 font-medium"
                  >
                    Search Available Rooms
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="ml-40 pr-8">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  {currentCategory ? currentCategory + ' Rooms' : 'Available Rooms'}
                </h2>
                
<<<<<<< HEAD
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
=======
                {
                  searchLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[200px] text-blue-600 bg-white rounded-lg shadow p-6">
                      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                      <span className="font-semibold">Searching for available rooms...</span>
                    </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px] text-gray-600 bg-white rounded-lg shadow p-6">
                    <span className="font-semibold">No rooms found for your search.</span>
                  </div>
                ) : (
                <div className="grid lg:grid-cols-3 gap-8" style={{ minWidth: '1320px' }}>
                  {filteredRooms.map(room => (
                      <div key={room.uniqueId} className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col p-6 min-h-[400px] w-[420px]">
                        {(room.image || room.roomImage) && (
                        <div className="h-48 overflow-hidden">
                            <img
                            src={getRoomImageSrc(room)}
                            alt={room.displayName || room.roomName}
                            className="w-full h-full object-cover "
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
                            onError={(e) => {
                                e.target.src = '/placeholder-room.png';
                            }}
                            />
                        </div>
                        )}
                        
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex-1">
<<<<<<< HEAD
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{room.roomName}</h3>
                            <p className="text-gray-600 mb-4">{room.roomDescription || "No description available"}</p>
                            
                            {room.capacity && (
                              <p className="text-sm text-gray-500 mb-2">
                                Capacity: {room.capacity} people
=======
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                              {room.displayName || room.roomName}
                            </h3>
                            {room.isSubroom && (
                              <p className="text-sm text-blue-600 mb-2">
                                Subroom of: {room.parentRoomName}
                              </p>
                            )}
                            <p className="text-gray-600 mb-4">
                              {room.description || room.roomDescription || "No description available"}
                            </p>
                            
                            {(room.capacity || room.roomCapacity) && (
                              <p className="text-sm text-gray-500 mb-2">
                                Capacity: {room.capacity || room.roomCapacity} people
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
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
<<<<<<< HEAD
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                                {room.category}
                              </span>
=======
                              <div className="flex flex-wrap gap-2 mb-4">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                                  {room.category}
                                </span>
                                {room.isSubroom && (
                                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                                    Subroom
                                  </span>
                                )}
                              </div>
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
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