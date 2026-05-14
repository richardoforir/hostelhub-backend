const University = require('../models/University');

// CREATE UNIVERSITY
const createUniversity = async (req, res) => {
  try {
    const { name, location, region, description, image } = req.body;

    const university = await University.create({
      name,
      location,
      region,
      description,
      image,
    });

    res.status(201).json({
      message: 'University created successfully',
      university,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET ALL UNIVERSITIES
const getUniversities = async (req, res) => {
  try {
    const universities = await University.find();

    res.status(200).json(universities);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  createUniversity,
  getUniversities,
};