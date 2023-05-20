const mongoose = require('mongoose');
const config = require('config');

mongoose
  .connect(
    `mongodb+srv://${config.get('MONGO_USERNAME')}:${config.get(
      'MONGO_PASSWORD'
    )}@vidly.zivn542.mongodb.net/vidly`
  )
  .then(() => console.log('connected to mongodb'))
  .catch((err) => console.log(err));

const maintenanceRequestSchema = new mongoose.Schema({
  apartment: String,
  lodged: {
    type: Date,
    default: Date.now(),
  },
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
    detail: {
      type: String,
      required: true,
      min: 6,
      max: 255,
      lowercase: true,
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
});

const MaintenanceRequest = mongoose.model(
  'MaintenanceRequest',
  maintenanceRequestSchema
);

module.exports = { MaintenanceRequest };
