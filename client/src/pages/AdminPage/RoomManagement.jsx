import React, { useState, useEffect } from 'react';
import RoomList from './RoomList';
import RoomForm from './RoomForm';
import DeleteConfirmation from './modals/DeleteConfirmation';
import Toast from './Toast';

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isSubroomVisible, setIsSubroomVisible] = useState({}); 
  const API_BASE_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchRooms();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/rooms`);
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data);
      console.log('Fetched Rooms:', data);

    } catch (error) {
      console.error('Error fetching rooms:', error);
      showToast('Failed to load rooms. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = () => {
    setEditingRoom(null);
    setIsFormOpen(true);
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };

  const handleDeleteRoom = (room) => {
    setRoomToDelete(room);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/rooms/${roomToDelete._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete room');
      }

      setRooms(rooms.filter((room) => room._id !== roomToDelete._id));
      setIsDeleteModalOpen(false);
      setRoomToDelete(null);
      showToast(`${roomToDelete.roomName} has been deleted successfully`);
    } catch (error) {
      console.error('Error deleting room:', error);
      showToast('Failed to delete room. Please try again.', 'error');
    }
  };

  const handleFormSubmit = async (roomData, imageFile) => {
    try {
      let base64Image = null;

      // Convert image file to Base64 if provided
      if (imageFile) {
        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        await new Promise((resolve, reject) => {
          reader.onload = () => {
            base64Image = reader.result.split(',')[1];
            resolve();
          };
          reader.onerror = reject;
        });
      }

      // Handle empty subRooms if isQuadrant is true
      let formattedSubRooms = [];
      if (roomData.isQuadrant) {
        formattedSubRooms = (roomData.subRooms || []).map((subRoom) => ({
          roomName: subRoom.name, // Rename 'name' to 'roomName'
          capacity: subRoom.capacity,
          description: subRoom.description || `${subRoom.name} description`, // Add a default description if missing
        }));

        // If subRooms is empty, provide default subrooms
        if (formattedSubRooms.length === 0) {
          formattedSubRooms = [
            { roomName: `${roomData.roomName} - Subroom 1`, capacity: roomData.capacity / 2, description: 'Default Subroom 1' },
            { roomName: `${roomData.roomName} - Subroom 2`, capacity: roomData.capacity / 2, description: 'Default Subroom 2' },
          ];
        }
      }

      // Construct the payload
      const payload = {
        ...roomData,
        roomImage: base64Image,
        subRooms: formattedSubRooms, // Use the formatted subRooms
      };

      console.log('Payload:', payload); // Debugging

      if (editingRoom) {
        // Update existing room
        const updatePayload = { ...payload };
        if (!imageFile) {
          delete updatePayload.roomImage; // Remove roomImage if no new image is provided
        }

        const response = await fetch(`${API_BASE_URL}/rooms/${editingRoom._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        });

        if (!response.ok) {
          throw new Error('Failed to update room');
        }

        const updatedRoom = await response.json();
        setRooms(
          rooms.map((room) =>
            room._id === editingRoom._id ? updatedRoom : room
          )
        );
        showToast(`${updatedRoom.roomName} updated successfully`);
      } else {
        // Create a new room
        const response = await fetch(`${API_BASE_URL}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error('Failed to create room');
        }
        
        // ✅ Instead of trusting response, just reload
        await fetchRooms();
        showToast(`${roomData.roomName} added successfully`);
        
      }

      setIsFormOpen(false);
      setEditingRoom(null);
    } catch (error) {
      console.error('Error saving room:', error);
      showToast(
        `Failed to ${editingRoom ? 'update' : 'create'} room. Please try again.`,
        'error'
      );
    }
  };

  const handleDivideRoom = (roomId) => {
    const updatedRooms = rooms.map((room) => {
      if (room._id === roomId) {
        return {
          ...room,
          isQuadrant: true,
          subRooms: [
            { roomName: `${room.roomName} - Subroom 1`, capacity: room.capacity / 2 },
            { roomName: `${room.roomName} - Subroom 2`, capacity: room.capacity / 2 },
          ],
        };
      }
      return room;
    });

    setRooms(updatedRooms);
    showToast('Room has been divided into subrooms.');
    setIsSubroomVisible((prev) => ({ ...prev, [roomId]: true })); // Make subrooms visible
  };

  const toggleSubroomVisibility = (roomId) => {
    setIsSubroomVisible((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Room Management</h1>
        <button
          onClick={handleAddRoom}
          className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New Room
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading rooms...</p>
        </div>
      ) : (
        <RoomList
          rooms={rooms}
          onEdit={handleEditRoom}
          onDelete={handleDeleteRoom}
          onDivide={handleDivideRoom}
          toggleSubroomVisibility={toggleSubroomVisibility}
          isSubroomVisible={isSubroomVisible}
        />
      )}

      {isFormOpen && (
        <RoomForm
          initialData={editingRoom}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmation
          title="Delete Room"
          message={`Are you sure you want to delete "${roomToDelete.roomName}"? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => {
            setIsDeleteModalOpen(false);
            setRoomToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default RoomManagement;