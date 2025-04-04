import React, { useState, useEffect } from 'react';
import RoomList from './RoomList';
import RoomForm from './RoomForm';
import DeleteConfirmation from './modals/DeleteConfirmation';

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      // Simulate API call
      const response = await fetch('/api/rooms');
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
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
      // Simulate API call
      await fetch(`/api/rooms/${roomToDelete.id}`, {
        method: 'DELETE',
      });

      setRooms(rooms.filter(room => room.id !== roomToDelete.id));
      setIsDeleteModalOpen(false);
      setRoomToDelete(null);
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  const handleFormSubmit = async (roomData) => {
    try {
      if (editingRoom) {
        // Update existing room
        await fetch(`/api/rooms/${editingRoom.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roomData),
        });

        setRooms(rooms.map(room =>
          room.id === editingRoom.id ? { ...room, ...roomData } : room
        ));
      } else {
        // Create new room
        const response = await fetch('/api/rooms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(roomData),
        });

        const newRoom = await response.json();
        setRooms([...rooms, newRoom]);
      }

      setIsFormOpen(false);
      setEditingRoom(null);
    } catch (error) {
      console.error('Error saving room:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Room Management</h1>
        <button
          onClick={handleAddRoom}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Add New Room
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading rooms...</div>
      ) : (
        <RoomList
          rooms={rooms}
          onEdit={handleEditRoom}
          onDelete={handleDeleteRoom}
        />
      )}

      {isFormOpen && (
        <RoomForm
          room={editingRoom}
          onSubmit={handleFormSubmit}
          onCancel={() => setIsFormOpen(false)}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteConfirmation
          room={roomToDelete}
          onConfirm={confirmDelete}
          onCancel={() => setIsDeleteModalOpen(false)}
        />
      )}
    </div>
  );
};

export default RoomManagement;
