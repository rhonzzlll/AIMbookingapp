import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatusModal = ({ isOpen, currentStatus, onClose, onConfirm, bookingId }) => {
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [declineReason, setDeclineReason] = useState(''); // New state for decline reason
  const API_BASE_URL = 'http://localhost:5000/api';

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');

        if (!token || !userId) {
          console.log("No token or userId found");
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data) {
          const name = `${response.data.firstName} ${response.data.lastName}`;
          setUserName(name);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchUserInfo();
      setDeclineReason(''); // Reset decline reason when modal opens
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Modified onConfirm to pass declineReason if declining
  const handleConfirm = () => {
    if (currentStatus === 'declined') {
      onConfirm(declineReason);
    } else {
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="text-xl font-semibold mb-4">Update Booking Status</div>

        <p className="mb-4">
          Are you sure you want to {currentStatus === 'confirmed' ? 'confirm' : 'decline'} this booking?
        </p>

        <div className={`p-4 mb-4 rounded-md ${
          currentStatus === 'confirmed' ? 'bg-green-100' : 'bg-red-100'
        }`}>
          <p><strong>New status will be:</strong> {currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1)}</p>
          <p><strong>Changed by:</strong> {isLoading ? "Loading..." : userName || "You"}</p>
        </div>

        {/* Show reason for decline input if declining */}
        {currentStatus === 'declined' && (
          <div className="mb-4">
            <label htmlFor="declineReason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for decline
            </label>
            <textarea
              id="declineReason"
              className="w-full border rounded p-2"
              placeholder="Enter reason for declining this booking"
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-white rounded ${
              currentStatus === 'confirmed' 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
            disabled={currentStatus === 'declined' && !declineReason.trim()}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusModal;