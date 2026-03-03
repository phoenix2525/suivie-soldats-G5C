// Configuration de la connexion PostgreSQL
const { Pool } = require('pg');
require('dotenv').config();

// Pool = groupe de connexions réutilisables à la base de données
// C'est plus performant que d'ouvrir/fermer une connexion à chaque requête
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Configuration avancée
  max: 20, // Maximum 20 connexions simultanées
  idleTimeoutMillis: 30000, // Ferme les connexions inactives après 30s
  connectionTimeoutMillis: 2000, // Timeout de connexion : 2s
});

// Test de connexion au démarrage
pool.on('connect', () => {
  console.log('✅ Connecté à PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erreur PostgreSQL:', err);
  process.exit(-1);
});

// Fonction helper pour exécuter des requêtes
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log en développement
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Requête exécutée:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur requête SQL:', error);
    throw error;
  }
};

// Fonction pour tester la connexion
const testConnection = async () => {
  try {
    const result = await query('SELECT NOW() as current_time');
    console.log('🕐 Heure serveur BD:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Test de connexion échoué:', error);
    return false;
  }
};

module.exports = {
  pool,
  query,
  testConnection
};
