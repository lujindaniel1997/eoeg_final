// db.js
const sql = require('mssql');
require('dotenv').config();
 
// Config from your .env file
const dbConfig = {
  user: process.env.SQL_UID,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DBNAME,
  port: parseInt(process.env.SQL_PORT, 10),
  options: {
    encrypt: true, // Use true for Azure, false for on-prem if no SSL
    trustServerCertificate: true, // Change as needed
  },
};
 
// Create a connection pool
const poolPromise = new sql.ConnectionPool(dbConfig)
  .connect()
  .then(pool => {
    console.log('Connected to MSSQL');
    return pool;
  })
  .catch(err => console.error('Database Connection Failed!', err));
 
module.exports = {
  sql,
  poolPromise,
};