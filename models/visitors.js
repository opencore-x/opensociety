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

const visitorSchema = new mongoose.Schema({
  name: { type: String, required: true, min: 3, max: 20, lowercase: true },
  phone: { type: String, required: true, min: 9, max: 10 },
  hasVehicle: { type: Boolean, default: false },
  vehicleType: {
    type: String,
    enum: ['bus', 'car', 'truck', 'bike', 'auto', 'bicycle'],
    required: function () {
      return this.hasVehicle;
    },
  },
  vehicleNumber: {
    type: String,
    required: function () {
      return this.hasVehicle;
    },
    lowercase: true,
  },
  visiting: { type: String, required: true },
});

module.exports = mongoose.model('Visitor', visitorSchema);
