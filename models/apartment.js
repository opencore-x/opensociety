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
  residents: [String],
});

const Apartment = mongoose.model('Apartment', apartmentSchema);

module.exports = { Apartment, apartmentSchema };

// todo:
// change resident to object
