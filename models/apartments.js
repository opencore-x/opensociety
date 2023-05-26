const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const apartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: String, min: 3, max: 20 },
  tenant: { type: String, min: 3, max: 20 },
  occupants: [String],
});

const Apartment = mongoose.model('Apartment', apartmentSchema);

// validate both apartment and ObjectID
function validateApartment(apartment, id = false) {
  const schema = {
    name: Joi.string().required(),
    owner: Joi.string().min(3).max(20),
    tenant: Joi.string().min(3).max(20),
    occupants: Joi.array().items(Joi.string()),
  };

  if (id) {
    schema.id = Joi.objectId();
    apartment.id = id;
  }

  const apartmentSchema = Joi.object(schema);
  return apartmentSchema.validate(apartment);
}

module.exports = { Apartment, validateApartment };

// todo:
// change resident to object
