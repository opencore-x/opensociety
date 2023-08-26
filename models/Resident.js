const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

const residentSchema = new mongoose.Schema({
  firstName: { type: String, min: 3, max: 20, required: true },
  lastName: { type: String, min: 3, max: 20, required: true },
  dob: { type: String, required: true },
  gender: { type: String, required: true, enum: ['male', 'female', 'prefer not to say'] },
  phone: { type: String, required: true },
  email: { type: String, required: true, min: 5, max: 30 },
  password: { type: String, required: true, min: 6 },
  apartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Apartment', required: true },
  status: { type: String, required: true, enum: ['owner', 'tenant'] },
  nationality: { type: String, min: 3, max: 20 },
});

const joiSchema = {
  firstName: Joi.string().min(3).max(20).required(),
  lastName: Joi.string().min(3).max(20).required(),
  dob: Joi.string().required(),
  gender: Joi.string().valid('male', 'female', 'prefer not to say').required(),
  phone: Joi.string().length(10).required(),
  email: Joi.string().email().min(5).max(30),
  password: Joi.string().min(6).required(),
  apartment: Joi.objectid().required(),
  status: Joi.string().valid('owner', 'tenant').required(),
  nationality: Joi.string().min(3).max(20).required(),
};

const Resident = mongoose.model('Resident', residentSchema);

module.exports = { Resident, joiSchema };

// todo
// change dob type to Date
// think about country code and whatsapp no.
