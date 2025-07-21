const express = require('express');
require('express-async-errors');
const checkEnvVariables = require('./utils/checkEnvVariables');
const dbConnect = require('./utils/dbConnect');
const error = require('./middleware/error');
const visitors = require('./routes/visitors');
const houseHelps = require('./routes/houseHelps');
const securityGuards = require('./routes/securityGuards');
const maintenanceRequests = require('./routes/maintenanceRequests');
const clubhouseMembers = require('./routes/clubhouseMembers');
const apartments = require('./routes/apartments');
const residents = require('./routes/residents');
const vehicles = require('./routes/vehicles');
const staffs = require('./routes/staffs');
const auth = require('./routes/auth');

checkEnvVariables();
dbConnect();
const app = express();

app.use(express.json());
app.use('/api/staffs', staffs);
app.use('/api/visitors', visitors);
app.use('/api/househelps', houseHelps);
app.use('/api/securityguards', securityGuards);
app.use('/api/maintenancerequests', maintenanceRequests);
app.use('/api/clubhousemembers', clubhouseMembers);
app.use('/api/apartments', apartments);
app.use('/api/residents', residents);
app.use('/api/vehicles', vehicles);
app.use('/api/auth', auth);
app.use(error);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`listening on ${port}`));
