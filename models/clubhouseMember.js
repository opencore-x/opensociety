const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

const clubhouseMemberSchema = new mongoose.Schema({
  resident: { type: mongoose.Schema.Types.ObjectId, ref: 'Resident', required: true },
  joinDate: { type: String, default: Date.now(), required: true },
});

const joiSchema = {
  resident: Joi.objectid().required(),
  joinDate: Joi.date().optional(),
};

const ClubhouseMember = mongoose.model('ClubhouseMember', clubhouseMemberSchema);

module.exports = { ClubhouseMember, joiSchema };
