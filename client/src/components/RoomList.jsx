import React, { useState, useMemo } from 'react';

const RoomList = ({ rooms, onEdit, onDelete }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'roomName', direction: 'asc' });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const sortedRooms = useMemo(() => {
    const compare = (a, b) => {
      const valueA = a[sortConfig.key]?.toString().toLowerCase();
      const valueB = b[sortConfig.key]?.toString().toLowerCase();

      if (!isNaN(valueA) && !isNaN(valueB)) {
        return sortConfig.direction === 'asc'
          ? parseFloat(valueA) - parseFloat(valueB)
          : parseFloat(valueB) - parseFloat(valueA);
      }

      return sortConfig.direction === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    };

    return [...rooms].sort(compare);
  }, [rooms, sortConfig]);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white shadow-md rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            {[
              { key: 'roomName', label: 'Room' },
              { key: 'building', label: 'Building' },
              { key: 'category', label: 'Category' },
              { key: 'capacity', label: 'Capacity' },
              { key: 'roomImage', label: 'Image' },
              { key: 'description', label: 'Description' },
            ].map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col.key)}
                className="py-3 px-4 text-left cursor-pointer"
              >
                {col.label}{' '}
                {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
            ))}
            <th className="py-3 px-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {sortedRooms.length === 0 ? (
            <tr>
              <td colSpan="7" className="py-4 px-4 text-center text-gray-500">
                No rooms found. Add a room to get started.
              </td>
            </tr>
          ) : (
            sortedRooms.map((room) => {
              const roomImage = room.roomImage
                ? `data:image/jpeg;base64,${room.roomImage}`
                : localStorage.getItem(`roomImage_${room.roomName}`);

              return (
                <React.Fragment key={room._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold">{room.roomName}</td>
                    <td className="py-3 px-4">{room.building}</td>
                    <td className="py-3 px-4">{room.category}</td>
                    <td className="py-3 px-4">{room.capacity}</td>
                    <td className="py-3 px-4">
                      {roomImage ? (
                        <img
                          src={roomImage}
                          alt={room.roomName}
                          className="w-16 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">{room.description}</td>
                    <td className="py-3 px-4 flex justify-center space-x-2">
                      <button
                        onClick={() => onEdit(room)}
                        className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(room)}
                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>

                  {room.isQuadrant &&
                    Array.isArray(room.subRooms) &&
                    room.subRooms.map((subRoom, index) => {
                      // Use the correct property names
                      const subRoomImage =
                        subRoom.imagePreview ||
                        (subRoom.subRoomImage
                          ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api'}/uploads/${subRoom.subRoomImage}`
                          : null);

                      return (
                        <tr key={`${room._id || room.roomId}-sub-${index}`} className="hover:bg-gray-50">
                          <td className="py-3 px-4 pl-8 text-gray-600 flex items-center">
                            <span className="mr-2">↳</span> {subRoom.subroomName}
                          </td>
                          <td className="py-3 px-4">{room.building || room.buildingName}</td>
                          <td className="py-3 px-4">{room.category || room.categoryName}</td>
                          <td className="py-3 px-4">{subRoom.subroomCapacity}</td>
                          <td className="py-3 px-4">
                            {subRoomImage ? (
                              <img
                                src={subRoomImage}
                                alt={subRoom.subroomName}
                                className="w-16 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">No image</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate">{subRoom.subroomDescription}</td>
                          <td className="py-3 px-4 text-center text-gray-400 text-sm">N/A</td>
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RoomList;
