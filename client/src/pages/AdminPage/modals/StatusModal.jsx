import React from 'react';

const StatusModal = ({ isOpen, currentStatus, adminName, onClose, onConfirm }) => {
  if (!isOpen) return null;

  const getStatusColor = () => {
    if (currentStatus === 'confirmed') return 'bg-green-100 text-green-800 border-green-200';
    if (currentStatus === 'declined') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  const getStatusText = () => {
    if (currentStatus === 'confirmed') return 'Confirm';
    if (currentStatus === 'declined') return 'Decline';
    return 'Update';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Update Booking Status</h3>
        
        <div className="mb-4">
          <p className="mb-2">Are you sure you want to {getStatusText().toLowerCase()} this booking?</p>
          
          <div className={`p-3 rounded-md ${getStatusColor()} mb-3`}>
            <p className="font-medium">
              New status will be: <span className="font-semibold capitalize">{currentStatus}</span>
            </p>
            <p className="text-sm mt-1">
              Changed by: <span className="font-medium">{adminName || 'Admin'}</span>
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-md 
              ${currentStatus === 'confirmed' ? 'bg-green-600 hover:bg-green-700' : 
                currentStatus === 'declined' ? 'bg-red-600 hover:bg-red-700' :
                'bg-blue-600 hover:bg-blue-700'}`}
          >
            {getStatusText()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatusModal;