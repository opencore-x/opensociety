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

const residentsSchema = new mongoose.Schema({
  firstName: { type: String, min: 3, max: 20, required: true },
  lastName: { type: String, min: 3, max: 20, required: true },
  dob: { type: String, required: true },
  gender: { type: String, required: true, enum: ['male', 'female', 'prefer not to say'] },
  phone: { type: String, required: true },
  email: { type: String, required: true, min: 5, max: 30 },
  apartment: String,
  status: { type: String, required: true, enum: ['owner', 'tenant'] },
  nationality: { type: String, min: 3, max: 20 },
});

const Resident = mongoose.model('Resident', residentsSchema);

function validateResident(resident) {
  const schema = Joi.object({
    firstName: Joi.string().min(3).max(20).required(),
    lastName: Joi.string().min(3).max(20).required(),
    dob: Joi.string().required(),
    gender: Joi.string().valid('male', 'female', 'prefer not to say').required(),
    phone: Joi.string().length(10).required(),
    email: Joi.string().email().min(5).max(30),
    apartment: Joi.string(),
    status: Joi.string().valid('owner', 'tenant').required(),
    nationality: Joi.string().min(2).max(20).required(),
  });

  return schema.validate(resident);
}

module.exports = { Resident, validateResident };

// todo
// change dob type to Date
// think about country code and whatsapp no.
