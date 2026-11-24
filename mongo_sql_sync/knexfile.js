require('dotenv').config();

module.exports = {
  development: {
    client: 'mssql',
    connection: {
      server: process.env.MSSQL_SERVER,
      user: process.env.MSSQL_USER,
      password: process.env.MSSQL_PASSWORD,
      database: process.env.MSSQL_DATABASE,
      options: {
        encrypt: true,
        trustServerCertificate: true
      }
    }
  }
};
