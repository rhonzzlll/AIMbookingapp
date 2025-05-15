import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5000';
const token = localStorage.getItem('token');

const FacilityModal = ({ onClose }) => {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFacilities = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/buildings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const processedFacilities = response.data.map((facility) => {
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
          amenities: facility.amenities || [],
        };
      });

      setFacilities(processedFacilities);
    } catch (err) {
      console.error('Error fetching facilities:', err);
      setError('Failed to load facilities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white text-gray-800 rounded-xl shadow-lg w-full max-w-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-700 text-xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold mb-4 text-center">Select a Facility</h2>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="ml-2 text-black">Loading facilities...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchFacilities}
              className="mt-4 text-blue-600 text-sm font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        ) : facilities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No facilities available at the moment</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {facilities.map((facility) => (
              <FacilityCard
                key={facility.buildingId}
                imageSrc={facility.buildingImage}
                title={facility.buildingName}
                description={facility.buildingDescription}
                bookingLink={`/building/${facility.buildingId}`}
                features={facility.amenities}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FacilityCard = ({ imageSrc, title, description, bookingLink, features }) => {
  return (
    <div className="bg-white text-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 overflow-hidden">
        <img
          src={imageSrc || '/placeholder-building.png'}
          alt={title}
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-4">{description}</p>
        {features?.length > 0 && (
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

export default FacilityModal;