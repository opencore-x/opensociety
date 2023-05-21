const express = require('express');
const users = require('./routes/users');
const visitors = require('./routes/visitors');
const houseHelp = require('./routes/houseHelps');
const securityGuard = require('./routes/securityGuards');
const maintenanceRequest = require('./routes/maintenanceRequest');
const apartments = require('./routes/apartments');

const app = express();
app.use(express.json());

app.use('/api/users', users);
app.use('/api/visitors', visitors);
app.use('/api/househelp', houseHelp);
app.use('/api/securityguards', securityGuard);
app.use('/api/maintenancerequest', maintenanceRequest);
app.use('/api/apartments', apartments);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on ${port}`));
