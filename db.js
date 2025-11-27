// db.js
const sql = require('mssql');

const config = {
  user: 'sa',
  password: '123456a@',
  server: 'localhost',
  database: 'tuyendung',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  port: 1433
};

const pool = new sql.ConnectionPool(config)
  .connect()
  .then(p => {
    console.log('✅ Kết nối SQL Server thành công');
    return p;
  })
  .catch(err => {
    console.error('❌ Lỗi kết nối SQL:', err);
  });

module.exports = { sql, pool };
