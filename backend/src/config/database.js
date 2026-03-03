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

pool.on('connect', () => console.log('✅ Connecté à PostgreSQL'));

const testConnection = async () => {
  const client = await pool.connect();
  const res = await client.query('SELECT NOW() as current_time');
  console.log('📊 Requête exécutée: { text: 'SELECT NOW() as current_time', duration: '0ms', rows: 1 }');
  console.log('🕐 Heure serveur BD:', res.rows[0].current_time);
  client.release();
};

module.exports = pool;
module.exports.testConnection = testConnection;
