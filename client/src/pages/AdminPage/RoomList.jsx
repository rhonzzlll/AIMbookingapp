import React from 'react';

const RoomList = ({ rooms, onEdit, onDelete }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white shadow-md rounded-lg">
        <thead className="bg-gray-100">
          <tr>
            <th className="py-3 px-4 text-left">Room</th>
            <th className="py-3 px-4 text-left">Building</th>
            <th className="py-3 px-4 text-left">Category</th>
            <th className="py-3 px-4 text-left">Capacity</th>
            <th className="py-3 px-4 text-left">Image</th>
            <th className="py-3 px-4 text-left">Description</th>
            <th className="py-3 px-4 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rooms.length === 0 ? (
            <tr>
              <td colSpan="7" className="py-4 px-4 text-center text-gray-500">
                No rooms found. Add a room to get started.
              </td>
            </tr>
          ) : (
            rooms.map((room) => {
              // Retrieve the image from localStorage
              const roomImage = localStorage.getItem(`roomImage_${room.roomName}`);

              return (
                <React.Fragment key={room._id}>
                  {/* Parent Room */}
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

                  {/* Subrooms (if isQuadrant is true) */}
                  {room.isQuadrant &&
                    room.subRooms.map((subRoom, index) => {
                      const subRoomImage = localStorage.getItem(`roomImage_${subRoom.roomName}`);
                      return (
                        <tr key={`${room._id}-sub-${index}`} className="hover:bg-gray-50">
                          <td className="py-3 px-4 pl-8 text-gray-600 flex items-center">
                            <span className="mr-2">↳</span> {subRoom.roomName}
                          </td>
                          <td className="py-3 px-4">{room.building}</td>
                          <td className="py-3 px-4">{room.category}</td>
                          <td className="py-3 px-4">{subRoom.capacity}</td>
                          <td className="py-3 px-4">
                            {subRoomImage ? (
                              <img
                                src={subRoomImage}
                                alt={subRoom.roomName}
                                className="w-16 h-12 object-cover rounded"
                              />
                            ) : (
                              <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">No image</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 max-w-xs truncate">{subRoom.description}</td>
                          <td className="py-3 px-4 text-center text-gray-400 text-sm">
                            {/* No actions for subrooms */}
                            N/A
                          </td>
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