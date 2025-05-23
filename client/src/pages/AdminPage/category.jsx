import React, { useState, useEffect, useMemo } from 'react';
import AdminContentTemplate from './AdminContentTemplate';
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
  TableFooter,
  Typography,
  Stack,
} from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category'; // <-- Add this import

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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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
      setErrors({});
    }
  }, [editData, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!categoryName.trim()) newErrors.name = 'Category name is required';
    if (!selectedBuilding) newErrors.building = 'Please select a building';
    if (description && description.length > 500)
      newErrors.description = 'Description must be less than 500 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    onSave({
      id: editData ? editData.id : Date.now(), // Use existing ID or create new one
      name: categoryName,
      building: selectedBuilding,
      description: description
    });
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">
          {editData ? 'Edit Category' : 'Add New Category'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Building*
              </label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className={`w-full px-3 py-2 border ${errors.building ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value="">Please select a building</option>
                {buildings && buildings.length > 0 ? (
                  buildings.map(building => (
                    <option 
                      key={building._id || building.buildingId || building.id} 
                      value={building.buildingName || building.name}
                    >
                      {building.buildingName || building.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No buildings available</option>
                )}
              </select>
              {errors.building && (
                <p className="text-red-500 text-xs mt-1">{errors.building}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name*
              </label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter category name"
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                placeholder="Enter category description"
                rows="3"
              />
              <div className="flex justify-between">
                {errors.description ? (
                  <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                ) : (
                  <span className="text-xs text-gray-500 mt-1">
                    {description ? description.length : 0}/500 characters
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`px-4 py-2 rounded-md ${loading
                  ? 'bg-blue-300 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'} text-white`}
              >
                {loading
                  ? 'Processing...'
                  : editData
                  ? 'Update Category'
                  : 'Add Category'}
              </button>
            </div>
          </div>
        </form>
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    // Fetch categories and buildings on component mount
    fetchData();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm]);

  const fetchData = async () => {
    try {
      const buildingsResponse = await fetch('http://localhost:5000/api/buildings');
      const categoriesResponse = await fetch('http://localhost:5000/api/categories');

      if (buildingsResponse.ok && categoriesResponse.ok) {
        const buildingsData = await buildingsResponse.json();
        const categoriesData = await categoriesResponse.json();
        
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
    setEditingCategory(category);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveCategory = async (categoryData) => {
    try {
      const formattedData = {
        categoryId: categoryData.id,
        categoryName: categoryData.name,
        building: categoryData.building, // This should be the building name
        description: categoryData.description
      };

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

      // Create a normalized version that matches our frontend structure
      const normalizedCategory = {
        id: updatedCategory.id || updatedCategory.categoryId,
        name: updatedCategory.name || updatedCategory.categoryName,
        building: updatedCategory.building, // Ensure building is mapped correctly
        description: updatedCategory.description || updatedCategory.categoryDescription || ''
      };

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

  const pagedCategories = useMemo(() => {
    if (rowsPerPage > 0) {
      return filteredCategories.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    }
    return filteredCategories;
  }, [filteredCategories, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '120vh'}}>
      <TopBar onSearch={setSearchTerm} />
      <AdminContentTemplate>
        <div className="p-6 bg-white rounded-lg shadow">
          {/* Header Section */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <CategoryIcon sx={{ fontSize: 48, color: '#2563eb' }} />
              <Box>
                <Typography variant="h1" sx={{ fontSize: 48, fontWeight: 'bold', color: 'gray.800', lineHeight: 1 }}>
                  Category Management
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'gray.600', fontSize: 18 }}>
                  manage room categories for your buildings
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
              + Add New Category
            </Button>
          </Box>
          {/* Categories Table */}
          <div className="overflow-x-auto">
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, textAlign: 'left' }}>
              Categories
            </Typography>
            {loading ? (
              <div className="text-center py-4">
                <p>Loading categories...</p>
              </div>
            ) : categories.length === 0 ? (
              <p>No categories found. Add your first category using the button above.</p>
            ) : (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table sx={{ minWidth: 900 }} aria-label="categories table">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Category Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Building</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No categories found. Add your first category using the button above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>{category.name || 'No Name'}</TableCell>
                          <TableCell>{category.building || 'No Building Assigned'}</TableCell>
                          <TableCell>
                            <Box sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {category.description || 'No Description'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              sx={{ mr: 1 }}
                              onClick={() => openEditModal(category)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              onClick={() => handleDeleteCategory(category.id)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        colSpan={4}
                        count={filteredCategories.length}
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

export default CategoryManagement;