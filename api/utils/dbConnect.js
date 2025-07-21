const mongoose = require('mongoose');

function dbConnect() {
  mongoose.connect(process.env.MONGO_CONNECTION_STRING);
  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
  mongoose.connection.on('error', (error) => console.log('Error', error));
}

module.exports = dbConnect;
