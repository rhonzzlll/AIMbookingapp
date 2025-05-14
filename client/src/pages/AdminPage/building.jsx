import React, { useState, useEffect } from 'react';
import AdminContentTemplate from './AdminContentTemplate';
import imageCompression from 'browser-image-compression';

// Define the API base URL
const API_BASE_URL = 'http://localhost:5000';

// Enhanced image handling function using imageCompression library
const processImage = async (file) => {
  if (!file) return null;
  
  try {
    // Compression options
    const options = {
      maxSizeMB: 1,          // Maximum size in MB
      maxWidthOrHeight: 800, // Resize to this maximum width or height
      useWebWorker: true,    // Use web worker for better performance
      initialQuality: 0.7,   // Initial quality setting
    };

    // Compress the image
    const compressedFile = await imageCompression(file, options);
    
    // Convert to base64
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
  const [isUsingUrl, setIsUsingUrl] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  // Initialize form with edit data
  useEffect(() => {
    if (editData) {
      setBuildingId(editData.buildingId || '');
      setBuildingName(editData.buildingName || '');
      setBuildingDescription(editData.buildingDescription || '');
      setBuildingImage(editData.buildingImage || '');
      
      // Check if the image is a URL
      if (editData.buildingImage && 
         (editData.buildingImage.startsWith('http://') || 
          editData.buildingImage.startsWith('https://'))) {
        setIsUsingUrl(true);
        setImageUrl(editData.buildingImage);
      } else {
        setIsUsingUrl(false);
        setImageUrl('');
      }
      
      setImageFile(null);
    } else {
      // Reset form
      setBuildingId('');
      setBuildingName('');
      setBuildingDescription('');
      setBuildingImage('');
      setImageFile(null);
      setIsUsingUrl(false);
      setImageUrl('');
    }
  }, [editData, isOpen]);

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Store the file for later processing
      setImageFile(file);
      
      try {
        // Show preview with the compressed image
        const optimizedBase64 = await processImage(file);
        setBuildingImage(optimizedBase64);
        setIsUsingUrl(false);
        setImageUrl('');
      } catch (error) {
        console.error("Error processing image:", error);
        alert("Failed to process image. Please try again with a smaller file.");
        setImageFile(null);
      }
    }
  };
  
  const handleUrlChange = (e) => {
    const url = e.target.value;
    setImageUrl(url);
    setBuildingImage(url);
  };
  
  const toggleImageInputType = () => {
    setIsUsingUrl(!isUsingUrl);
    if (isUsingUrl) {
      setImageUrl('');
    } else {
      setImageFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!buildingName.trim()) return;
    
    try {
      // Create the building data object
      const buildingData = {
        buildingId: editData ? editData.buildingId : `BLD-${Date.now()}`,
        buildingName: buildingName,
        buildingDescription: buildingDescription,
        updatedAt: new Date().toISOString()
      };
      
      // Handle image based on whether we're using a URL or file upload
      if (isUsingUrl) {
        buildingData.buildingImage = imageUrl;
      } else if (imageFile) {
        buildingData.buildingImage = await processImage(imageFile);
      } else if (editData && editData.buildingImage && !isUsingUrl) {
        // Keep existing image if editing and no new image was selected
        buildingData.buildingImage = buildingImage;
      }
      
      // If it's a new building, add createdAt timestamp
      if (!editData) {
        buildingData.createdAt = new Date().toISOString();
      }
      
      // Save the building
      onSave(buildingData);
    } catch (error) {
      console.error("Error preparing building data:", error);
      alert("An error occurred while preparing the data. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? 'Edit Building' : 'Add New Building'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Building Name
            </label>
            <input
              type="text"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter building name"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={buildingDescription}
              onChange={(e) => setBuildingDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter building description"
              rows="3"
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Building Image
              </label>
              <button 
                type="button" 
                onClick={toggleImageInputType}
                className="text-xs text-blue-600 hover:underline"
              >
                {isUsingUrl ? "Upload image file instead" : "Use image URL instead"}
              </button>
            </div>
            
            {isUsingUrl ? (
              <input
                type="text"
                value={imageUrl}
                onChange={handleUrlChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter image URL (https://...)"
              />
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            
            {buildingImage && (
              <div className="mt-2">
                <img 
                  src={buildingImage} 
                  alt="Building preview" 
                  className="h-32 object-cover rounded-md"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-building.png';
                  }}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!buildingName}
              className={`px-4 py-2 rounded-md ${!buildingName ? 
                'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
            >
              {editData ? 'Update Building' : 'Add Building'}
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

  // Handle saving building data (create or update)
  const handleSaveBuilding = async (buildingData) => {
    try {
      let response;
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (editingBuilding) {
        // Update existing building
        response = await fetch(
          `${API_BASE_URL}/api/buildings/${buildingData.buildingId}`, 
          {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(buildingData)
          }
        );
      } else {
        // Add new building
        response = await fetch(
          `${API_BASE_URL}/api/buildings`, 
          {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(buildingData)
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
        setBuildings(buildings.map(bldg => (bldg.buildingId === newBuilding.buildingId ? newBuilding : bldg)));
        alert('Building updated successfully!');
      } else {
        // Add the new building to the state
        setBuildings([...buildings, newBuilding]);
        alert('Building added successfully!');
      }

      // Signal that building data has changed
      signalBuildingDataChanged();
      
      closeModal();
    } catch (error) {
      console.error('Error saving building:', error);
      alert(`Failed to save building: ${error.message}`);
    }
  };

  // Handle deleting a building
  const handleDeleteBuilding = async (buildingId) => {
    if (!window.confirm('Are you sure you want to delete this building?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/buildings/${buildingId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      // Remove the building from the state after successful deletion
      setBuildings(buildings.filter(building => building.buildingId !== buildingId));
      
      // Signal that building data has changed
      signalBuildingDataChanged();
      
      alert('Building deleted successfully!');
    } catch (error) {
      console.error('Error deleting building:', error);
      
      // Show specific message for dependency issues
      if (error.message.includes('associated')) {
        alert(error.message);
      } else {
        alert(`Failed to delete building: ${error.message}`);
      }
    }
  };

  // Function to handle image errors
  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = '/placeholder-building.png';
  };
  
  return (
    <AdminContentTemplate>
      <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Building Management</h1>
        <p className="text-gray-600 mb-6">Add and manage buildings in your facility</p>
        
        {/* Add Building Button */}
        <div className="mb-6">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add New Building
          </button>
        </div>
        
        {/* Error message display */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button 
              className="ml-2 font-bold"
              onClick={() => fetchBuildings()}
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Buildings Table */}
        <div className="overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Buildings</h2>
          {loading ? (
            <div className="text-center py-4">
              <p>Loading buildings...</p>
            </div>
          ) : buildings.length === 0 ? (
            <p>No buildings found. Add your first building using the button above.</p>
          ) : (
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Image
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {buildings.map((building) => (
                    <React.Fragment key={building.buildingId}>
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {building.buildingImage ? (
                            <div className="flex flex-col items-center">
                              <img 
                                src={building.buildingImage} 
                                alt={building.buildingName}
                                className="h-16 w-24 object-cover rounded"
                                onError={handleImageError}
                              />
                              <button 
                                className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => window.open(building.buildingImage, '_blank')}
                              >
                                View Full
                              </button>
                            </div>
                          ) : (
                            <div className="h-16 w-24 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                              No Image
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {building.buildingId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {building.buildingName}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs truncate">
                            {building.buildingDescription || "No description provided"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {building.updatedAt ? new Date(building.updatedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => toggleBuildingDetails(building.buildingId)}
                            className="text-gray-600 hover:text-gray-900 mr-4"
                          >
                            {expandedBuilding === building.buildingId ? 'Hide Details' : 'Show Details'}
                          </button>
                          <button
                            onClick={() => openEditModal(building)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBuilding(building.buildingId)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                      {expandedBuilding === building.buildingId && (
                        <tr>
                          <td colSpan="6" className="px-6 py-4 bg-gray-50">
                            <div className="ml-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4 className="font-medium text-sm mb-2">Building Details</h4>
                                  <p><strong>Name:</strong> {building.buildingName}</p>
                                  <p><strong>Description:</strong> {building.buildingDescription || "No description"}</p>
                                  <p><strong>Created:</strong> {building.createdAt ? new Date(building.createdAt).toLocaleString() : 'N/A'}</p>
                                  <p><strong>Updated:</strong> {building.updatedAt ? new Date(building.updatedAt).toLocaleString() : 'N/A'}</p>
                                </div>
                                <div className="flex justify-center items-center">
                                  {building.buildingImage ? (
                                    <img 
                                      src={building.buildingImage} 
                                      alt={building.buildingName}
                                      className="max-h-48 max-w-full object-cover rounded shadow-lg"
                                      onError={handleImageError}
                                    />
                                  ) : (
                                    <div className="h-32 w-48 bg-gray-200 rounded flex items-center justify-center text-gray-500">
                                      No Image Available
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal for Adding/Editing Buildings */}
      <BuildingModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSave={handleSaveBuilding}
        editData={editingBuilding}
      />
    </AdminContentTemplate>
  );
};

export default BuildingManagement;