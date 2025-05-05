// Model/Vehicle.js
const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  modelName: String,
  type: String,
  capacity: Number,
  ratePerKm: Number,
  baseFare: Number,
  imageUrl: String,
  available: {
    type: Boolean,
    default: true
  }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
module.exports = Vehicle;
