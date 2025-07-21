const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid');

const vehicleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  vehicleNo: { type: String, required: true },
  type: { type: String, enum: ['car', 'scooter', 'bike', 'pickup'] },
  color: { type: String, required: true },
  apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment', required: true },
});

const joiSchema = {
  name: Joi.string().required(),
  vehicleNo: Joi.string().required(),
  type: Joi.string().valid('car', 'scooter', 'bike', 'pickup').required(),
  color: Joi.string().required(),
  apartment: Joi.objectid(),
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = { Vehicle, joiSchema };
