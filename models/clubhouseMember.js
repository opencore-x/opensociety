const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const clubhouseMemberSchema = new mongoose.Schema({
  resident: String,
  joinDate: { type: String, default: Date.now() },
});

const ClubhouseMember = mongoose.model('ClubhouseMember', clubhouseMemberSchema);

function validateClubhouseMember({ body, id }) {
  const schema = {
    resident: Joi.objectId(),
    joinDate: Joi.date().optional(),
  };

  if (id && body) {
    schema.id = Joi.objectId();
    body.id = id;
  } else if (id) {
    schema = { id: Joi.objectId() };
    body = { id: id };
  }

  const clubhouseMemberSchema = Joi.object(schema);
  return clubhouseMemberSchema.validate(body);
}

module.exports = { ClubhouseMember, clubhouseMemberSchema };
