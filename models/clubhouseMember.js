const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const clubhouseMemberSchema = new mongoose.Schema({
  resident: String,
  joinDate: { type: String, default: Date.now() },
});

const ClubhouseMember = mongoose.model('ClubhouseMember', clubhouseMemberSchema);

function validateClubhouseMember(member, id = false) {
  const schema = {
    resident: Joi.objectId(),
    joinDate: Joi.date().optional(),
  };

  if (id) {
    member.id = id;
    schema.id = Joi.objectId();
  }

  const clubhouseMemberSchema = Joi.object(schema);
  return clubhouseMemberSchema.validate(member);
}

module.exports = { ClubhouseMember, clubhouseMemberSchema };
