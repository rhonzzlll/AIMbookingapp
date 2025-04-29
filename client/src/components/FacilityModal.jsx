import React from 'react';
import AIMImage from '../images/AIM.png';
import ACCImage from '../images/ACC.png';
import { Link } from 'react-router-dom';

const FacilityModal = ({ onClose }) => {
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

        <div className="grid md:grid-cols-2 gap-6">
          <FacilityCard
            imageSrc={AIMImage}
            title="Asian Institute of Management Building"
            description="Contemporary venue perfect for conferences, workshops, and high-level discussions."
            bookingLink="/aim-rooms"
            features={["Minimal outside noise", "Air conditioning", "Creative Atmosphere"]}
          />
          <FacilityCard
            imageSrc={ACCImage}
            title="Asian Institute of Management Conference Center Building"
            description="Modern space for meetings, seminars, and executive discussions."
            bookingLink="/acc-rooms"
            features={["Tech-Ready", "Quiet and Private", "Modern and Bright", "Air conditioning"]}
          />
        </div>
      </div>
    </div>
  );
};

// Copied version of FacilityCard to keep this component self-contained
const FacilityCard = ({ imageSrc, title, description, bookingLink, features }) => {
  return (
    <div className="bg-white text-gray-800 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 overflow-hidden">
        <img src={imageSrc} alt={title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
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
