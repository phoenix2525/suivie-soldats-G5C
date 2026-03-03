const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'suivi_g5c',
        user: process.env.DB_USER || 'admin_g5c',
        password: process.env.DB_PASSWORD || 'G5C_Admin_2024!',
      }
);

const query = (text, params) => pool.query(text, params);

const testConnection = async () => {
  const client = await pool.connect();
  const res = await client.query('SELECT NOW()');
  console.log('DB connectee:', res.rows[0].now);
  client.release();
  return true;
};

module.exports = { pool, query, testConnection };
