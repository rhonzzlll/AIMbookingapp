import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Header from './Header';
import { Calendar, Clock, MapPin, AlertCircle, Phone, Mail } from 'lucide-react';
import AIMLogo from "../../images/AIM_Logo.png";
import AIMbg from "../../images/AIM_bldg.jpg";

const HomePage = () => {
  const userId = localStorage.getItem('_id'); // Retrieve userId from localStorage
  const token = localStorage.getItem('token'); // Get token for authenticated requests

  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    profileImage: '',
    department: '',
  });

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [visibleCount, setVisibleCount] = useState(5); // Limit to 5 bookings by default

  useEffect(() => {
    const fetchUserAndBookings = async () => {
      try {
        // Fetch user data
        const userResponse = await axios.get(`http://localhost:5000/api/users/${userId}`, {
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

        const bookingsResponse = await axios.get(`http://localhost:5000/api/bookings/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (bookingsResponse.data && Array.isArray(bookingsResponse.data)) {
          setBookings(bookingsResponse.data);
        } else {
          setBookings([]);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.response && err.response.status === 404) {
          setBookings([]);
          setLoading(false);
        } else {
          setError('Failed to fetch data');
          setLoading(false);
        }
      }
    };

    if (userId && token) {
      fetchUserAndBookings();
    } else {
      setError('User not authenticated');
      setLoading(false);
    }
  }, [userId, token]);

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter((booking) => {
    const bookingDate = booking.date ? new Date(booking.date) : 
                        booking.startTime ? new Date(booking.startTime) : null;

    if (!bookingDate) return false;

    const today = new Date();

    if (activeTab === 'upcoming') {
      return bookingDate >= today;
    } else if (activeTab === 'past') {
      return bookingDate < today;
    }
    return true; // all tab
  });

  // Limit bookings to 5 for "upcoming" and "past" tabs
  const displayedBookings =
    activeTab === 'all' ? filteredBookings : filteredBookings.slice(0, visibleCount);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="relative min-h-screen w-full overflow-x-auto">
      {/* Fixed Background Image and Overlay */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${AIMbg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-40" />
      </div>

      {/* Scrollable Foreground Layer */}
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        {/* Fixed Header */}
        <header className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
          <Header />
        </header>

        {/* Main content with dark overlay */}
        <main className="pt-16 text-white flex-grow">
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
                            if (tab === 'all') setVisibleCount(filteredBookings.length); // Show all bookings
                          }}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className={`space-y-4 ${
                      activeTab === 'all' ? 'max-h-96 overflow-y-auto' : ''
                    }`}
                  >
                    {displayedBookings.length > 0 ? (
                      displayedBookings.map((booking) => (
                        <BookingCard key={booking._id} booking={booking} />
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <AlertCircle size={32} className="mx-auto" />
                        </div>
                        <p className="text-gray-500">No bookings found</p>
                        <Link
                          to="/book-room"
                          className="mt-4 text-blue-600 text-sm font-medium hover:underline block"
                        >
                          Book a room now
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Facilities */}
                <div>
                  <h2 className="text-xl font-bold mb-4 text-white">Available Facilities</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <FacilityCard
                      imageSrc="/images/AIM.png"
                      title="Asian Institute of Management Building"
                      description="Contemporary venue perfect for conferences, workshops, and high-level discussions."
                      bookingLink="/aim-rooms"
                      features={["Minimal outside noise", "Air conditioning", "Creative Atmosphere"]}
                    />
                    <FacilityCard
                      imageSrc="/images/ACC.png"
                      title="Asian Institute of Management Conference Center Building"
                      description="Modern space for meetings, seminars, and executive discussions."
                      bookingLink="/acc-rooms"
                      features={["Tech-Ready", "Quiet and Private", "Modern and Bright", "Air conditioning"]}
                    />
                  </div>
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
    </div>
  );
}

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
  // Function to format date from startTime (ISO format) to readable date
  const formatBookingDate = (dateString) => {
    try {
      // Try to use startTime first, fall back to date field if available
      const bookingDate = dateString ? new Date(dateString) : 
                        booking.startTime ? new Date(booking.startTime) : null;
      
      if (!bookingDate || isNaN(bookingDate)) {
        return { day: '', date: '', month: '' };
      }
      
      return {
        day: format(bookingDate, 'EEE'),
        date: format(bookingDate, 'dd'),
        month: format(bookingDate, 'MMM')
      };
    } catch (error) {
      console.error('Date formatting error:', error);
      return { day: '', date: '', month: '' };
    }
  };

  // Format time from 24-hour format to 12-hour format
  const formatTime = (timeString) => {
    if (!timeString) return '';
    
    try {
      // Handle ISO date strings
      if (timeString.includes('T') || timeString.includes('Z')) {
        const date = new Date(timeString);
        if (isNaN(date)) return '';
        return format(date, 'h:mm a');
      }

      // Handle 24-hour format (HH:MM)
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes);
        return format(date, 'h:mm a');
      }
      
      return timeString; // Return as is if format is unknown
    } catch (error) {
      console.error('Time formatting error:', error);
      return timeString;
    }
  };

  const { day, date, month } = formatBookingDate(booking.date);
  
  // Get room title (handle different property names)
  const roomTitle = booking.title || booking.room || 'Untitled Booking';
  
  // Format start and end times
  const startTimeFormatted = formatTime(booking.startTime);
  const endTimeFormatted = formatTime(booking.endTime);
  
  // Get building and floor information
  const buildingName = booking.building || '';
  const roomName = booking.room || '';
  const floorName = booking.floor || '';
  
  // Default to 'pending' if status is not provided
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
              <h3 className="font-bold text-lg">{roomTitle}</h3>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <Clock size={14} className="mr-1" />
                {startTimeFormatted} - {endTimeFormatted}
              </div>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <MapPin size={14} className="mr-1" />
                {buildingName}{buildingName && roomName ? ', ' : ''}{roomName}{(buildingName || roomName) && floorName ? ', ' : ''}{floorName}
              </div>
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
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 overflow-hidden">
        <img src={imageSrc} alt={title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4">{description}</p>

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