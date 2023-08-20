const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

const apartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: String, min: 3, max: 20 },
  tenant: { type: String, min: 3, max: 20 },
  occupants: [String],
});

const joiSchema = {
  name: Joi.string().required(),
  owner: Joi.objectid(),
  tenant: Joi.objectid(),
  occupants: Joi.array().items(Joi.objectid()),
};

const Apartment = mongoose.model('Apartment', apartmentSchema);

module.exports = { Apartment, joiSchema };
