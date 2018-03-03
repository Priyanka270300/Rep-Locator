require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const SearchRouter = require('./routes/Search');
const ImportRouter = require('./routes/Import');

let app = express();
let server = http.Server(app);

app.use(cors());

app.use('/api/search', SearchRouter);
app.use('/api/import', ImportRouter);

server.listen(process.env.LOCATOR_API_PORT, function() {
  console.log('Listening on port %s', process.env.LOCATOR_API_PORT);
});
