import React, { useState, useEffect, useMemo, useContext } from 'react';
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
import CategoryIcon from '@mui/icons-material/Category';
import DeleteConfirmation from './modals/DeleteConfirmation';
import { AuthContext } from '../../context/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_URI;

// Success Modal Component
const SuccessModal = ({ open, message, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Success</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          OK
        </button>
      </div>
    </div>
  );
};

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
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editData) {
      setCategoryName(editData.name || '');
      setSelectedBuilding(editData.building || '');
    } else {
      setCategoryName('');
      setSelectedBuilding('');
      setErrors({});
    }
  }, [editData, isOpen]);

  const validateForm = () => {
    const newErrors = {};
    if (!categoryName.trim()) newErrors.name = 'Category name is required';
    if (!selectedBuilding) newErrors.building = 'Please select a building';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    onSave({
      id: editData ? editData.id : Date.now(),
      name: categoryName,
      building: selectedBuilding,
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
  const [selectedBuildingTab, setSelectedBuildingTab] = useState('All');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  const { role } = useContext(AuthContext);

  // Helper to check if current user is SuperAdmin (case-insensitive)
  const isSuperAdmin = role && role.toLowerCase() === 'superadmin';

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setPage(0);
  }, [searchTerm, selectedBuildingTab]);

  const fetchData = async () => {
    try {
      const buildingsResponse = await fetch(`${API_BASE_URL}/buildings`);
      const categoriesResponse = await fetch(`${API_BASE_URL}/categories`);

      if (buildingsResponse.ok && categoriesResponse.ok) {
        const buildingsData = await buildingsResponse.json();
        const categoriesData = await categoriesResponse.json();

        const normalizedCategories = categoriesData.map(category => ({
          id: category.categoryId,
          name: category.categoryName,
          building: category.buildingName || '', // Always a string
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
        building: categoryData.building,
      };

      let response;

      if (editingCategory) {
        response = await fetch(`${API_BASE_URL}/categories/${categoryData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedData),
        });
      } else {
        response = await fetch(`${API_BASE_URL}/categories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formattedData),
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${errorText}`);
      }

      const responseJson = await response.json();

      // Always normalize to { id, name, building }
      const normalizedCategory = {
        id: responseJson.categoryId || responseJson.id,
        name: responseJson.categoryName || responseJson.name,
        building: responseJson.buildingName || responseJson.building || '',
      };

      if (editingCategory) {
        setCategories(categories.map((cat) =>
          (cat.id === normalizedCategory.id ? normalizedCategory : cat)
        ));
        setSuccessModal({ open: true, message: 'Category updated successfully!' });
      } else {
        setCategories([...categories, normalizedCategory]);
        setSuccessModal({ open: true, message: 'Category added successfully!' });
      }

      closeModal();
    } catch (error) {
      console.error('Error saving category:', error);
      setSuccessModal({ open: true, message: `Failed to save category: ${error.message}. Please try again.` });
    }
  };

  // Delete logic using DeleteConfirmation modal
  const handleDeleteCategory = (category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCategories(categories.filter((cat) => cat.id !== categoryToDelete.id));
        setSuccessModal({ open: true, message: 'Category deleted successfully!' });
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      setSuccessModal({ open: true, message: 'Failed to delete category. Please try again.' });
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const cancelDeleteCategory = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  // Filter by building tab and search
  const filteredCategories = categories.filter(category => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.building.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBuilding =
      selectedBuildingTab === 'All' || category.building === selectedBuildingTab;
    return matchesSearch && matchesBuilding;
  });

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

  return (
    <div style={{ position: 'fixed', top: 0, left: 257, width: 'calc(100% - 257px)', zIndex: 500, overflowY: 'auto', height: '120vh' }}>
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
                   
                </Typography>
              </Box>
            </Stack>
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

          {/* Building Tabs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button
              onClick={() => setSelectedBuildingTab('All')}
              style={{
                background: selectedBuildingTab === 'All' ? '#2563eb' : '#f3f4f6',
                color: selectedBuildingTab === 'All' ? '#fff' : '#374151',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              All
            </button>
            {buildings.map((building) => (
              <button
                key={building._id || building.buildingId || building.id}
                onClick={() => setSelectedBuildingTab(building.buildingName || building.name)}
                style={{
                  background: selectedBuildingTab === (building.buildingName || building.name) ? '#2563eb' : '#f3f4f6',
                  color: selectedBuildingTab === (building.buildingName || building.name) ? '#fff' : '#374151',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {building.buildingName || building.name}
              </button>
            ))}
          </div>

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
                      <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pagedCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} align="center">
                          No categories found. Add your first category using the button above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedCategories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell>{category.name || 'No Name'}</TableCell>
                          <TableCell>{category.building || 'No Building Assigned'}</TableCell>
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
                            {isSuperAdmin && (
                              <Button
                                variant="contained"
                                color="error"
                                size="small"
                                onClick={() => handleDeleteCategory(category)}
                              >
                                Delete
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TablePagination
                        rowsPerPageOptions={[10, 25, 50]}
                        colSpan={3}
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

        {/* Delete Confirmation Modal */}
        {deleteDialogOpen && (
          <DeleteConfirmation
            room={{ roomName: categoryToDelete?.name }}
            onConfirm={confirmDeleteCategory}
            onCancel={cancelDeleteCategory}
          />
        )}

        {/* Success Modal */}
        <SuccessModal
          open={successModal.open}
          message={successModal.message}
          onClose={() => setSuccessModal({ open: false, message: '' })}
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