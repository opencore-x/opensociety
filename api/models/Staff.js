const mongoose = require('mongoose');
const Joi = require('joi');

const staffSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
});

const joiSchema = {
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  phone: Joi.string().length(10).required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  repeatPassword: Joi.string().valid(Joi.ref('password')).required(),
  role: Joi.string().required(),
};

const Staff = mongoose.model('Staff', staffSchema);

module.exports = { Staff, joiSchema };

// todo: add length to properties -> joi schema
