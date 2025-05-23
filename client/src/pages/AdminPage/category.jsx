import React, { useState, useEffect } from 'react';
import AdminContentTemplate from './AdminContentTemplate';
import TopBar from '../../components/AdminComponents/TopBar';

// Modal component for adding/editing categories
const CategoryModal = ({ 
  isOpen, 
  onClose, 
  buildings, 
  onSave, 
  editData = null 
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [description, setDescription] = useState('');

  // Initialize form with edit data if available
  useEffect(() => {
    if (editData) {
      setCategoryName(editData.name || '');
      setSelectedBuilding(editData.building || '');
      setDescription(editData.description || '');
    } else {
      // Reset form when adding new
      setCategoryName('');
      setSelectedBuilding('');
      setDescription('');
    }
  }, [editData, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    onSave({
      id: editData ? editData.id : Date.now(), // Use existing ID or create new one
      name: categoryName,
      building: selectedBuilding,
      description: description
    });
    
    // Reset and close
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? 'Edit Category' : 'Add New Category'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Building
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => setSelectedBuilding(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Please select a building</option>
              {buildings && buildings.length > 0 ? (
                buildings.map(building => (
                  <option 
                    key={building.buildingI || building.buildingId || building.id} 
                    value={building.buildingName || building.name}
                  >
                    {building.buildingName || building.name}
                  </option>
                ))
              ) : (
                <option disabled>No buildings available</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter category name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter category description"
              rows="3"
            />
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
              disabled={!categoryName || !selectedBuilding} 
              className={`px-4 py-2 rounded-md ${(!categoryName || !selectedBuilding) ? 
                'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {editData ? 'Update Category' : 'Add Category'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Fetch categories and buildings on component mount
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const buildingsResponse = await fetch('http://localhost:5000/api/buildings');
      const categoriesResponse = await fetch('http://localhost:5000/api/categories');

      if (buildingsResponse.ok && categoriesResponse.ok) {
        const buildingsData = await buildingsResponse.json();
        const categoriesData = await categoriesResponse.json();
        
        console.log('Categories data:', categoriesData);
        
        // Transform API response to frontend format
        const normalizedCategories = categoriesData.map(category => ({
          id: category.categoryId,
          name: category.categoryName,
          building: category.buildingName, // Use the included building name 
          description: category.categoryDescription
        }));
        
        setBuildings(buildingsData);
        setCategories(normalizedCategories);
      } else {
        throw new Error('Failed to fetch data');
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEditModal = (category) => {
    console.log('Opening edit modal with data:', category);
    setEditingCategory(category);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      console.log('About to save:', categoryData); // Debug: log what we're saving
      
      // Transform the data to match backend expectations
      const formattedData = {
        categoryId: categoryData.id,
        categoryName: categoryData.name,
        building: categoryData.building, // This should be the building name
        description: categoryData.description
      };

      console.log('Sending to backend:', formattedData); // Debug: log what we're sending

      let response;

      if (editingCategory) {
        // Update existing category (PUT request)
        response = await fetch(`http://localhost:5000/api/categories/${categoryData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedData),
        });
      } else {
        // Add new category (POST request)
        response = await fetch('http://localhost:5000/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedData),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      // Try to parse the response as JSON
      let updatedCategory;
      const responseText = await response.text();
      
      try {
        // Only try to parse if there's actual content
        if (responseText.trim()) {
          updatedCategory = JSON.parse(responseText);
        } else {
          // If no content returned, use the data we sent
          updatedCategory = formattedData;
        }
      } catch (e) {
        console.error('Error parsing response:', e);
        // Fallback to using the data we sent
        updatedCategory = formattedData;
      }

      console.log('Response from server (parsed):', updatedCategory);

      // Create a normalized version that matches our frontend structure
      const normalizedCategory = {
        id: updatedCategory.id || updatedCategory.categoryId,
        name: updatedCategory.name || updatedCategory.categoryName,
        building: updatedCategory.building, // Ensure building is mapped correctly
        description: updatedCategory.description || updatedCategory.categoryDescription || ''
      };

      console.log('Normalized category to save to state:', normalizedCategory);

      // Update the state with the normalized data
      if (editingCategory) {
        setCategories(categories.map((cat) => 
          (cat.id === normalizedCategory.id ? normalizedCategory : cat)
        ));
      } else {
        setCategories([...categories, normalizedCategory]);
      }

      alert(editingCategory ? 'Category updated successfully!' : 'Category added successfully!');
      closeModal(); // Close the modal after saving
    } catch (error) {
      console.error('Error saving category:', error);
      alert(`Failed to save category: ${error.message}. Please try again.`);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.building.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
  
    try {
      const response = await fetch(`http://localhost:5000/api/categories/${id}`, {
        method: 'DELETE',
      });
  
      if (response.ok) {
        setCategories(categories.filter((category) => category.id !== id));
        alert('Category deleted successfully!');
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category. Please try again.');
    }
  };
  
  return (
  <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '100vh'}}>
      <TopBar onSearch={setSearchTerm} />
    <AdminContentTemplate>
      <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Category Management</h1>
        <p className="text-gray-600 mb-6">Add and manage room categories for your buildings</p>
        
        {/* Add Category Button */}
        <div className="mb-6">
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
          +   Add New Category
          </button>
        </div>
        
        {/* Categories Table */}
        <div className="overflow-x-auto">
          <h2 className="text-lg font-semibold mb-4">Categories</h2>
          {loading ? (
            <p>Loading categories...</p>
          ) : categories.length === 0 ? (
            <p>No categories found. Add your first category using the button above.</p>
          ) : (
<div className="shadow overflow-hidden border border-gray-300 sm:rounded-lg">
  <table className="min-w-full divide-y divide-gray-300 border-collapse border border-gray-300">
    <thead className="bg-gray-50">
      <tr>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
          Category Name
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
          Building
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
          Description
        </th>
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border border-gray-300">
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-300">
      {filteredCategories.map((category) => (
        <tr key={category.id}>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border border-gray-300">
            {category.name || 'No Name'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border border-gray-300">
            {category.building || 'No Building Assigned'}
          </td>
          <td className="px-6 py-4 text-sm text-gray-900 border border-gray-300">
            {category.description || 'No Description'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium border border-gray-300">
            <button
              onClick={() => openEditModal(category)}
              className="text-blue-600 hover:text-blue-900 mr-4"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="text-red-600 hover:text-red-900"
            >
              Delete
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
          )}
        </div>
      </div>
      
      {/* Modal for Adding/Editing Categories */}
      <CategoryModal
        isOpen={modalOpen}
        onClose={closeModal}
        buildings={buildings}
        onSave={handleSaveCategory}
        editData={editingCategory}
      />
    </AdminContentTemplate>
    </div>
  );
};

export default CategoryManagement;