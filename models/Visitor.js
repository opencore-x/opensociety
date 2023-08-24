const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

const visitorSchema = new mongoose.Schema({
  name: { type: String, required: true, min: 3, max: 20, lowercase: true },
  phone: { type: String, required: true, min: 9, max: 10 },
  hasVehicle: { type: Boolean, default: false },
  vehicleType: {
    type: String,
    enum: ['bus', 'car', 'truck', 'bike', 'auto', 'bicycle'],
    required: function () {
      return this.hasVehicle;
    },
  },
  vehicleNumber: {
    type: String,
    required: function () {
      return this.hasVehicle;
    },
    lowercase: true,
  },
  apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment', required: true },
  notes: { type: String },
});

const joiSchema = {
  name: Joi.string().lowercase().min(3).max(20).required(),
  phone: Joi.string().length(10).required(),
  hasVehicle: Joi.boolean().required(),
  vehicleType: Joi.string().when('hasVehicle', {
    is: true,
    then: Joi.string().lowercase().valid('bus', 'car', 'truck', 'bike', 'auto', 'bicycle').required(),
    otherwise: Joi.string().optional(),
  }),
  vehicleNumber: Joi.string().when('hasVehicle', {
    is: true,
    then: Joi.string().lowercase().required(),
    otherwise: Joi.string().optional(),
  }),
  apartment: Joi.objectid(),
  notes: Joi.string().optional(),
};

const Visitor = mongoose.model('Visitor', joiSchema);

module.exports = { Visitor, joiSchema };
