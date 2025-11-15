require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

const SearchRouter = require('./routes/Search');
const ImportRouter = require('./routes/Import');

const app = express();
const server = http.Server(app);

app.use(cors({
  origin: '*',   
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.use('/api/search', SearchRouter);
app.use('/api/import', ImportRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.LOCATOR_API_PORT;
server.listen(PORT, () => {
  console.log(`Locator API listening on port ${PORT}`);
});