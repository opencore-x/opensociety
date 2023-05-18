const express = require('express');
const users = require('./routes/users');
const visitors = require('./routes/visitors');

const app = express();
app.use(express.json());

app.use('/api/users', users);
app.use('/api/visitors', visitors);

app.get('/', (req, res) => {
  res.status(200).send('hello world!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`listening on ${port}`));
