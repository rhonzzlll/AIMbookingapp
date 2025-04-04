import React, { useState, useEffect } from 'react';

const buildings = ['ACC Building', 'AIM Building'];
const categories = ['caserooms', 'corporate_offices', 'function_rooms', 'shared_spaces'];

const RoomForm = ({ room, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    building: buildings[0],
    category: categories[0],
    capacity: '',
    description: '',
    isQuadrant: false,
    subRooms: [],
    image: null,
    imagePreview: null
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (room) {
      setFormData({
        name: room.name || '',
        building: room.building || buildings[0],
        category: room.category || categories[0],
        capacity: room.capacity || '',
        description: room.description || '',
        isQuadrant: room.subRooms?.length > 0 || false,
        subRooms: room.subRooms || [],
        image: room.image || null,
        imagePreview: room.imageUrl || null
      });
    }
  }, [room]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear any error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
      
      if (errors.image) {
        setErrors({ ...errors, image: null });
      }
    }
  };

  const handleSubRoomChange = (index, field, value) => {
    const updatedSubRooms = [...formData.subRooms];
    updatedSubRooms[index] = { ...updatedSubRooms[index], [field]: value };
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
      subRooms: [...formData.subRooms, { name: '', capacity: '', image: null, imagePreview: null }]
    });
  };

  const removeSubRoom = (index) => {
    const updatedSubRooms = formData.subRooms.filter((_, i) => i !== index);
    setFormData({ ...formData, subRooms: updatedSubRooms });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required';
    }

    if (!formData.capacity || formData.capacity <= 0) {
      newErrors.capacity = 'Valid capacity is required';
    }
    
    if (!formData.image && !formData.imagePreview) {
      newErrors.image = 'Room image is required';
    }

    if (formData.isQuadrant && formData.subRooms.length === 0) {
      newErrors.subRooms = 'Quadrant must have at least one sub-room';
    }

    formData.subRooms.forEach((subRoom, index) => {
      if (!subRoom.name.trim()) {
        newErrors[`subRoomName${index}`] = 'Sub-room name is required';
      }
      if (!subRoom.capacity || subRoom.capacity <= 0) {
        newErrors[`subRoomCapacity${index}`] = 'Valid sub-room capacity is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
      // If not a quadrant, remove subRooms from the payload
      const payload = { ...formData };
      if (!payload.isQuadrant) {
        payload.subRooms = [];
      }
      
      onSubmit(payload);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-full overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {room ? 'Edit Room' : 'Add New Room'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1">Building</label>
              <select
                name="building"
                value={formData.building}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                {buildings.map(building => (
                  <option key={building} value={building}>{building}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full p-2 border rounded"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block mb-1">Room Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block mb-1">Capacity</label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                className={`w-full p-2 border rounded ${errors.capacity ? 'border-red-500' : ''}`}
              />
              {errors.capacity && <p className="text-red-500 text-sm mt-1">{errors.capacity}</p>}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Room Image</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={`w-full p-2 border rounded ${errors.image ? 'border-red-500' : ''}`}
                />
                {errors.image && <p className="text-red-500 text-sm mt-1">{errors.image}</p>}
              </div>
              <div className="flex items-center justify-center">
                {formData.imagePreview && (
                  <img 
                    src={formData.imagePreview} 
                    alt="Room preview" 
                    className="h-32 object-cover rounded"
                  />
                )}
                {!formData.imagePreview && (
                  <div className="h-32 w-full bg-gray-200 flex items-center justify-center rounded">
                    <span className="text-gray-500">No image selected</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full p-2 border rounded"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="isQuadrant"
                checked={formData.isQuadrant}
                onChange={handleChange}
                className="mr-2"
              />
              This is a quadrant room (can be partially booked)
            </label>
          </div>
          
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
                        value={subRoom.name}
                        onChange={(e) => handleSubRoomChange(index, 'name', e.target.value)}
                        className={`w-full p-2 border rounded ${errors[`subRoomName${index}`] ? 'border-red-500' : ''}`}
                      />
                      {errors[`subRoomName${index}`] && <p className="text-red-500 text-sm">{errors[`subRoomName${index}`]}</p>}
                    </div>
                    
                    <div>
                      <label className="block mb-1 text-sm">Capacity</label>
                      <input
                        type="number"
                        value={subRoom.capacity}
                        onChange={(e) => handleSubRoomChange(index, 'capacity', e.target.value)}
                        className={`w-full p-2 border rounded ${errors[`subRoomCapacity${index}`] ? 'border-red-500' : ''}`}
                      />
                      {errors[`subRoomCapacity${index}`] && <p className="text-red-500 text-sm">{errors[`subRoomCapacity${index}`]}</p>}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block mb-1 text-sm">Sub-Room Image</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleSubRoomImageChange(index, e)}
                          className="w-full p-2 border rounded"
                        />
                      </div>
                      <div className="flex items-center justify-center">
                        {subRoom.imagePreview && (
                          <img 
                            src={subRoom.imagePreview} 
                            alt={`Sub-room ${index + 1} preview`} 
                            className="h-24 object-cover rounded"
                          />
                        )}
                        {!subRoom.imagePreview && (
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
  );
};

export default RoomForm;