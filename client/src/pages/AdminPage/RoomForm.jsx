import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import imageCompression from 'browser-image-compression';

const RoomForm = ({ room, onSubmit, onCancel, buildings: propBuildings, categories: propCategories }) => {
  const initialFormState = {
    roomId: room?.roomId || uuidv4(),
    roomName: '',
    buildingId: '',
    categoryId: '',
    roomCapacity: '',
    roomDescription: '',
    isQuadrant: false,
    roomImage: null,
    subRooms: [],
  };

  const [formData, setFormData] = useState(initialFormState);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const API_BASE_URL = 'http://localhost:5000/api';

  const [localBuildings, setLocalBuildings] = useState([]);
  const [localCategories, setLocalCategories] = useState([]);

  const buildings = propBuildings || localBuildings;
  const categories = propCategories || localCategories;

  useEffect(() => {
    if (!propBuildings || !propCategories) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [buildingsResponse, categoriesResponse] = await Promise.all([
            axios.get(`${API_BASE_URL}/buildings`), // Fix: This was missing
            axios.get(`${API_BASE_URL}/categories`),
          ]);

          setLocalBuildings(buildingsResponse.data);
          setLocalCategories(categoriesResponse.data);
        } catch (error) {
          console.error('Error fetching form data:', error);
          setErrors((prev) => ({
            ...prev,
            general: 'Failed to load buildings and categories data. Please try again.',
          }));
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [propBuildings, propCategories]);

  useEffect(() => {
    if (categories && formData.buildingId) {
      const filteredCategories = categories.filter(
        (category) => `${category.buildingId}` === `${formData.buildingId}`
      );

      setAvailableCategories(filteredCategories);

      // Compare as integers since database uses INTEGER for categoryId
      const categoryExists = filteredCategories.some(
        (category) => category.categoryId === parseInt(formData.categoryId, 10)
      );

      if (!categoryExists && formData.categoryId) {
        setFormData((prev) => ({ ...prev, categoryId: '' }));
      }
    } else {
      setAvailableCategories([]);
    }
  }, [formData.buildingId, categories]);

  useEffect(() => {
    if (room) {
      setFormData({
        roomId: room.roomId || '',
        roomName: room.roomName || '',
        buildingId: room.buildingId || '',
        categoryId: room.categoryId ? room.categoryId.toString() : '',
        roomCapacity: room.roomCapacity || '',
        roomDescription: room.roomDescription || room.description || '',
        isQuadrant: Boolean(room.isQuadrant),
        subRooms: (room.subRooms || []).map((subroom) => ({
          subroomId: subroom.subRoomId || uuidv4(),
          roomId: subroom.roomId,
          subroomName: subroom.subRoomName,
          subroomCapacity: subroom.subRoomCapacity,
          subroomDescription: subroom.subRoomDescription || '',
          image: null,
          imagePreview: subroom.subRoomImage ? `${API_BASE_URL}/uploads/${subroom.subRoomImage}` : null,
        })),
      });

      if (room.roomImage) {
        setImagePreview(`${API_BASE_URL}/uploads/${room.roomImage}`);
      }
    }
  }, [room]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;

    if (name === 'isQuadrant' && checked && (!formData.subRooms || formData.subRooms.length === 0)) {
      setFormData({
        ...formData,
        isQuadrant: true,
        subRooms: [
          {
            roomId: formData.roomId,
            subroomId: uuidv4(),
            subroomName: '',
            subroomCapacity: Math.floor(formData.roomCapacity / 2) || '',
            subroomDescription: '',
            image: null,
            imagePreview: null,
          }
        ]
      });
    } else {
      setFormData({
        ...formData,
        [name]: type === 'number' ? parseInt(value, 10) || '' : fieldValue,
      });
    }

    setTouchedFields({
      ...touchedFields,
      [name]: true,
    });

    validateField(name, type === 'number' ? parseInt(value, 10) || '' : fieldValue);

    if (name === 'buildingId') {
      setFormData((prev) => ({ ...prev, categoryId: '' }));
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.categoryId;
        return newErrors;
      });
      setTouchedFields((prev) => ({ ...prev, categoryId: false }));
    }
  };

  const handleSubroomImageChange = async (e, index) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);

        if (file.size > 10 * 1024 * 1024) {
          setErrors((prev) => ({
            ...prev,
            [`subroomImage${index}`]: 'Image file is too large. Please select an image under 10MB.',
          }));
          setLoading(false);
          return;
        }

        const previewOptions = {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 800,
          useWebWorker: true,
          fileType: 'image/jpeg',
          initialQuality: 0.8,
        };

        const compressedFile = await imageCompression(file, previewOptions);

        const updatedSubRooms = [...formData.subRooms];
        updatedSubRooms[index] = {
          ...updatedSubRooms[index],
          image: file
        };
        
        setFormData({
          ...formData,
          subRooms: updatedSubRooms
        });

        const reader = new FileReader();
        reader.onload = () => {
          const updatedSubRooms = [...formData.subRooms];
          updatedSubRooms[index] = {
            ...updatedSubRooms[index],
            imagePreview: reader.result
          };
          
          setFormData({
            ...formData,
            subRooms: updatedSubRooms
          });
        };
        reader.readAsDataURL(compressedFile);

        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[`subroomImage${index}`];
          return newErrors;
        });
      } catch (error) {
        console.error('Error processing subroom image preview:', error);
        setErrors((prev) => ({
          ...prev,
          [`subroomImage${index}`]: 'Failed to process image. Please try a different file.',
        }));
      } finally {
        setLoading(false);
      }
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
      case 'roomCapacity':
        if (!value) {
          fieldErrors.roomCapacity = 'Capacity is required';
        } else if (value <= 0) {
          fieldErrors.roomCapacity = 'Capacity must be greater than 0';
        } else {
          delete fieldErrors.roomCapacity;
        }
        break;
      case 'buildingId':
        if (!value) {
          fieldErrors.buildingId = 'Building is required';
        } else {
          delete fieldErrors.buildingId;
        }
        break;
      case 'roomDescription':
        if (!value.trim()) {
          fieldErrors.roomDescription = 'Description is required';
        } else if (value.length > 255) {
          fieldErrors.roomDescription = 'Description must be less than 255 characters';
        } else {
          delete fieldErrors.roomDescription;
        }
        break;
      case 'categoryId':
        if (!value) {
          fieldErrors.categoryId = 'Category is required';
        } else {
          delete fieldErrors.categoryId;
        }
        break;
      default:
        break;
    }

    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const validateForm = () => {
    const requiredFields = ['roomName', 'roomCapacity', 'roomDescription', 'buildingId', 'categoryId'];
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

    if (formData.roomCapacity <= 0) {
      formErrors.roomCapacity = 'Capacity must be greater than 0';
      isValid = false;
    }

    if (formData.roomDescription && formData.roomDescription.length > 255) {
      formErrors.roomDescription = 'Description must be less than 255 characters';
      isValid = false;
    }

    if (!room && !imageFile) {
      formErrors.image = 'Room image is required';
      isValid = false;
    }

    if (formData.isQuadrant) {
      formData.subRooms.forEach((subRoom, index) => {
        if (!subRoom.subroomName || !subRoom.subroomName.trim()) {
          formErrors[`subRoomName${index}`] = 'Sub-room name is required';
          isValid = false;
        }
        if (!subRoom.subroomCapacity || subRoom.subroomCapacity <= 0) {
          formErrors[`subRoomCapacity${index}`] = 'Valid sub-room capacity is required';
          isValid = false;
        }
        if (!subRoom.subroomDescription || !subRoom.subroomDescription.trim()) {
          formErrors[`subRoomDescription${index}`] = 'Sub-room description is required';
          isValid = false;
        }
        if (!room && !subRoom.image && !subRoom.imagePreview) {
          formErrors[`subroomImage${index}`] = 'Sub-room image is required';
          isValid = false;
        }
      });
    }

    setErrors(formErrors);
    return isValid;
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setLoading(true);

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
        };
        reader.readAsDataURL(compressedFile);

        setErrors((prev) => ({ ...prev, image: undefined }));
      } catch (error) {
        console.error('Error processing image preview:', error);
        setErrors((prev) => ({
          ...prev,
          image: 'Failed to process image preview. Please try a different file.',
        }));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ensure categoryId is a valid number before validation
    if (formData.categoryId && isNaN(parseInt(formData.categoryId, 10))) {
      setErrors((prev) => ({ ...prev, categoryId: 'Category ID must be a valid number' }));
      return;
    }
    
    if (validateForm()) {
      try {
        setLoading(true);

        const formDataToSubmit = new FormData();
        
        // Align with database model
        const roomData = {
          roomId: formData.roomId,
          roomName: formData.roomName,
          buildingId: formData.buildingId,
          categoryId: parseInt(formData.categoryId, 10),
          roomCapacity: parseInt(formData.roomCapacity, 10),
          roomDescription: formData.roomDescription.substring(0, 255),
          isQuadrant: Boolean(formData.isQuadrant),
          subRooms: formData.isQuadrant ? formData.subRooms.map((subroom) => ({
            subroomId: subroom.subroomId || uuidv4(),
            roomId: formData.roomId,
            subroomName: subroom.subroomName,
            subroomCapacity: parseInt(subroom.subroomCapacity, 10),
            subroomDescription: subroom.subroomDescription,
          })) : [],
        };
        
        formDataToSubmit.append('roomData', JSON.stringify(roomData));
        
        // Image handling is separate from roomData because files cannot be JSON serialized
        if (imageFile) {
          formDataToSubmit.append('roomImage', imageFile);
        }
        
        // Only add subroom images if this is a quadrant room
        if (formData.isQuadrant) {
          formData.subRooms.forEach((subroom) => {
            if (subroom.image) {
              formDataToSubmit.append(`subroomImage_${subroom.subroomId}`, subroom.image);
            }
          });
        }
        
        console.log("Submitting room data:", roomData);
        
        onSubmit(formDataToSubmit);
      } catch (error) {
        console.error('Error preparing form submission:', error);
        setErrors((prev) => ({ ...prev, general: error.message }));
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            {room ? 'Edit Room' : 'Add New Room'}
          </h2>

          {errors.general && (
            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
              {errors.general}
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">Loading form data...</div>
          ) : (
            <form onSubmit={handleSubmit} encType="multipart/form-data">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Building*
                  </label>
                  <select
                    name="buildingId"
                    value={formData.buildingId}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded ${
                      errors.buildingId && touchedFields.buildingId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Building</option>
                    {buildings && buildings.length > 0 ? (
                      buildings.map((building) => (
                        <option key={building.buildingId} value={building.buildingId}>
                          {building.buildingName}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No buildings available</option>
                    )}
                  </select>
                  {errors.buildingId && touchedFields.buildingId && (
                    <p className="text-red-500 text-xs mt-1">{errors.buildingId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category*
                    {!formData.buildingId && (
                      <span className="text-xs text-gray-500 ml-1">(select building first)</span>
                    )}
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId || ''}
                    onChange={handleChange}
                    disabled={!formData.buildingId}
                    className={`w-full p-2 border rounded ${
                      errors.categoryId && touchedFields.categoryId ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">
                      {!formData.buildingId
                        ? 'Select a building first'
                        : availableCategories.length
                        ? 'Select Category'
                        : 'No categories available for this building'}
                    </option>
                    {availableCategories.map((category) => (
                      <option key={category.categoryId} value={category.categoryId}>
                        {category.categoryName}
                      </option>
                    ))}
                  </select>
                  {errors.categoryId && touchedFields.categoryId && (
                    <p className="text-red-500 text-xs mt-1">{errors.categoryId}</p>
                  )}
                </div>

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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Capacity*
                  </label>
                  <input
                    type="number"
                    name="roomCapacity"
                    value={formData.roomCapacity}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded ${
                      errors.roomCapacity && touchedFields.roomCapacity ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter room capacity"
                    min="1"
                  />
                  {errors.roomCapacity && touchedFields.roomCapacity && (
                    <p className="text-red-500 text-xs mt-1">{errors.roomCapacity}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Description* <span className="text-xs text-gray-500">(Max 255 characters)</span>
                  </label>
                  <textarea
                    name="roomDescription"
                    value={formData.roomDescription}
                    onChange={handleChange}
                    className={`w-full p-2 border rounded ${
                      errors.roomDescription && touchedFields.roomDescription ? 'border-red-500' : 'border-gray-300'
                    }`}
                    rows="3"
                    placeholder="Enter room description"
                    maxLength="255" // Enforce limit in UI
                  ></textarea>
                  <div className="flex justify-between">
                    {errors.roomDescription && touchedFields.roomDescription ? (
                      <p className="text-red-500 text-xs mt-1">{errors.roomDescription}</p>
                    ) : (
                      <span className="text-xs text-gray-500 mt-1">
                        {formData.roomDescription ? formData.roomDescription.length : 0}/255 characters
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Room Image{!room && '*'}
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <input
                      type="file"
                      name="roomImage"
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

              {formData.isQuadrant && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold">Sub-Rooms</h3>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          isQuadrant: true,
                          subRooms: [
                            ...formData.subRooms,
                            {
                              subroomId: uuidv4(),
                              roomId: formData.roomId,
                              subroomName: '',
                              subroomCapacity: Math.floor(formData.roomCapacity / 2) || '',
                              subroomDescription: '',
                              image: null,
                              imagePreview: null,
                            },
                          ],
                        })
                      }
                      className="text-blue-600 hover:text-blue-800"
                    >
                      + Add Sub-Room
                    </button>
                  </div>

                  {formData.subRooms.map((subRoom, index) => (
                    <div key={index} className="border p-3 mb-2 rounded">
                      <div className="flex justify-between items-center mb-2">
                        <h4>Sub-Room #{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              subRooms: formData.subRooms.filter((_, i) => i !== index),
                              isQuadrant: formData.subRooms.length > 1,
                            })
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block mb-1 text-sm">Name*</label>
                          <input
                            type="text"
                            value={subRoom.subroomName || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                subRooms: formData.subRooms.map((sr, i) =>
                                  i === index
                                    ? { ...sr, subroomName: e.target.value }
                                    : sr
                                ),
                              })
                            }
                            className={`w-full p-2 border rounded ${
                              errors[`subRoomName${index}`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter subroom name"
                          />
                          {errors[`subRoomName${index}`] && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors[`subRoomName${index}`]}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block mb-1 text-sm">Capacity*</label>
                          <input
                            type="number"
                            value={subRoom.subroomCapacity || ''}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                subRooms: formData.subRooms.map((sr, i) =>
                                  i === index
                                    ? {
                                        ...sr,
                                        subroomCapacity: parseInt(e.target.value, 10) || '',
                                      }
                                    : sr
                                ),
                              })
                            }
                            className={`w-full p-2 border rounded ${
                              errors[`subRoomCapacity${index}`]
                                ? 'border-red-500'
                                : 'border-gray-300'
                            }`}
                            min="1"
                            placeholder="Enter capacity"
                          />
                          {errors[`subRoomCapacity${index}`] && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors[`subRoomCapacity${index}`]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mb-2">
                        <label className="block mb-1 text-sm">Description*</label>
                        <textarea
                          value={subRoom.subroomDescription || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              subRooms: formData.subRooms.map((sr, i) =>
                                i === index
                                  ? { ...sr, subroomDescription: e.target.value }
                                  : sr
                              ),
                            })
                          }
                          className={`w-full p-2 border rounded ${
                            errors[`subRoomDescription${index}`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          rows="2"
                          placeholder="Enter subroom description"
                        />
                        {errors[`subRoomDescription${index}`] && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors[`subRoomDescription${index}`]}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block mb-1 text-sm">Image*</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleSubroomImageChange(e, index)}
                            className="w-full p-2 border rounded border-gray-300"
                          />
                          {errors[`subroomImage${index}`] && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors[`subroomImage${index}`]}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center justify-center">
                          {subRoom.imagePreview ? (
                            <img
                              src={subRoom.imagePreview}
                              alt={`Subroom ${index + 1} preview`}
                              className="h-24 object-cover rounded"
                            />
                          ) : (
                            <div className="h-24 w-full bg-gray-200 flex items-center justify-center rounded">
                              <span className="text-gray-500">No image selected</span>
                            </div>
                          )}
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
                  disabled={loading}
                >
                  {loading ? 'Processing...' : room ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomForm;