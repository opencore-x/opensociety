const mongoose = require('mongoose');
const Joi = require('joi');

const clubhouseMemberSchema = new mongoose.Schema({
  resident: String,
  joinDate: { type: String, default: Date.now() },
});

const ClubhouseMember = mongoose.model('ClubhouseMember', clubhouseMemberSchema);

function validateClubhouseMember() {
  const schema = Joi.object({
    resident: Joi.object(),
    joinDate: Joi.date().optional(),
  });
}

module.exports = { ClubhouseMember, clubhouseMemberSchema };
