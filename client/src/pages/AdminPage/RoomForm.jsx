import React, { useState, useEffect } from 'react';

const RoomForm = ({ room, onSubmit, onCancel }) => {
  const initialFormState = {
    building: '',
    category: '',
    roomName: '',
    capacity: '',
    description: '',
    isQuadrant: false,
    subRooms: [],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  // Define category options for each building
  const accCategories = [
    'Hybrid Caseroom',
    'Regular Caseroom',
    'Flat Room',
    'Meeting Room',
    'Ministudio',
  ];
  const aimCategories = [
    'Hybrid Caseroom',
    'Flat Room',
    'Open Area',
    'Meeting Room',
  ];

  useEffect(() => {
    if (room) {
      setFormData({
        building: room.building || '',
        category: room.category || '',
        roomName: room.roomName || '',
        capacity: room.capacity || '',
        description: room.description || '',
        isQuadrant: room.isQuadrant || false,
        subRooms: room.subRooms || [],
      });

      if (room.roomImage) {
        setImagePreview(`data:image/jpeg;base64,${room.roomImage}`);
      }
    }
  }, [room]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    setFormData({
      ...formData,
      [name]: type === 'number' ? parseInt(value, 10) || '' : fieldValue,
    });

    // Mark field as touched
    setTouchedFields({
      ...touchedFields,
      [name]: true,
    });

    // Validate on change
    validateField(name, type === 'number' ? parseInt(value, 10) || '' : fieldValue);

    // Reset category if building changes
    if (name === 'building') {
      setFormData((prev) => ({ ...prev, category: '' }));
    }
  };

  const validateField = (name, value) => {
    let fieldErrors = { ...errors };

    switch (name) {
      case 'roomName':
        if (!value.trim()) {
          fieldErrors.roomName = 'Room name is required';
        } else {
          delete fieldErrors.roomName;
        }
        break;
      case 'capacity':
        if (!value) {
          fieldErrors.capacity = 'Capacity is required';
        } else if (value <= 0) {
          fieldErrors.capacity = 'Capacity must be greater than 0';
        } else {
          delete fieldErrors.capacity;
        }
        break;
      case 'building':
        if (!value) {
          fieldErrors.building = 'Building is required';
        } else {
          delete fieldErrors.building;
        }
        break;
      case 'category':
        if (!value) {
          fieldErrors.category = 'Category is required';
        } else {
          delete fieldErrors.category;
        }
        break;
      case 'description':
        if (!value.trim()) {
          fieldErrors.description = 'Description is required';
        } else if (value.length > 100) {
          fieldErrors.description = 'Description must be less than 100 characters';
        } else {
          delete fieldErrors.description;
        }
        break;
      default:
        break;
    }

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const validateForm = () => {
    const requiredFields = ['roomName', 'capacity', 'description', 'building', 'category'];
    let formErrors = {};
    let isValid = true;

    requiredFields.forEach((field) => {
      setTouchedFields((prev) => ({ ...prev, [field]: true }));

      const value = formData[field];
      if (!value || (typeof value === 'string' && !value.trim())) {
        formErrors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        isValid = false;
      }
    });

    if (formData.capacity <= 0) {
      formErrors.capacity = 'Capacity must be greater than 0';
      isValid = false;
    }

    if (formData.description && formData.description.length > 100) {
      formErrors.description = 'Description must be less than 100 characters';
      isValid = false;
    }

    if (!room && !imageFile) {
      formErrors.image = 'Room image is required';
      isValid = false;
    }

    if (formData.isQuadrant) {
      formData.subRooms.forEach((subRoom, index) => {
        if (!subRoom.name || !subRoom.name.trim()) {
          formErrors[`subRoomName${index}`] = 'Sub-room name is required';
          isValid = false;
        }
        if (!subRoom.capacity || subRoom.capacity <= 0) {
          formErrors[`subRoomCapacity${index}`] = 'Valid sub-room capacity is required';
          isValid = false;
        }
        if (!subRoom.description || !subRoom.description.trim()) {
          formErrors[`subRoomDescription${index}`] = 'Sub-room description is required';
          isValid = false;
        }
      });
    }

    setErrors(formErrors);
    return isValid;
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Clear any image error
      setErrors((prev) => ({ ...prev, image: undefined }));
    }
  };

  const handleSubRoomChange = (index, field, value) => {
    const updatedSubRooms = [...formData.subRooms];
    updatedSubRooms[index] = {
      ...updatedSubRooms[index],
      [field]: field === 'capacity' ? parseInt(value, 10) || '' : value,
    };
    setFormData({ ...formData, subRooms: updatedSubRooms });
  };

  const handleSubRoomImageChange = (index, e) => {
    const file = e.target.files[0];
    if (file) {
      const updatedSubRooms = [...formData.subRooms];
      updatedSubRooms[index] = { 
        ...updatedSubRooms[index], 
        image: file,
        imagePreview: URL.createObjectURL(file)
      };
      setFormData({ ...formData, subRooms: updatedSubRooms });
    }
  };

  const addSubRoom = () => {
    setFormData({
      ...formData,
      subRooms: [
        ...formData.subRooms,
        { name: '', capacity: '', description: '', image: null, imagePreview: null },
      ],
    });
  };

  const removeSubRoom = (index) => {
    const updatedSubRooms = formData.subRooms.filter((_, i) => i !== index);
    setFormData({ ...formData, subRooms: updatedSubRooms });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData, imageFile);
    }
  };

  // Determine category options based on selected building
  const categoryOptions =
    formData.building === 'ACC Building' ? accCategories : aimCategories;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {room ? 'Edit Room' : 'Add New Room'}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Building Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Building*
                </label>
                <select
                  name="building"
                  value={formData.building}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${
                    errors.building && touchedFields.building ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Building</option>
                  <option value="ACC Building">ACC Building</option>
                  <option value="AIM Building">AIM Building</option>
                </select>
                {errors.building && touchedFields.building && (
                  <p className="text-red-500 text-xs mt-1">{errors.building}</p>
                )}
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category*
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${
                    errors.category && touchedFields.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={!formData.building} // Disable if no building is selected
                >
                  <option value="">Select Category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {errors.category && touchedFields.category && (
                  <p className="text-red-500 text-xs mt-1">{errors.category}</p>
                )}
              </div>

              {/* Room Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Name*
                </label>
                <input
                  type="text"
                  name="roomName"
                  value={formData.roomName}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${
                    errors.roomName && touchedFields.roomName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter room name"
                />
                {errors.roomName && touchedFields.roomName && (
                  <p className="text-red-500 text-xs mt-1">{errors.roomName}</p>
                )}
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity*
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className={`w-full p-2 border rounded ${
                    errors.capacity && touchedFields.capacity ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter room capacity"
                  min="1"
                />
                {errors.capacity && touchedFields.capacity && (
                  <p className="text-red-500 text-xs mt-1">{errors.capacity}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description* <span className="text-xs text-gray-500">(Max 100 characters)</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${
                  errors.description && touchedFields.description ? 'border-red-500' : 'border-gray-300'
                }`}
                rows="3"
                placeholder="Enter room description"
                maxLength="100"
              ></textarea>
              <div className="flex justify-between">
                {errors.description && touchedFields.description ? (
                  <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                ) : (
                  <span className="text-xs text-gray-500 mt-1">
                    {formData.description.length}/100 characters
                  </span>
                )}
              </div>
            </div>

            {/* Room Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Image{!room && '*'}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full p-2 border rounded border-gray-300"
                  />
                  {errors.image && (
                    <p className="text-red-500 text-xs mt-1">{errors.image}</p>
                  )}
                </div>
                <div className="flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Room preview"
                      className="h-32 object-cover rounded"
                    />
                  ) : (
                    <div className="h-32 w-full bg-gray-200 flex items-center justify-center rounded">
                      <span className="text-gray-500">No image selected</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quadrant Option */}
            <div className="mb-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isQuadrant"
                  id="isQuadrant"
                  checked={formData.isQuadrant}
                  onChange={handleChange}
                  className="mr-2"
                />
                <label htmlFor="isQuadrant" className="text-sm font-medium text-gray-700">
                  This is a quadrant room (can be divided into sub-rooms)
                </label>
              </div>
            </div>

            {/* Sub-Rooms Section (Only shown when isQuadrant is true) */}
            {formData.isQuadrant && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold">Sub-Rooms</h3>
                  <button
                    type="button"
                    onClick={addSubRoom}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    + Add Sub-Room
                  </button>
                </div>
                
                {errors.subRooms && <p className="text-red-500 text-sm mb-2">{errors.subRooms}</p>}
                
                {formData.subRooms.map((subRoom, index) => (
                  <div key={index} className="border p-3 mb-2 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <h4>Sub-Room #{index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeSubRoom(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block mb-1 text-sm">Name</label>
                        <input
                          type="text"
                          value={subRoom.name || ''}
                          onChange={(e) => handleSubRoomChange(index, 'name', e.target.value)}
                          className={`w-full p-2 border rounded ${errors[`subRoomName${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors[`subRoomName${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`subRoomName${index}`]}</p>}
                      </div>
                      
                      <div>
                        <label className="block mb-1 text-sm">Capacity</label>
                        <input
                          type="number"
                          value={subRoom.capacity || ''}
                          onChange={(e) => handleSubRoomChange(index, 'capacity', e.target.value)}
                          className={`w-full p-2 border rounded ${errors[`subRoomCapacity${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                          min="1"
                        />
                        {errors[`subRoomCapacity${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`subRoomCapacity${index}`]}</p>}
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="block mb-1 text-sm">Description</label>
                      <textarea
                        value={subRoom.description || ''}
                        onChange={(e) => handleSubRoomChange(index, 'description', e.target.value)}
                        className={`w-full p-2 border rounded ${errors[`subRoomDescription${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                        rows="2"
                        placeholder="Enter sub-room description"
                      ></textarea>
                      {errors[`subRoomDescription${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`subRoomDescription${index}`]}</p>}
                    </div>
                    
                    <div>
                      <label className="block mb-1 text-sm">Sub-Room Image</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSubRoomImageChange(index, e)}
                            className="w-full p-2 border rounded border-gray-300"
                          />
                        </div>
                        <div className="flex items-center justify-center">
                          {subRoom.imagePreview ? (
                            <img 
                              src={subRoom.imagePreview} 
                              alt={`Sub-room ${index + 1} preview`} 
                              className="h-24 object-cover rounded"
                            />
                          ) : (
                            <div className="h-24 w-full bg-gray-200 flex items-center justify-center rounded">
                              <span className="text-gray-500 text-sm">No image selected</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {room ? 'Update Room' : 'Create Room'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RoomForm;