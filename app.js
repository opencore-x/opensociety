const express = require('express');
const mongoose = require('mongoose');
const config = require('config');
const error = require('./middleware/error');
const users = require('./routes/users');
const visitors = require('./routes/visitors');
const houseHelp = require('./routes/houseHelps');
const securityGuard = require('./routes/securityGuards');
const maintenanceRequest = require('./routes/maintenanceRequest');
const apartments = require('./routes/apartments');
const residents = require('./routes/residents');

const app = express();

mongoose
  .connect(
    `mongodb+srv://${config.get('MONGO_USERNAME')}:${config.get(
      'MONGO_PASSWORD'
    )}@vidly.zivn542.mongodb.net/vidly`
  )
  .then(() => console.log('connected to mongodb'))
  .catch((err) => console.log(err));

app.use(express.json());
app.use('/api/users', users);
app.use('/api/visitors', visitors);
app.use('/api/househelp', houseHelp);
app.use('/api/securityguards', securityGuard);
app.use('/api/maintenancerequest', maintenanceRequest);
app.use('/api/apartments', apartments);
app.use('/api/residents', residents);
app.use(error);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on ${port}`));
