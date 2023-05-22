const mongoose = require('mongoose');
const Joi = require('joi');

// todo:
// full name
// change add primary and secondary phone
// worksAt set to house object
// report entry time
const houseHelpSchema = new mongoose.Schema({
  name: { type: String, required: true, lowercase: true, min: 3, max: 20 },
  phone: { type: String, required: true, min: 9, max: 10 },
  worksAt: [String],
  duties: {
    type: String,
    enum: ['diswashing', 'cleaning', 'dusting', 'cooking'],
  },
});
function validateHouseHelp(houseHelp) {
  const schema = Joi.object({
    name: Joi.string().lowercase().min(3).max(20).required(),
    phone: Joi.string().lowercase().length(10).required(),
    worksAt: Joi.array().items(Joi.string()),
    duties: Joi.string().valid('dishwashing', 'cleaning', 'dusting', 'cooking'),
  });
  return schema.validate(houseHelp);
}

const HouseHelp = mongoose.model('HouseHelp', houseHelpSchema);

module.exports = { HouseHelp, validateHouseHelp };

// todo
// change phone .length to 10
// duties can be array
