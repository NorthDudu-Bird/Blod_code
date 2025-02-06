const pool = require('./config/db.js');

async function testConnection() {
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('Database connection successful:', rows);
  } catch (err) {
    console.error('Database connection failed:', err);
  } finally {
    pool.end();
  }
}

testConnection();