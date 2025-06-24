import React, { useState, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import RoomList from './RoomList';
import RoomForm from './RoomForm';
import DeleteConfirmation from './modals/DeleteConfirmation';
import Toast from './Toast';
import TopBar from '../../components/AdminComponents/TopBar';
import AdminContentTemplate from './AdminContentTemplate';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import { AuthContext } from '../../context/AuthContext';

const RoomManagement = () => {
  // Destructure role, token, etc. directly from context
  const { role, token, userId, setAuth } = useContext(AuthContext);

  const [rooms, setRooms] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [isSubroomVisible, setIsSubroomVisible] = useState({});
 const API_BASE_URL = import.meta.env.VITE_API_URI;

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [roomsPerPage] = useState(10);

  // Debug: See what role is coming from context
  useEffect(() => {
    console.log('RoomManagement: role from context:', role);
  }, [role]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const getAuthHeaders = () => {
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();

      const [roomsRes, buildingsRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/rooms`, { headers }),
        fetch(`${API_BASE_URL}/buildings`, { headers }),
        fetch(`${API_BASE_URL}/categories`, { headers })
      ]);

      if (!roomsRes.ok) throw new Error('Failed to fetch rooms');
      if (!buildingsRes.ok) throw new Error('Failed to fetch buildings');
      if (!categoriesRes.ok) throw new Error('Failed to fetch categories');

      const roomsData = await roomsRes.json();
      const buildingsData = await buildingsRes.json();
      const categoriesData = await categoriesRes.json();

      setRooms(roomsData);
      setBuildings(buildingsData);
      setCategories(categoriesData);

      console.log('Fetched Rooms:', roomsData);
      console.log('Fetched Buildings:', buildingsData);
      console.log('Fetched Categories:', categoriesData);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      showToast('Failed to load data. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const closeToast = () => {
    setToast(null);
  };

  const fetchRooms = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/rooms`, { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      showToast('Failed to load rooms. Please try again.', 'error');
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
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/rooms/${roomToDelete.roomId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to delete room');
      }

      setRooms(rooms.filter((room) => room.roomId !== roomToDelete.roomId));
      setIsDeleteModalOpen(false);
      setRoomToDelete(null);
      showToast(`${roomToDelete.roomName} has been deleted successfully`);
    } catch (error) {
      console.error('Error deleting room:', error);
      showToast('Failed to delete room. Please try again.', 'error');
    }
  };

  const handleFormSubmit = async (formDataToSubmit) => {
    try {
      console.log('Form data received:', formDataToSubmit);

      // Extract and validate roomData
      const roomDataJson = formDataToSubmit.get('roomData');
      if (!roomDataJson) {
        showToast('Missing room data', 'error');
        return;
      }

      const roomData = JSON.parse(roomDataJson);
      console.log('Parsed room data:', roomData);

      // Validate required fields
      if (!roomData.roomName || !roomData.buildingId || !roomData.categoryId || !roomData.roomCapacity) {
        showToast('Please fill in all required fields (Room Name, Building, Category, and Capacity)', 'error');
        return;
      }

      const headers = getAuthHeaders();
      let response;

      if (editingRoom) {
        // Update existing room
        console.log('Updating room with ID:', editingRoom.roomId);
        response = await fetch(`${API_BASE_URL}/rooms/${editingRoom.roomId}`, {
          method: 'PUT',
          headers,
          body: formDataToSubmit,
        });
      } else {
        // Create new room
        console.log('Creating new room');
        response = await fetch(`${API_BASE_URL}/rooms`, {
          method: 'POST',
          headers,
          body: formDataToSubmit,
        });
      }

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);

        let errorMessage = `Failed to ${editingRoom ? 'update' : 'create'} room`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const resultRoom = await response.json();
      console.log('Result room:', resultRoom);

      if (editingRoom) {
        // Update the room in state
        setRooms(prevRooms =>
          prevRooms.map(room =>
            room.roomId === editingRoom.roomId ? resultRoom : room
          )
        );
        showToast(`${resultRoom.roomName} updated successfully`);
      } else {
        // Add new room to state
        setRooms(prevRooms => [...prevRooms, resultRoom]);
        showToast(`${resultRoom.roomName} added successfully`);
      }

      // Close form and refresh data
      setIsFormOpen(false);
      setEditingRoom(null);

      // Refresh rooms to get the latest data including subrooms
      await fetchRooms();

    } catch (error) {
      console.error('Error saving room:', error);
      showToast(
        `Failed to ${editingRoom ? 'update' : 'create'} room: ${error.message}`,
        'error'
      );
    }
  };

  const handleDivideRoom = (roomId) => {
    const roomToEdit = rooms.find(room => room.roomId === roomId);
    if (!roomToEdit) return;

    // Generate unique subroom IDs
    const subroomAId = uuidv4();
    const subroomBId = uuidv4();

    // Set this room as editing room with subrooms
    setEditingRoom({
      ...roomToEdit,
      isQuadrant: true,
      subRooms: [
        {
          subroomId: subroomAId,
          roomId: roomToEdit.roomId,
          subroomName: `${roomToEdit.roomName} - Section A`,
          subroomCapacity: Math.floor(roomToEdit.roomCapacity / 2),
          subroomDescription: '',
          image: null,
          imagePreview: null
        },
        {
          subroomId: subroomBId,
          roomId: roomToEdit.roomId,
          subroomName: `${roomToEdit.roomName} - Section B`,
          subroomCapacity: Math.ceil(roomToEdit.roomCapacity / 2),
          subroomDescription: '',
          image: null,
          imagePreview: null
        },
      ]
    });

    setIsFormOpen(true);
    showToast('Room is ready to be divided. Please complete the subroom details.');
  };

  const toggleSubroomVisibility = (roomId) => {
    setIsSubroomVisible((prev) => ({
      ...prev,
      [roomId]: !prev[roomId],
    }));
  };

  // Pagination handler
  const handlePageChange = (event, value) => {
    setPage(value);
  };

  // Filter rooms based on search term
  const filteredRooms = rooms.filter(room =>
    room.roomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (room.roomDescription && room.roomDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate pagination
  const indexOfLastRoom = page * roomsPerPage;
  const indexOfFirstRoom = indexOfLastRoom - roomsPerPage;
  const currentRooms = filteredRooms.slice(indexOfFirstRoom, indexOfLastRoom);
  const totalPages = Math.ceil(filteredRooms.length / roomsPerPage);

  // Helper to check if current user is SuperAdmin
  const isSuperAdmin = role && role.toLowerCase() === 'superadmin';

  return (
    <div className="p-2 md:p-4 max-w-7xl mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 257,
          width: 'calc(100% - 257px)',
          zIndex: 500,
          overflowY: 'auto',
          height: '100vh',
        }}
      >
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
            <>
              <RoomList
                rooms={currentRooms}
                onEdit={handleEditRoom}
                onDelete={isSuperAdmin ? handleDeleteRoom : undefined} // Only SuperAdmin can delete
                onDivideRoom={handleDivideRoom}
                onToggleSubroom={toggleSubroomVisibility}
                isSubroomVisible={isSubroomVisible}
                buildings={buildings}
                categories={categories}
              />

              {filteredRooms.length > 0 && (
                <div className="mt-6 flex justify-center">
                  <Stack spacing={2}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      onChange={handlePageChange}
                      showFirstButton
                      showLastButton
                    />
                  </Stack>
                </div>
              )}

              {filteredRooms.length === 0 && !loading && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No rooms found matching your search criteria.</p>
                </div>
              )}
            </>
          )}

          {isFormOpen && (
            <RoomForm
              room={editingRoom}
              onSubmit={handleFormSubmit}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingRoom(null);
              }}
              buildings={buildings}
              categories={categories}
            />
          )}

          {isDeleteModalOpen && isSuperAdmin && (
            <DeleteConfirmation
              title="Delete Room"
              message={`Are you sure you want to delete "${roomToDelete?.roomName}"? This action cannot be undone. This will also delete all associated subrooms.`}
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