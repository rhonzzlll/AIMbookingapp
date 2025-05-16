import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Header from './Header';
import { Calendar, Clock, MapPin, AlertCircle, Phone, Mail, User } from 'lucide-react';
import AIMLogo from "../../images/AIM_Logo.png";
// import AIMbg from "../../images/AIM_bldg.jpng";
import home from "../../images/home.png";
 
import FacilityModal from '../../components/FacilityModal';

// Base URL for API requests
const API_BASE_URL = 'http://localhost:5000';

const token = localStorage.getItem('token');
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
};

// Default images for facilities when specific images aren't available
const AIMImage = "/placeholder-building.png";
const ACCImage = "/placeholder-building.png";

const HomePage = () => {
  const userId = localStorage.getItem('userId'); // Retrieve userId from localStorage

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

  // Fetch buildings from API
  const fetchBuildings = async () => {
    setBuildingsLoading(true);
    setBuildingsError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/buildings`, {
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
        console.log("Token being sent:", token);

        // Get user data from API
        // Get user data from API
        const userResponse = await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const userData = userResponse.data;
        setUser({
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImage: userData.profileImage || '/default-avatar.png',
          department: userData.department || '',
        });
        
        // Fetch bookings but handle 404 gracefully
        try {
          const bookingsResponse = await axios.get(`${API_BASE_URL}/api/bookings/user/${userId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          setBookings(bookingsResponse.data || []);
        } catch (bookingsErr) {
          console.log('No bookings found or bookings API not available:', bookingsErr);
          // Just set empty bookings instead of showing an error
          setBookings([]);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user profile');
        setLoading(false);
      }
    };
    
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

    // Add event listener for building data changes
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
      clearInterval(intervalId);
    };
  }, [userId, token]);

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((booking) => {
    const bookingDate = booking.date ? new Date(booking.date) : 
                        booking.startTime ? new Date(booking.startTime) : null;

    if (!bookingDate) return false;

    // Strip time to compare just the date part
    const bookingDay = new Date(bookingDate.toDateString());
    const todayDay = new Date(new Date().toDateString());

    if (activeTab === 'upcoming') {
      return bookingDay >= todayDay;
    } else if (activeTab === 'past') {
      return bookingDay < todayDay;
    }
    return true; // all tab
  });

  // Limit bookings to 5 for "upcoming" and "past" tabs
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
                        <BookingCard key={booking.bookingId} booking={booking} />
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
              <div className="flex space-x-6 text-sm">
                <a href="/terms" className="text-purple-200 hover:text-white transition-colors">
                  Terms Privacy
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
      
      {/* Facility Modal */}
      {showFacilityModal && (
        <FacilityModal onClose={() => setShowFacilityModal(false)} />
      )}
    </div>
  );
};

// Loading State Component
const LoadingState = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading your dashboard...</p>
    </div>
  </div>
);

// Error State Component
const ErrorState = ({ message }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
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
const BookingCard = ({ booking }) => {
  const [roomName, setRoomName] = useState('Loading...');

  // Fetch room details using roomId
  useEffect(() => {
    const fetchDetails = async () => {
      try {
        // Fetch room name
        if (booking.roomId) {
          const roomResponse = await axios.get(
            `http://localhost:5000/api/rooms/${booking.roomId}`
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

  const formatBookingDate = (dateString) => {
    try {
      const bookingDate = dateString ? new Date(dateString) : null;
      if (!bookingDate || isNaN(bookingDate)) {
        return { day: '', date: '', month: '' };
      }
      return {
        day: format(bookingDate, 'EEE'),
        date: format(bookingDate, 'dd'),
        month: format(bookingDate, 'MMM'),
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
      return format(date, 'h:mm a');
    } catch (error) {
      console.error('Time formatting error:', error);
      return timeString;
    }
  };

  const { day, date, month } = formatBookingDate(booking.date);
  const startTimeFormatted = formatTime(booking.startTime);
  const endTimeFormatted = formatTime(booking.endTime);
  const status = booking.status || 'pending';

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
              {booking.changedBy && (
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <User size={14} className="mr-1" />
                  Changed by {booking.changedBy}
                </div>
              )}
            </div>

            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${
                status === 'confirmed' || status === 'approved'
                  ? 'bg-green-100 text-green-600'
                  : status === 'pending'
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-red-100 text-red-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      </div>
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