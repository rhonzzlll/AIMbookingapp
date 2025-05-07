import React, { useState, useEffect } from 'react';
import AdminContentTemplate from './AdminContentTemplate';

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
              {buildings.map(building => (
                <option key={building.id} value={building.name}>
                  {building.name}
                </option>
              ))}
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

  useEffect(() => {
    // Fetch categories and buildings on component mount
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch buildings and categories from API
      const buildingsResponse = await fetch('/api/buildings');  // Replace with your actual endpoint
      const categoriesResponse = await fetch('/api/categories'); // Replace with your actual endpoint
  
      // Check if the responses are okay
      if (buildingsResponse.ok && categoriesResponse.ok) {
        const buildingsData = await buildingsResponse.json();
        const categoriesData = await categoriesResponse.json();
  
        setBuildings(buildingsData);
        setCategories(categoriesData);
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
    setEditingCategory(category);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      let response;
  
      if (editingCategory) {
        // Update existing category (PUT request)
        response = await fetch(`/api/categories/${categoryData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryData),
        });
      } else {
        // Add new category (POST request)
        response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(categoryData),
        });
      }
  
      if (response.ok) {
        const updatedCategory = await response.json();
  
        // Update the state
        if (editingCategory) {
          setCategories(categories.map((cat) => (cat.id === updatedCategory.id ? updatedCategory : cat)));
        } else {
          setCategories([...categories, updatedCategory]);
        }
  
        alert(editingCategory ? 'Category updated successfully!' : 'Category added successfully!');
        onClose(); // Close the modal after saving
      } else {
        throw new Error('Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category. Please try again.');
    }
  };
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
  
    try {
      const response = await fetch(`/api/categories/${id}`, {
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
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Building
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {category.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {category.building}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {category.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
  );
};

export default CategoryManagement;