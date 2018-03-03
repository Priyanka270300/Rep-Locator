require('dotenv').config();

const mysql = require('mysql2/promise');

let mysqlDB = mysql.createPool({
  connectionLimit: 10,
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  dateStrings: true,
});

module.exports = mysqlDB;
