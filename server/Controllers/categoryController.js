const { Category, Building } = require('../models/');

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { categoryName, building, description } = req.body;
    
    // Find the building ID based on the building name
    const buildingRecord = await Building.findOne({
      where: { buildingName: building }
    });
    
    if (!building || !buildingRecord) {
      return res.status(400).json({ 
        message: 'Invalid building selection',
        error: 'Building not found'
      });
    }

    // Generate a small integer ID
    const smallerId = Math.floor(Math.random() * 10000);
    
    const newCategory = await Category.create({
      categoryId: smallerId,
      buildingId: buildingRecord.buildingId,
      categoryName,
      categoryDescription: description || null
    });

    // Return the exact database model structure
    res.status(201).json({
      categoryId: newCategory.categoryId,
      buildingId: newCategory.buildingId,
      categoryName: newCategory.categoryName,
      categoryDescription: newCategory.categoryDescription
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    // Get all categories with their buildings
    const categories = await Category.findAll({
      include: [{
        model: Building,
        attributes: ['buildingName', 'buildingId'],
        required: false
      }]
    });
    
    // Format the response to match exact database model structure
    const formattedCategories = categories.map(category => ({
      categoryId: category.categoryId,
      buildingId: category.buildingId,
      categoryName: category.categoryName,
      categoryDescription: category.categoryDescription,
      // Include building name as well for convenience
      buildingName: category.Building?.buildingName || null
    }));
    
    res.status(200).json(formattedCategories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findByPk(categoryId, {
      include: [{
        model: Building,
        attributes: ['buildingName'],
        required: false
      }]
    });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Transform to match frontend expectations
    const formattedCategory = {
      id: category.categoryId,
      name: category.categoryName,
      building: category.Building?.buildingName || 'Unknown Building',
      description: category.categoryDescription
    };

    res.status(200).json(formattedCategory);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ message: 'Error fetching category', error: error.message });
  }
};

// Update category by ID
const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { categoryName, building, description } = req.body;
    
    // Find the category
    const category = await Category.findByPk(categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // If building name is provided, find the building ID
    let buildingId = category.buildingId;
    if (building) {
      const buildingRecord = await Building.findOne({
        where: { buildingName: building }
      });
      
      if (!buildingRecord) {
        return res.status(400).json({ message: 'Invalid building selection' });
      }
      
      buildingId = buildingRecord.buildingId;
    }
    
    // Update the category
    await category.update({
      categoryName: categoryName || category.categoryName,
      buildingId: buildingId,
      categoryDescription: description !== undefined ? description : category.categoryDescription
    });
    
    // Get the updated category with building info
    const updatedCategory = await Category.findByPk(categoryId, {
      include: [{
        model: Building,
        attributes: ['buildingName'],
        required: false
      }]
    });
    
    // Return in model format
    res.status(200).json({
      categoryId: updatedCategory.categoryId,
      buildingId: updatedCategory.buildingId,
      categoryName: updatedCategory.categoryName,
      categoryDescription: updatedCategory.categoryDescription,
      buildingName: updatedCategory.Building?.buildingName || null
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Error updating category', error: error.message });
  }
};

// Delete category by ID
const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.destroy();
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Error deleting category', error: error.message });
  }
};

module.exports = {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
