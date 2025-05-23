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
      // Handle nested properties for building and category
      let valueA, valueB;
      
      if (sortConfig.key === 'building') {
        valueA = (a.Building?.buildingName || a.building || '').toString().toLowerCase();
        valueB = (b.Building?.buildingName || b.building || '').toString().toLowerCase();
      } else if (sortConfig.key === 'category') {
        valueA = (a.Category?.categoryName || a.category || '').toString().toLowerCase();
        valueB = (b.Category?.categoryName || b.category || '').toString().toLowerCase();
      } else if (sortConfig.key === 'capacity') {
        valueA = (a.roomCapacity || a.capacity || 0).toString().toLowerCase();
        valueB = (b.roomCapacity || b.capacity || 0).toString().toLowerCase();
      } else if (sortConfig.key === 'description') {
        valueA = (a.roomDescription || a.description || '').toString().toLowerCase();
        valueB = (b.roomDescription || b.description || '').toString().toLowerCase();
      } else {
        valueA = (a[sortConfig.key] || '').toString().toLowerCase();
        valueB = (b[sortConfig.key] || '').toString().toLowerCase();
      }

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
              // Use the roomImageUrl from server response, or fall back to other methods
              const roomImageSrc = room.roomImageUrl || 
                (room.roomImage && !room.roomImage.startsWith('roomImage-') 
                  ? `data:image/jpeg;base64,${room.roomImage}`
                  : room.roomImage 
                    ? `/api/uploads/${room.roomImage}` 
                    : null);

              // Get building name from various possible sources
              const buildingName = room.Building?.buildingName || 
                (typeof room.building === 'object' ? room.building.buildingName : room.building) || 
                room.buildingId;
              
              // Get category name from various possible sources
              const categoryName = room.Category?.categoryName || 
                (typeof room.category === 'object' ? room.category.categoryName : room.category) || 
                room.categoryId;
              
              return (
                <React.Fragment key={room.roomId || room.roomId}>
                  <tr className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold">{room.roomName}</td>
                    <td className="py-3 px-4">{buildingName}</td>
                    <td className="py-3 px-4">{categoryName}</td>
                    <td className="py-3 px-4">{room.roomCapacity || room.capacity}</td>
                    <td className="py-3 px-4">
                      {roomImageSrc ? (
                        <img
                          src={roomImageSrc}
                          alt={room.roomName}
                          className="w-16 h-12 object-cover rounded"
                          onError={(e) => {
                            console.log('Image error:', e);
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/160x120?text=No+Image';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">{room.roomDescription || room.description}</td>
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

                  {room.isQuadrant && room.subRooms && room.subRooms.map((subRoom, index) => {
                    // Use the subRoomImageUrl from server response, or fall back to other methods
                    const subRoomImageSrc = subRoom.subRoomImageUrl || 
                      (subRoom.subRoomImage 
                        ? `/api/uploads/${subRoom.subRoomImage}` 
                        : null);
                    
                    return (
                      <tr key={`${room.roomId || room.roomId}-sub-${subRoom.subRoomId || index}`} 
                          className="hover:bg-gray-50 bg-gray-50">
                        <td className="py-3 px-4 pl-8 text-gray-600 flex items-center">
                          <span className="mr-2">↳</span> {subRoom.subRoomName || subRoom.roomName}
                        </td>
                        <td className="py-3 px-4">{buildingName}</td>
                        <td className="py-3 px-4">{categoryName}</td>
                        <td className="py-3 px-4">{subRoom.subRoomCapacity || subRoom.capacity}</td>
                        <td className="py-3 px-4">
                          {subRoomImageSrc ? (
                            <img
                              src={subRoomImageSrc}
                              alt={subRoom.subRoomName || subRoom.roomName}
                              className="w-16 h-12 object-cover rounded"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/160x120?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-500">No image</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate">
                          {subRoom.subRoomDescription || subRoom.description}
                        </td>
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