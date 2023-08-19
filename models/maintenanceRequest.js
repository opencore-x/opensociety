const mongoose = require('mongoose');
const Joi = require('joi');
Joi.objectid = require('joi-objectid')(Joi);

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

const joiSchema = {
  apartment: Joi.string(),
  work: Joi.string().valid('electrician', 'plumber', 'other'),
  detail: Joi.string().min(6).max(255).lowercase().required(),
  status: Joi.object({
    resolved: Joi.boolean().default(false),
    timeAdded: Joi.date(),
    timeResolved: Joi.date(),
  }),
};

const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);

module.exports = { MaintenanceRequest, joiSchema };
