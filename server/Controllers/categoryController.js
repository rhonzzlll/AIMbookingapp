const  {Category}  = require('../models/');

// Create a new category
const createCategory = async (req, res) => {
  try {
    const { buildingId, categoryName, categoryDescription } = req.body;

    const newCategory = await Category.create({
      buildingId,
      categoryName,
      categoryDescription
    });

    res.status(201).json({ message: 'Category created successfully', category: newCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error creating category', error: error.message });
  }
};

// Get all categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};

// Get category by ID
const getCategoryById = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching category', error: error.message });
  }
};

// Update category by ID
const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { buildingId, categoryName, categoryDescription } = req.body;

    const category = await Category.findByPk(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.buildingId = buildingId;
    category.categoryName = categoryName;
    category.categoryDescription = categoryDescription;

    await category.save();

    res.status(200).json({ message: 'Category updated successfully', category });
  } catch (error) {
    console.error(error);
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
    console.error(error);
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
