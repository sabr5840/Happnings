
const fs = require('fs');
const mysql = require('mysql2');
require('dotenv').config(); // Loader .env-filen

// Connect to the database
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    ca: fs.readFileSync(__dirname + '/../certs/azure-ca.pem'), // Certificate path
    rejectUnauthorized: false // Temporary for self-signed certificates
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export connection for use in other files
const db = pool.promise();

module.exports = db;
