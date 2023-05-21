const mongoose = require('mongoose');
const Joi = require('joi');
const config = require('config');

mongoose
  .connect(
    `mongodb+srv://${config.get('MONGO_USERNAME')}:${config.get(
      'MONGO_PASSWORD'
    )}@vidly.zivn542.mongodb.net/vidly`
  )
  .then(() => console.log('connected to mongodb'))
  .catch((err) => console.log(err));

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
