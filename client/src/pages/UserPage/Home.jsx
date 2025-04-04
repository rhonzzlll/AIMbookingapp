import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import Header from './Header';
import { Calendar, Clock, MapPin, AlertCircle } from 'lucide-react';

// Main Home Page Component
const HomePage = () => {
  const [bookings, setBookings] = useState([]);
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    const fetchUserAndBookings = async () => {
      try {
        // Simulate loading with mock data
        setTimeout(() => {
          setUser({
            firstName: 'Rhonzel',
            lastName: 'Santos',
          });
          setBookings([
            {
              id: 'book-001',
              title: 'Conference Room A',
              date: '2025-04-05',
              startTime: '10:00 AM',
              endTime: '12:00 PM',
              room: 'Room A',
              building: 'AIM Building',
              floor: '3rd Floor',
              status: 'confirmed',
              participants: 12,
            },
            {
              id: 'book-002',
              title: 'Meeting Room B',
              date: '2025-04-06',
              startTime: '2:00 PM',
              endTime: '4:00 PM',
              room: 'Room B',
              building: 'ACC Building',
              floor: '2nd Floor',
              status: 'pending',
              participants: 8,
            },
            {
              id: 'book-003',
              title: 'Executive Boardroom',
              date: '2025-04-10',
              startTime: '9:00 AM',
              endTime: '11:30 AM',
              room: 'Boardroom',
              building: 'AIM Building',
              floor: '5th Floor',
              status: 'confirmed',
              participants: 6,
            },
          ]);
          setLoading(false);
        }, 800); // Simulate network delay
      } catch (err) {
        setError('Failed to fetch data');
        setLoading(false);
      }
    };

    fetchUserAndBookings();
  }, []);

  // Filter bookings based on active tab
  const filteredBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.date);
    const today = new Date();

    if (activeTab === 'upcoming') {
      return bookingDate >= today;
    } else if (activeTab === 'past') {
      return bookingDate < today;
    }
    return true; // all tab
  });

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 w-full z-50 bg-white shadow-md">
        <Header />
      </div>

      {/* Main Content */}
      <div className="pt-16 pb-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Welcome! </h1>
                <p className="text-blue-100">Find and book your ideal meeting space today</p>
              </div>
              
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Left Column - Stats */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden">
                    <img
                      src={user.profileImage}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{user.firstName} {user.lastName}</h2>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-bold text-lg mb-4">Need Help?</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Contact our support team for assistance with bookings or technical issues.
                </p>
                <button className="w-full bg-gray-100 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors">
                  Contact Support
                </button>
              </div>
            </div>

            {/* Right Column - Bookings & Facilities */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">My Bookings</h2>
                  <div className="flex rounded-lg overflow-hidden border">
                    <button
                      className={`px-4 py-1 text-sm ${activeTab === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                      onClick={() => setActiveTab('upcoming')}
                    >
                      Upcoming
                    </button>
                    <button
                      className={`px-4 py-1 text-sm ${activeTab === 'past' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                      onClick={() => setActiveTab('past')}
                    >
                      Past
                    </button>
                    <button
                      className={`px-4 py-1 text-sm ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                      onClick={() => setActiveTab('all')}
                    >
                      All
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 mb-2">
                        <AlertCircle size={32} className="mx-auto" />
                      </div>
                      <p className="text-gray-500">No bookings found</p>
                      <button className="mt-4 text-blue-600 text-sm font-medium hover:underline">
                        Book a room now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <h2 className="text-xl font-bold mt-8 mb-4">Available Facilities</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <FacilityCard
                  imageSrc="/src/images/AIM.png"
                  title="AIM Building"
                  description="Contemporary venue perfect for conferences, workshops, and high-level discussions."
                  bookingLink="/aim-rooms"
                  features={['Lorem', 'Lorem Ipsum', 'Lorem Ipsum']}
                />
                <FacilityCard
                  imageSrc="/src/images/ACC.png"
                  title="ACC Building"
                  description="Modern space for meetings, seminars, and executive discussions with state-of-the-art equipment."
                  bookingLink="/acc-rooms"
                  features={['Lorem Ipsum', 'Lorem Ipsum', 'Lorem Ipsum ']}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
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
      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Try Again
      </button>
    </div>
  </div>
);

// Booking Card Component
const BookingCard = ({ booking }) => {
  return (
    <div className="border border-gray-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Left side - Date */}
        <div className={`p-4 text-center flex-shrink-0 ${booking.status === 'confirmed' ? 'bg-green-50' :
          booking.status === 'pending' ? 'bg-yellow-50' : 'bg-red-50'
          }`}>
          <div className="md:w-24">
            <p className="text-sm font-medium text-gray-500">
              {format(new Date(booking.date), 'EEE')}
            </p>
            <p className="text-2xl font-bold">
              {format(new Date(booking.date), 'dd')}
            </p>
            <p className="text-sm font-medium">
              {format(new Date(booking.date), 'MMM')}
            </p>
          </div>
        </div>

        {/* Right side - Details */}
        <div className="p-4 flex-grow">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-bold text-lg">{booking.title}</h3>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <Clock size={14} className="mr-1" />
                {booking.startTime} - {booking.endTime}
              </div>
              <div className="flex items-center text-gray-500 text-sm mt-1">
                <MapPin size={14} className="mr-1" />
                {booking.building}, {booking.room}, {booking.floor}
              </div>
            </div>

            <span
              className={`px-3 py-1 text-xs font-medium rounded-full ${booking.status === 'confirmed'
                ? 'bg-green-100 text-green-600'
                : booking.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'bg-red-100 text-red-600'
                }`}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>

          <div className="flex justify-between items-end mt-4">
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                Reschedule
              </button>
              <button className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Facility Card Component
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