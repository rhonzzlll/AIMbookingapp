import React, { useState, useEffect } from 'react';
import RoomList from './RoomList';
import RoomForm from './RoomForm';
import DeleteConfirmation from './modals/DeleteConfirmation';
import Toast from './Toast';
import TopBar from '../../components/AdminComponents/TopBar';

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
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

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
      // Format subRooms if needed
      let formattedSubRooms = [];
      if (roomData.isQuadrant) {
        formattedSubRooms = (roomData.subRooms || []).map((subRoom) => ({
          roomName: subRoom.name,
          capacity: subRoom.capacity,
          description: subRoom.description || `${subRoom.name} description`,
        }));
  
        if (formattedSubRooms.length === 0) {
          formattedSubRooms = [
            { roomName: `${roomData.roomName} - Subroom 1`, capacity: roomData.capacity / 2, description: 'Default Subroom 1' },
            { roomName: `${roomData.roomName} - Subroom 2`, capacity: roomData.capacity / 2, description: 'Default Subroom 2' },
          ];
        }
      }
  
      const formData = new FormData();
      formData.append('roomData', JSON.stringify({ ...roomData, subRooms: formattedSubRooms }));
      if (imageFile) {
        formData.append('image', imageFile);
      }
  
      const method = editingRoom ? 'PUT' : 'POST';
      const url = editingRoom
        ? `${API_BASE_URL}/rooms/${editingRoom._id}`
        : `${API_BASE_URL}/rooms`;
  
      const response = await fetch(url, {
        method,
        body: formData,
      });
  
      if (!response.ok) {
        throw new Error(`Failed to ${editingRoom ? 'update' : 'create'} room`);
      }
  
      if (editingRoom) {
        const updatedRoom = await response.json();
        setRooms(rooms.map((room) => (room._id === updatedRoom._id ? updatedRoom : room)));
        showToast(`${updatedRoom.roomName} updated successfully`);
      } else {
        await fetchRooms();
        showToast(`${roomData.roomName} added successfully`);
      }
  
      setIsFormOpen(false);
      setEditingRoom(null);
    } catch (error) {
      console.error('Error saving room:', error);
      showToast(`Failed to ${editingRoom ? 'update' : 'create'} room. Please try again.`, 'error');
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
    <div className="p-2 md:p-4 max-w-7xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh'}}>
      <TopBar onSearch={setSearchTerm} />
      <div className="p-4 bg-gray-100 w-full flex flex-col">
        <div className="flex justify-between items-center mb-4">  
          <h1 className="text-2xl font-bold text-gray-800">Room Management</h1>
          <button
            onClick={handleAddRoom}
            className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            + Add New Room
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading rooms...</p>
          </div>
        ) : (
          <RoomList
            rooms={rooms.filter(room =>
              room.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()))
            )}
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
    </div> 
    </div> 
  );
};

export default RoomManagement;