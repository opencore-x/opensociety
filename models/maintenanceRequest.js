const mongoose = require('mongoose');
const Joi = require('joi');

const maintenanceRequestSchema = new mongoose.Schema({
  apartment: String,
  work: {
    type: String,
    required: true,
    enum: ['electrician', 'plumber', 'other'],
  },
  other: {
    type: String,
    required: function () {
      return this.work === 'other' ? true : false;
    },
  },
  detail: {
    type: String,
    required: true,
    min: 6,
    max: 255,
    lowercase: true,
  },
  status: {
    resolved: { type: Boolean, default: false },
    timeAdded: { type: Date, default: Date.now() },
    timeResolved: { type: Date },
  },
});

const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);

function validateMaintenanceRequest(maintenanceRequest) {
  const schema = Joi.object({
    apartment: Joi.string(),
    work: Joi.string().valid('electrician', 'plumber', 'other'),
    detail: Joi.string().min(6).max(255).lowercase().required(),
    status: Joi.object({
      resolved: Joi.boolean().default(false),
      timeAdded: Joi.date(),
      timeResolved: Joi.date(),
    }),
  });

  return schema.validate(maintenanceRequest);
}

module.exports = { MaintenanceRequest, validateMaintenanceRequest };
