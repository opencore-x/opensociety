const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

const houseHelpSchema = new mongoose.Schema({
  firstName: { type: String, required: true, lowercase: true, min: 3, max: 15 },
  lastName: { type: String, required: true, lowercase: true, min: 3, max: 15 },
  phone: { type: String, required: true, min: 10, max: 10 },
  gender: { type: String, enum: ['male', 'female'] },
  worksAt: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Apartment' }],
  duties: {
    type: String,
    enum: ['diswashing', 'cleaning', 'dusting', 'cooking'],
  },
  role: { type: String, default: 'houseHelp' },
});

const joiSchema = {
  firstName: Joi.string().lowercase().min(3).max(15).required(),
  lastName: Joi.string().lowercase().min(3).max(15).required(),
  phone: Joi.string().lowercase().length(10).required(),
  gender: Joi.string().valid('male', 'female'),
  worksAt: Joi.array().items(Joi.objectid()),
  duties: Joi.array().items(Joi.string().valid('dishwashing', 'cleaning', 'dusting', 'cooking')),
};

const HouseHelp = mongoose.model('HouseHelp', houseHelpSchema);

module.exports = { HouseHelp, joiSchema };

// todo
// create a new duties model - to have all the duties
// report entry time
