const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const securitySchema = new mongoose.Schema({
  firstName: { type: String, required: true, min: 3, max: 20 },
  lastName: { type: String, required: true, min: 3, max: 20 },
  phone: { type: String, required: true, min: 9, max: 10 },
  password: { type: String, required: true, max: 40 },
});

const SecurityGuard = mongoose.model('SecurityGuard', securitySchema);

function validateSecurityGuard({ body, id }) {
  const schema = {
    firstName: Joi.string().min(3).max(20).required(),
    lastName: Joi.string().min(3).max(20).required(),
    phone: Joi.string().length(10).required(),
    password: Joi.string().min(6).max(50).require(),
  };

  if (id && body) {
    schema.id = Joi.objectId();
    body.id = id;
  } else if (id) {
    schema = { id: Joi.objectId() };
    body = { id: id };
  }

  const securitySchema = Joi.object(schema);
  return securitySchema.validate(body);
}

module.exports = { SecurityGuard, validateSecurityGuard };
