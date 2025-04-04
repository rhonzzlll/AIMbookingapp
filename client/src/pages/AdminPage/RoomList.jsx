import React, { useState } from 'react';

const RoomList = ({ rooms, onEdit, onDelete }) => {
  const [filters, setFilters] = useState({
    building: '',
    category: '',
    search: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const filteredRooms = rooms.filter(room => {
    // Apply building filter
    if (filters.building && room.building !== filters.building) {
      return false;
    }

    // Apply category filter
    if (filters.category && room.category !== filters.category) {
      return false;
    }

    // Apply search filter (case insensitive)
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      return (
        room.name.toLowerCase().includes(searchTerm) ||
        (room.description && room.description.toLowerCase().includes(searchTerm))
      );
    }

    return true;
  });

  // Get unique buildings and categories for filters
  const uniqueBuildings = [...new Set(rooms.map(room => room.building))];
  const uniqueCategories = [...new Set(rooms.map(room => room.category))];

  return (
    <div>
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Building</label>
            <select
              name="building"
              value={filters.building}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All Buildings</option>
              {uniqueBuildings.map(building => (
                <option key={building} value={building}>{building}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Category</label>
            <select
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">All Categories</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>
                  {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Search</label>
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search by name or description..."
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Room table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-2 px-4 border text-left">Room Name</th>
              <th className="py-2 px-4 border text-left">Building</th>
              <th className="py-2 px-4 border text-left">Category</th>
              <th className="py-2 px-4 border text-left">Capacity</th>
              <th className="py-2 px-4 border text-left">Description</th>
              <th className="py-2 px-4 border text-left">Image</th>
              <th className="py-2 px-4 border text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length > 0 ? (
              filteredRooms.map(room => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border">
                    {room.name}
                    {room.subRooms?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Quadrant with {room.subRooms.length} sub-rooms
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-4 border">{room.building}</td>
                  <td className="py-2 px-4 border">
                    {room.category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td className="py-2 px-4 border">{room.capacity}</td>
                  <td className="py-2 px-4 border">{room.description}</td>
                  <td className="py-2 px-4 border">
                    {room.image ? (
                      <img
                        src={typeof room.image === 'string' ? room.image : URL.createObjectURL(room.image)}
                        alt="Room"
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      'No Image'
                    )}
                  </td>
                  <td className="py-2 px-4 border">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(room)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(room)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-4 text-center">
                  No rooms found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RoomList;