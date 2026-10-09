require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

const SearchRouter = require('./routes/Search');
const ImportRouter = require('./routes/Import');
const AdminRouter = require('./routes/Admin');

const app = express();
const server = http.Server(app);

app.use(cors({
  origin: '*',   
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/search', SearchRouter);
app.use('/api/import', ImportRouter);
app.use('/api/admin', AdminRouter);

app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.LOCATOR_API_PORT;
server.listen(PORT, () => {
  console.log(`Locator API listening on port http://localhost:${PORT}`);
});