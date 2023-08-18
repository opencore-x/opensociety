const mongoose = require('mongoose');
const checkForEnvironmentVariable = require('./checkEnv');

export default function dbConnect() {
  checkForEnvironmentVariable('MONGO_CONNECTION_STRING');
  mongoose
    .connect(
      `mongodb+srv://${config.get('MONGO_USERNAME')}:${config.get(
        'MONGO_PASSWORD'
      )}@vidly.zivn542.mongodb.net/vidly`
    )
    .then(() => console.log('connected to mongodb'))
    .catch((err) => console.log(err));

  mongoose.connect(process.env.MONGO_CONNECTION_STRING);
  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
  mongoose.conntection.on('error', (error) => console.log('Error', error));
}
