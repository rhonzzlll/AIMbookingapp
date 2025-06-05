import React, { useState, useEffect, useMemo, useContext } from 'react';
import AdminContentTemplate from './AdminContentTemplate';
import imageCompression from 'browser-image-compression';
import TopBar from '../../components/AdminComponents/TopBar';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Paper,
  Button,
  Box,
  TableFooter, // <-- Add this line
} from '@mui/material';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { Typography, Stack } from '@mui/material';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { AuthContext } from '../../context/AuthContext'; // <-- Add this line

// Define the API base URL
const API_BASE_URL = 'http://localhost:5000';

// Enhanced image handling function using imageCompression library
const processImage = async (file) => {
  if (!file) return null;
  try {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 800,
      useWebWorker: true,
      initialQuality: 0.7,
    };
    const compressedFile = await imageCompression(file, options);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  } catch (error) {
    console.error("Error processing image:", error);
    throw error;
  }
};

// Modal component for adding/editing buildings
const BuildingModal = ({
  isOpen,
  onClose,
  onSave,
  editData = null
}) => {
  const [buildingId, setBuildingId] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingDescription, setBuildingDescription] = useState('');
  const [buildingImage, setBuildingImage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Initialize form with edit data
  useEffect(() => {
    if (editData) {
      setBuildingId(editData.buildingId || '');
      setBuildingName(editData.buildingName || '');
      setBuildingDescription(editData.buildingDescription || '');
      if (editData.buildingImageUrl) {
        setImagePreview(editData.buildingImageUrl);
      } else if (editData.buildingImage) {
        setImagePreview(`${API_BASE_URL}/uploads/${editData.buildingImage}`);
      }
      setImageFile(null);
    } else {
      // Reset form
      setBuildingId('');
      setBuildingName('');
      setBuildingDescription('');
      setBuildingImage('');
      setImageFile(null);
      setImagePreview(null);
      setErrors({});
    }
  }, [editData, isOpen]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          setErrors((prev) => ({
            ...prev,
            image: 'Image file is too large. Please select an image under 10MB.',
          }));
          setLoading(false);
          return;
        }
        setImageFile(file);
        const previewOptions = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.8,
        };
        const compressedFile = await imageCompression(file, previewOptions);
        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result);
          setBuildingImage(reader.result);
        };
        reader.readAsDataURL(compressedFile);
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      } catch (error) {
        console.error("Error processing image:", error);
        setErrors((prev) => ({
          ...prev,
          image: 'Failed to process image. Please try a different file.',
        }));
        setImageFile(null);
      } finally {
        setLoading(false);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!buildingName.trim()) {
      newErrors.name = 'Building name is required';
    }
    if (!imageFile && !editData?.buildingImage) {
      newErrors.image = 'Please upload an image';
    }
    if (buildingDescription && buildingDescription.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        setLoading(true);
        const buildingData = {
          buildingId: editData ? editData.buildingId : Date.now(),
          buildingName: buildingName,
          buildingDescription: buildingDescription,
          updatedAt: new Date().toISOString()
        };
        if (imageFile) {
          buildingData._imageFile = imageFile;
        } else if (editData && editData.buildingImage) {
          buildingData.buildingImage = editData.buildingImage;
        }
        if (!editData) {
          buildingData.createdAt = new Date().toISOString();
        }
        onSave(buildingData);
      } catch (error) {
        console.error("Error preparing building data:", error);
        setErrors((prev) => ({
          ...prev,
          general: 'An error occurred while preparing the data. Please try again.'
        }));
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? 'Edit Building' : 'Add New Building'}
        </h2>
        {errors.general && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
            {errors.general}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building Name*
            </label>
            <input
              type="text"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter building name"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={buildingDescription}
              onChange={(e) => setBuildingDescription(e.target.value)}
              className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Enter building description"
              rows="3"
            />
            <div className="flex justify-between">
              {errors.description ? (
                <p className="text-red-500 text-xs mt-1">{errors.description}</p>
              ) : (
                <span className="text-xs text-gray-500 mt-1">
                  {buildingDescription ? buildingDescription.length : 0}/500 characters
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Building Image*
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className={`w-full px-3 py-2 border ${errors.image ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.image && (
              <p className="text-red-500 text-xs mt-1">{errors.image}</p>
            )}
            {imagePreview && (
              <div className="mt-2">
                <img
                  src={imagePreview}
                  alt="Building preview"
                  className="h-32 object-cover rounded-md w-full"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-building.png';
                    setErrors((prev) => ({ ...prev, image: 'Invalid image file' }));
                  }}
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`px-4 py-2 rounded-md ${loading ?
                'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              {loading ? 'Processing...' : (editData ? 'Update Building' : 'Add Building')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BuildingManagement = () => {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [expandedBuilding, setExpandedBuilding] = useState(null);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState(null);
  const { auth } = useContext(AuthContext); // <-- Add this line

  // Helper to check if current user is SuperAdmin
  const isSuperAdmin = auth && auth.role === 'SuperAdmin';

  const filteredBuildings = buildings.filter(bldg =>
    bldg.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const pagedBuildings = useMemo(() => {
    if (rowsPerPage > 0) {
      return filteredBuildings.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }
    return filteredBuildings;
  }, [filteredBuildings, page, rowsPerPage]);

  useEffect(() => {
    // Fetch buildings on component mount
    fetchBuildings();
  }, []);

  // Fetch all buildings using fetch API
  const fetchBuildings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/buildings`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setBuildings(data);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      setError('Failed to load buildings. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingBuilding(null);
    setModalOpen(true);
  };

  const openEditModal = (building) => {
    setEditingBuilding(building);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingBuilding(null);
  };

  const toggleBuildingDetails = (buildingId) => {
    setExpandedBuilding(expandedBuilding === buildingId ? null : buildingId);
  };

  // Function to signal that building data has changed
  const signalBuildingDataChanged = () => {
    // Store a timestamp in sessionStorage to signal data change
    sessionStorage.setItem('buildingsLastUpdated', Date.now().toString());
    // Also dispatch a custom event that HomePage can listen for
    const event = new CustomEvent('buildingsDataChanged');
    window.dispatchEvent(event);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar({ ...snackbar, open: false });
  };

  // Open dialog instead of window.confirm
  const handleDeleteBuilding = (buildingId) => {
    setBuildingToDelete(buildingId);
    setDeleteDialogOpen(true);
  };

  // Confirm delete action
  const confirmDeleteBuilding = async () => {
    if (!buildingToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/buildings/${buildingToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      setBuildings(buildings.filter(building => building.buildingId !== buildingToDelete));
      signalBuildingDataChanged();
      showSnackbar('Building deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting building:', error);
      showSnackbar(`Failed to delete building: ${error.message}`, 'error');
    } finally {
      setDeleteDialogOpen(false);
      setBuildingToDelete(null);
    }
  };

  // Cancel delete
  const cancelDeleteBuilding = () => {
    setDeleteDialogOpen(false);
    setBuildingToDelete(null);
  };

  // Handle saving building data (create or update)
  const handleSaveBuilding = async (buildingData) => {
    try {
      // Extract special properties we added for handling in this function
      const imageFile = buildingData._imageFile;
      
      // Remove the special properties before sending to the server
      delete buildingData._imageFile;
      
      let response;
      
      // Create FormData object for the multipart/form-data request
      const formData = new FormData();
      
      // Add building data as JSON string
      formData.append('buildingData', JSON.stringify(buildingData));
      
      // If there's an image file, add it to FormData
      if (imageFile) {
        formData.append('buildingImage', imageFile);
      }
      
      if (editingBuilding) {
        // Update existing building
        response = await fetch(
          `${API_BASE_URL}/api/buildings/${buildingData.buildingId}`, 
          {
            method: 'PUT',
            body: formData
          }
        );
      } else {
        // Add new building
        response = await fetch(
          `${API_BASE_URL}/api/buildings`, 
          {
            method: 'POST',
            body: formData
          }
        );
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const newBuilding = await response.json();
      
      if (editingBuilding) {
        // Update the local state with the updated building
        setBuildings(buildings.map(bldg => 
          (bldg.buildingId === newBuilding.buildingId ? newBuilding : bldg)
        ));
        showSnackbar('Building updated successfully!', 'success');
      } else {
        // Add the new building to the state
        setBuildings([...buildings, newBuilding]);
        showSnackbar('Building added successfully!', 'success');
      }

      // Signal that building data has changed
      signalBuildingDataChanged();
      
      closeModal();
    } catch (error) {
      console.error('Error saving building:', error);
      showSnackbar(`Failed to save building: ${error.message}`, 'error');
    }
  };

  // Function to handle image errors
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/placeholder-building.png';
  };
  
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 257,
        width: 'calc(100% - 257px)',
        zIndex: 500,
        overflowY: 'auto',
        height: '120vh',
      }}
    >
      <TopBar onSearch={setSearchTerm} />
      <AdminContentTemplate>
        <div className="p-6 bg-white rounded-lg shadow">
          {/* Header Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <LocationCityIcon sx={{ fontSize: 48, color: '#2563eb' }} />
              <Box>
                <Typography variant="h1" sx={{ fontSize: 42, fontWeight: 'bold', color: 'gray.800', lineHeight: 1 }}>
                  Building Management
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'gray.600', fontSize: 18 }}>
               manage buildings in your facility
                </Typography>
              </Box>
            </Stack>
            {/* Add Button on the right */}
            <Button
              onClick={openAddModal}
              sx={{
                px: 4,
                py: 2,
                bgcolor: '#2563eb',
                color: '#fff',
                borderRadius: 2,
                fontWeight: 'bold',
                fontSize: 18,
                '&:hover': { bgcolor: '#1e40af' }
              }}
            >
              + Add New Building
            </Button>
          </Box>
          {/* Table Section */}
          <div className="overflow-x-auto">
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'left' }}>
              Buildings
            </Typography>
            {loading ? (
              <div className="text-center py-4">
                <p>Loading buildings...</p>
              </div>
            ) : buildings.length === 0 ? (
              <p>No buildings found. Add your first building using the button above.</p>
            ) : (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table sx={{ minWidth: 900 }} aria-label="buildings table">
                  <TableHead>
                    <TableRow>
                    {[
                      {
                        key: 'image',
                        label: 'Image'
                      },
                      {
                        key: 'buildingId',
                        label: 'Building ID'
                      },
                      {
                        key: 'buildingName',
                        label: 'Building Name'
                      },
                      {
                        key: 'buildingDescription',
                        label: 'Description'
                      },
                      {
                        key: 'updatedAt',
                        label: 'Last Updated'
                      }
                    ].map((col) => (
                      <TableCell key={col.key} sx={{ fontWeight: 'bold' }}>
                        {col.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedBuildings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          No buildings found. Add your first building using the button above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedBuildings.map((building) => (
                        <React.Fragment key={building.buildingId}>
                          <TableRow>
                            <TableCell>
                              {building.buildingImage ? (
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <img
                                    src={building.buildingImageUrl || `${API_BASE_URL}/uploads/${building.buildingImage}`}
                                    alt={building.buildingName}
                                    style={{ height: 64, width: 96, objectFit: 'cover', borderRadius: 4 }}
                                    onError={handleImageError}
                                  />
                                  <Button
                                    size="small"
                                    sx={{ mt: 1, fontSize: 11 }}
                                    onClick={() => window.open(building.buildingImageUrl || `${API_BASE_URL}/uploads/${building.buildingImage}`, '_blank')}
                                  >
                                    View Full
                                  </Button>
                                </Box>
                              ) : (
                                <Box sx={{ height: 64, width: 96, background: '#f3f4f6', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                  No Image
                                </Box>
                              )}
                            </TableCell>
                            <TableCell>{building.buildingId}</TableCell>
                            <TableCell>{building.buildingName}</TableCell>
                            <TableCell>
                              <Box sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {building.buildingDescription || 'No description provided'}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {building.updatedAt ? new Date(building.updatedAt).toLocaleDateString() : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                sx={{ mr: 1 }}
                                onClick={() => openEditModal(building)}
                              >
                                Edit
                              </Button>
                              {isSuperAdmin && (
                                <Button
                                  variant="contained"
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteBuilding(building.buildingId)}
                                >
                                  Delete
                                </Button>
                              )}
                              <Button
                                size="small"
                                sx={{ color: '#6b7280', ml: 1 }}
                                onClick={() => toggleBuildingDetails(building.buildingId)}
                              >
                                {expandedBuilding === building.buildingId ? 'Hide Details' : 'Show Details'}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedBuilding === building.buildingId && (
                            <TableRow>
                              <TableCell colSpan={6} sx={{ background: '#f9fafb' }}>
                                <Box sx={{ ml: 2 }}>
                                  <Box sx={{ display: 'flex', gap: 4 }}>
                                    <Box>
                                      <strong>Name:</strong> {building.buildingName}<br />
                                      <strong>Description:</strong> {building.buildingDescription || 'No description'}<br />
                                      <strong>Created:</strong> {building.createdAt ? new Date(building.createdAt).toLocaleString() : 'N/A'}<br />
                                      <strong>Updated:</strong> {building.updatedAt ? new Date(building.updatedAt).toLocaleString() : 'N/A'}
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      {building.buildingImage ? (
                                        <img
                                          src={building.buildingImageUrl || `${API_BASE_URL}/uploads/${building.buildingImage}`}
                                          alt={building.buildingName}
                                          style={{ maxHeight: 160, maxWidth: 240, objectFit: 'cover', borderRadius: 8, boxShadow: '0 2px 8px #0001' }}
                                          onError={handleImageError}
                                        />
                                      ) : (
                                        <Box sx={{ height: 128, width: 192, background: '#f3f4f6', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                          No Image Available
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                </Box>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        colSpan={6}
                        count={filteredBuildings.length}
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
            )}
          </div>
        </div>
        <BuildingModal
          isOpen={modalOpen}
          onClose={closeModal}
          onSave={handleSaveBuilding}
          editData={editingBuilding}
        />
        <Dialog open={deleteDialogOpen} onClose={cancelDeleteBuilding}>
          <DialogTitle>Delete Building</DialogTitle>
          <DialogContent>
            Are you sure you want to delete this building? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelDeleteBuilding} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmDeleteBuilding} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </AdminContentTemplate>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <MuiAlert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} elevation={6} variant="filled">
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </div>
  );
};

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
      <Button onClick={handleFirstPageButtonClick} disabled={page === 0} size="small">{'<<'}</Button>
      <Button onClick={handleBackButtonClick} disabled={page === 0} size="small">{'<'}</Button>
      <Button
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        size="small"
      >{'>'}</Button>
      <Button
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        size="small"
      >{'>>'}</Button>
    </Box>
  );
}

export default BuildingManagement;