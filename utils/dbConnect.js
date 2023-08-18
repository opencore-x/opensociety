const mongoose = require('mongoose');

export default function dbConnect() {
  mongoose.connect(process.env.MONGO_CONNECTION_STRING);
  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('disconnected', () => console.log('MongoDB disconnected'));
  mongoose.conntection.on('error', (error) => console.log('Error', error));
}
