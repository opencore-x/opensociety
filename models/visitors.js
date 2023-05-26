const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

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

const Visitor = mongoose.model('Visitor', visitorSchema);

function validateVisitor({ body, id }) {
  const schema = {
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
  };

  if (id && body) {
    schema.id = Joi.objectId();
    body.id = id;
  } else if (id) {
    schema = { id: Joi.objectId() };
    body = { id: id };
  }

  const visitorSchema = Joi.object(schema);
  return visitorSchema.validate(body);
}

module.exports = { Visitor, validateVisitor };
