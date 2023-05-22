const mongoose = require('mongoose');
const Joi = require('joi');

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
  visiting: { type: String, required: true },
});

function validateVisitor(visitor) {
  const joiSchema = Joi.object({
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
    visiting: Joi.string().required().lowercase(),
  });

  return joiSchema.validate(visitor);
}

const Visitor = mongoose.model('Visitor', visitorSchema);

module.exports = { Visitor, validateVisitor };
