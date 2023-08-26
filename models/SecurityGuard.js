const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

const securitySchema = new mongoose.Schema({
  firstName: { type: String, required: true, min: 3, max: 20 },
  lastName: { type: String, required: true, min: 3, max: 20 },
  phone: { type: String, required: true, min: 9, max: 100 },
  password: { type: String, required: true, max: 40 },
});

const joiSchema = {
  firstName: Joi.string().min(3).max(20).required(),
  lastName: Joi.string().min(3).max(20).required(),
  phone: Joi.string().length(10).required(),
  password: Joi.string().min(6).max(100).required(),
  repeatPassword: Joi.string().valid(Joi.ref('password')).required(),
};

const SecurityGuard = mongoose.model('SecurityGuard', securitySchema);

module.exports = { SecurityGuard, joiSchema };
