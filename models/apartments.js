const mongoose = require('mongoose');
const Joi = require('joi');

const apartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: String, min: 3, max: 20 },
  tenant: { type: String, min: 3, max: 20 },
  occupants: [String],
});

const Apartment = mongoose.model('Apartment', apartmentSchema);

function validateApartment(apartment) {
  const schema = Joi.object({
    name: Joi.string().required(),
    owner: Joi.string().min(3).max(20),
    tenant: Joi.string().min(3).max(20),
    occupants: Joi.array().items(Joi.string()),
  });

  return schema.validate(apartment);
}

module.exports = { Apartment, validateApartment };

// todo:
// change resident to object
