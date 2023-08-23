const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid');

const vehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vehicleNo: { type: String, required: true },
  type: [String],
  color: { type: String, required: true },
  apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment', required: true },
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = { Vehicle };
