import React from 'react';

const Modal = ({ isOpen, onClose, booking }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-11/12 max-w-md">
        <h2 className="text-xl font-bold mb-4">Booking Details</h2>
        {booking ? (
          <div>
            <p><strong>Title:</strong> {booking.title}</p>
            <p><strong>First Name:</strong> {booking.firstName}</p>
            <p><strong>Last Name:</strong> {booking.lastName}</p>
            <p><strong>Department:</strong> {booking.department}</p>
            <p><strong>Room Type:</strong> {booking.roomType}</p>
            <p><strong>Meeting Room:</strong> {booking.meetingRoom}</p>
            <p><strong>Building:</strong> {booking.building}</p>
            <p><strong>Date:</strong> {booking.date}</p>
            <p><strong>Time:</strong> {booking.time}</p>
            <p><strong>Notes:</strong> {booking.notes}</p>
            <p><strong>Status:</strong> {booking.status}</p>
            <p><strong>Recurring:</strong> {booking.recurring}</p>
          </div>
        ) : (
          <p>No booking details available.</p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;