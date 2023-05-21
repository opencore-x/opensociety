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

const securitySchema = new mongoose.Schema({
  firstName: { type: String, required: true, min: 3, max: 20 },
  middleName: { type: String, min: 3, max: 20 },
  lastName: { type: String, required: true, min: 3, max: 20 },
  phone: { type: String, required: true, min: 9, max: 10 },
  password: { type: String, required: true, max: 40 },
});

function validateSecurityGuard(securityGuard) {
  const schema = Joi.object({
    firstName: Joi.string().min(3).max(20).required(),
    middleName: Joi.string().min(3).max(20),
    lastName: Joi.string().min(3).max(20).required(),
    phone: Joi.string().length(10).required(),
    password: Joi.string().min(6).max(50).require(),
  });

  return schema.validate(securityGuard);
}

const SecurityGuard = mongoose.model('SecurityGuard', securitySchema);

module.exports = { SecurityGuard, validateSecurityGuard };

// todo
// remove middlename option
