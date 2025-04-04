import React from 'react';

const DeleteConfirmation = ({ room, onConfirm, onCancel }) => {
  const isQuadrant = room?.subRooms?.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Confirm Deletion</h2>
        
        <p className="mb-4">
          Are you sure you want to delete the room "{room?.name}"?
        </p>
        
        {isQuadrant && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4">
            <p className="text-yellow-800 font-medium">Warning</p>
            <p className="text-yellow-700 text-sm">
              This is a quadrant room with {room?.subRooms?.length} sub-rooms. 
              Deleting this room will also remove all its sub-rooms.
            </p>
          </div>
        )}
        
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation;