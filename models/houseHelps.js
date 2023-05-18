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

module.exports = mongoose.model('HouseHelp', houseHelpSchema);
