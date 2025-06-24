import React, { useState, useMemo } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom'; // <-- Add this import

const API_BASE_URL = import.meta.env.VITE_API_URI;

function TablePaginationActions(props) {
  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };

  return (
    <Box sx={{ flexShrink: 0, ml: 2.5 }}>
      <IconButton onClick={handleFirstPageButtonClick} disabled={page === 0} aria-label="first page">
        <FirstPageIcon />
      </IconButton>
      <IconButton onClick={handleBackButtonClick} disabled={page === 0} aria-label="previous page">
        <KeyboardArrowLeft />
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        <KeyboardArrowRight />
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        <LastPageIcon />
      </IconButton>
    </Box>
  );
}

const RoomList = ({ rooms, onEdit, onDelete, buildings = [] }) => {
  const [sortConfig, setSortConfig] = useState({ key: 'roomName', direction: 'asc' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedBuildingTab, setSelectedBuildingTab] = useState('All');

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

  // Filter rooms by building
  const filteredRooms = useMemo(() => {
    if (selectedBuildingTab === 'All') return rooms;
    return rooms.filter(room => {
      const buildingName =
        room.Building?.buildingName ||
        (typeof room.building === 'object' ? room.building.buildingName : room.building) ||
        room.buildingId;
      return buildingName === selectedBuildingTab;
    });
  }, [rooms, selectedBuildingTab]);

  // Flatten rooms and subRooms for pagination
  const flatRooms = useMemo(() => {
    let result = [];
    filteredRooms.forEach((room) => {
      result.push({ ...room, isSubRoom: false });
      if (room.isQuadrant && room.subRooms) {
        room.subRooms.forEach((subRoom, index) => {
          result.push({
            ...subRoom,
            isSubRoom: true,
            parentRoom: room,
            subRoomIndex: index,
          });
        });
      }
    });
    return result;
  }, [filteredRooms]);

  const sortedRooms = useMemo(() => {
    const compare = (a, b) => {
      let valueA, valueB;
      if (sortConfig.key === 'building') {
        valueA = (a.Building?.buildingName || a.building || a.parentRoom?.Building?.buildingName || a.parentRoom?.building || '').toString().toLowerCase();
        valueB = (b.Building?.buildingName || b.building || b.parentRoom?.Building?.buildingName || b.parentRoom?.building || '').toString().toLowerCase();
      } else if (sortConfig.key === 'category') {
        valueA = (a.Category?.categoryName || a.category || a.parentRoom?.Category?.categoryName || a.parentRoom?.category || '').toString().toLowerCase();
        valueB = (b.Category?.categoryName || b.category || b.parentRoom?.Category?.categoryName || b.parentRoom?.category || '').toString().toLowerCase();
      } else if (sortConfig.key === 'capacity') {
        valueA = (a.roomCapacity || a.capacity || a.subRoomCapacity || 0).toString().toLowerCase();
        valueB = (b.roomCapacity || b.capacity || b.subRoomCapacity || 0).toString().toLowerCase();
      } else if (sortConfig.key === 'description') {
        valueA = (a.roomDescription || a.description || a.subRoomDescription || '').toString().toLowerCase();
        valueB = (b.roomDescription || b.description || b.subRoomDescription || '').toString().toLowerCase();
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
    return [...flatRooms].sort(compare);
  }, [flatRooms, sortConfig]);

  // Pagination
  const pagedRooms = useMemo(() => {
    if (rowsPerPage > 0) {
      return sortedRooms.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }
    return sortedRooms;
  }, [sortedRooms, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Helper to get image URL for main rooms and subrooms
  const getRoomImageSrc = (room) => {
    if (room.roomImageUrl) return room.roomImageUrl;
    if (room.roomImage && !room.roomImage.startsWith('roomImage-')) {
      return `data:image/jpeg;base64,${room.roomImage}`;
    }
    if (room.roomImage) {
      return `${API_BASE_URL}/uploads/${room.roomImage}`;
    }
    return null;
  };

  const getSubRoomImageSrc = (subRoom) => {
    if (subRoom.subRoomImageUrl) return subRoom.subRoomImageUrl;
    if (subRoom.subRoomImage) {
      return `${API_BASE_URL}/uploads/${subRoom.subRoomImage}`;
    }
    return null;
  };

  return (
    <Box>
      {/* Building Tabs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant={selectedBuildingTab === 'All' ? 'contained' : 'outlined'}
          color={selectedBuildingTab === 'All' ? 'primary' : 'inherit'}
          onClick={() => setSelectedBuildingTab('All')}
        >
          All
        </Button>
        {buildings.map((building) => (
          <Button
            key={building._id || building.buildingId || building.id}
            variant={selectedBuildingTab === (building.buildingName || building.name) ? 'contained' : 'outlined'}
            color={selectedBuildingTab === (building.buildingName || building.name) ? 'primary' : 'inherit'}
            onClick={() => setSelectedBuildingTab(building.buildingName || building.name)}
          >
            {building.buildingName || building.name}
          </Button>
        ))}
      </Box>
      {/* Header Section */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <MeetingRoomIcon sx={{ fontSize: 72, color: '#2563eb' }} />
          <Box>
            <Typography variant="h1" sx={{ fontSize: 48, fontWeight: 'bold', color: 'gray.800', lineHeight: 1 }}>
              Room Management
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'gray.600', fontSize: 18 }}>
            
            </Typography>
          </Box>
        </Stack>
      </Box>
      {/* Table Section */}
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 900 }} aria-label="rooms table">
          <TableHead>
            <TableRow>
              {[
                { key: 'roomName', label: 'Room' },
                { key: 'building', label: 'Building' },
                { key: 'category', label: 'Category' },
                { key: 'capacity', label: 'Capacity' },
                { key: 'roomImage', label: 'Image' },
                { key: 'description', label: 'Description' }
              ].map((col) => (
                <TableCell
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {col.label}{' '}
                  {sortConfig.key === col.key && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableCell>
              ))}
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No rooms found. Add a room to get started.
                </TableCell>
              </TableRow>
            ) : (
              pagedRooms.map((item, idx) => {
                if (!item.isSubRoom) {
                  // Main room row
                  const room = item;
                  const roomImageSrc = getRoomImageSrc(room);

<<<<<<< HEAD
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
=======
                  const buildingName = room.Building?.buildingName ||
                    (typeof room.building === 'object' ? room.building.buildingName : room.building) ||
                    room.buildingId;

                  const categoryName = room.Category?.categoryName ||
                    (typeof room.category === 'object' ? room.category.categoryName : room.category) ||
                    room.categoryId;

                  return (
                    <TableRow key={room.roomId || room._id} hover>
                      <TableCell>{room.roomName}</TableCell>
                      <TableCell>{buildingName}</TableCell>
                      <TableCell>{categoryName}</TableCell>
                      <TableCell>{room.roomCapacity || room.capacity}</TableCell>
                      <TableCell>
                        {roomImageSrc ? (
                          <img
                            src={roomImageSrc}
                            alt={room.roomName}
                            style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 4 }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/160x120?text=No+Image';
                            }}
                          />
                        ) : (
                          <Box sx={{
                            width: 64, height: 48, background: '#f3f4f6',
                            borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>No image</span>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {room.roomDescription || room.description}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          sx={{ mr: 1 }}
                          onClick={() => onEdit(room)}
                        >
                          Edit
                        </Button>
                        {onDelete && (
                          <Button
                            variant="contained"
                            color="error"
                            size="small"
                            onClick={() => onDelete(room)}
                          >
                            Delete
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                } else {
                  // Sub-room row
                  const subRoom = item;
                  const parentRoom = subRoom.parentRoom || {};
                  const subRoomImageSrc = getSubRoomImageSrc(subRoom);

                  const buildingName = parentRoom.Building?.buildingName ||
                    (typeof parentRoom.building === 'object' ? parentRoom.building.buildingName : parentRoom.building) ||
                    parentRoom.buildingId;

                  const categoryName = parentRoom.Category?.categoryName ||
                    (typeof parentRoom.category === 'object' ? parentRoom.category.categoryName : parentRoom.category) ||
                    parentRoom.categoryId;

                  return (
                    <TableRow key={`${parentRoom.roomId || parentRoom._id}-sub-${subRoom.subRoomId || subRoom.subRoomIndex}`} sx={{ background: '#f9fafb' }}>
                      <TableCell sx={{ pl: 4, color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                        <span style={{ marginRight: 8 }}>↳</span> {subRoom.subRoomName || subRoom.roomName}
                      </TableCell>
                      <TableCell>{buildingName}</TableCell>
                      <TableCell>{categoryName}</TableCell>
                      <TableCell>{subRoom.subRoomCapacity || subRoom.capacity}</TableCell>
                      <TableCell>
                        {subRoomImageSrc ? (
                          <img
                            src={subRoomImageSrc}
                            alt={subRoom.subRoomName || subRoom.roomName}
                            style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 4 }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/160x120?text=No+Image';
                            }}
                          />
                        ) : (
                          <Box sx={{
                            width: 64, height: 48, background: '#f3f4f6',
                            borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>No image</span>
                          </Box>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {subRoom.subRoomDescription || subRoom.description}
                      </TableCell>
                      <TableCell align="center" sx={{ color: '#9ca3af', fontSize: 14 }}>N/A</TableCell>
                    </TableRow>
                  );
                }
              })
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TablePagination
                rowsPerPageOptions={[10]}
                colSpan={7}
                count={sortedRooms.length}
                rowsPerPage={rowsPerPage}
                page={page}
                SelectProps={{
                  inputProps: { 'aria-label': 'rows per page' },
                  native: true,
                }}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
              />
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Box>
>>>>>>> cb6fb508c924946d1dbcaee6e648276bab703c7c
  );
};

export default RoomList;