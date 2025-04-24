import React from 'react';

const CancelBookingConfirmation = ({ booking, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
            <svg
              className="h-6 w-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cancel Booking</h3>
          <p className="text-sm text-gray-500 mb-6">
            Are you sure you want to cancel the booking for <strong>{booking?.title}</strong> on{' '}
            <strong>{booking?.date}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              No, Keep Booking
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingConfirmation;