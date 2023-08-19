const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

const clubhouseMemberSchema = new mongoose.Schema({
  resident: String,
  joinDate: { type: String, default: Date.now() },
});

const joiSchema = {
  resident: Joi.objectid(),
  joinDate: Joi.date().optional(),
};

const ClubhouseMember = mongoose.model('ClubhouseMember', clubhouseMemberSchema);

module.exports = { ClubhouseMember, joiSchema };
