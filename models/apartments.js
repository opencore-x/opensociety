const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);
const isValidObjectId = require('../modules/isValidObjectId');

const apartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: String, min: 3, max: 20 },
  tenant: { type: String, min: 3, max: 20 },
  occupants: [String],
});

const Apartment = mongoose.model('Apartment', apartmentSchema);

// validate both apartment and ObjectID
function validateApartment({ body, id }) {
  let schema = {
    name: Joi.string().required(),
    owner: Joi.objectId(),
    tenant: Joi.objectId(),
    occupants: Joi.array().items(Joi.objectId()),
  };

  if (id && body) {
    schema.id = Joi.objectId();
    body.id = id;
  } else if (id) {
    schema = { id: Joi.objectId() };
    body = { id: id };
  }

  const apartmentSchema = Joi.object(schema);
  return apartmentSchema.validate(body);
}

module.exports = { Apartment, validateApartment };
