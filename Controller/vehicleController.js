// controllers/vehicleController.js
const Vehicle = require('../Model/Vehicle');

// Get all vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find(); // Fetch all vehicles from the database
    res.status(200).json({ success: true, vehicles }); // Send response with vehicles
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch vehicles', error: error.message });
  }
};
