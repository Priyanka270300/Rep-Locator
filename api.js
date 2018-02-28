const config = require('./config/config');
const express = require('express');
const cors = require('cors');
const http = require('http');
const SearchRouter = require('./routes/Search');
const ImportRouter = require('./routes/Import');

let app = express();
let server = http.Server(app);

app.use(cors());

app.use('/search', SearchRouter);
app.use('/import', ImportRouter);

server.listen(config.api_port, function() {
  console.log('Listening on port %s', config.api_port);
});
