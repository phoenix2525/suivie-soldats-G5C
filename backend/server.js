// Serveur principal de l'application
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./src/config/database');

// Import des routes
const authRoutes = require('./src/routes/authRoutes');
const soldierRoutes = require('./src/routes/soldierRoutes');

// Créer l'application Express
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true } });
const { setIO } = require('./src/services/notificationService');
setIO(io);

// Socket.io — rooms par user
io.on('connection', (socket) => {
  socket.on('join', (userId) => { if (userId) socket.join(`user_${userId}`); });
  socket.on('disconnect', () => {});
});

// =====================================================
// MIDDLEWARE
// =====================================================

// CORS - Permet au frontend de communiquer avec le backend
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://votre-domaine.com'  // En production
    : 'http://localhost:5173',     // En développement (Vite par défaut)
  credentials: true
}));

// Parser JSON - Permet de lire req.body
app.use(express.json({ limit: '10mb' }));

// Parser URL-encoded - Pour les formulaires
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger personnalisé (en développement)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
  });
}

// =====================================================
// ROUTES
// =====================================================

// Route de test
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎖️ API Armée du G5C - Version 1.0',
    endpoints: {
      auth: '/api/auth',
      soldiers: '/api/soldiers'
    }
  });
});

// Routes API
app.use('/api/auth', authRoutes);
app.use('/api/soldiers', soldierRoutes);
app.use('/api/presences', require('./src/routes/presenceRoutes')); // ← ICI
app.use('/api/sanctions', require('./src/routes/sanctionRoutes')); // ← AJOUTEZ
app.use('/api/distinctions', require('./src/routes/distinctionRoutes')); // ← AJOUTEZ
app.use('/api/aptitudes', require('./src/routes/aptitudeRoutes')); // ← AJOUTEZ
app.use('/api/mensurations', require('./src/routes/mensurationRoutes')); // ← AJOUTEZ
app.use('/api/crics', require('./src/routes/cricRoutes'));
app.use('/api/statuts-campus', require('./src/routes/statutsCampusRoutes'));
app.use('/api/caporaux', require('./src/routes/caporauxRoutes'));
app.use('/api/users', require('./src/routes/usersRoutes'));
app.use('/api/pdf', require('./src/routes/pdfRoutes'));
app.use('/api/notifications', require('./src/routes/notificationRoutes'));
app.use('/api/bat-music', require('./src/routes/batMusicRoutes'));
app.use('/api/drapeau', require('./src/routes/drapeauRoutes'));
app.use('/api/assiduites', require('./src/routes/assiduiteRoutes'));
app.use('/api/signalements', require('./src/routes/signalementRoutes'));
app.use('/api/drh', require('./src/routes/drh'));
app.use('/api/dsa', require('./src/routes/dsaRoutes'));
app.use('/api/dasc', require('./src/routes/dascRoutes'));
app.use('/api/dcsp', require('./src/routes/dcspRoutes'));
app.use('/api/dasb', require('./src/routes/dasbRoutes'));
// Route 404 - Non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// =====================================================
// GESTION DES ERREURS GLOBALES
// =====================================================

app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Erreur serveur interne'
  });
});

// =====================================================
// DÉMARRAGE DU SERVEUR
// =====================================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    console.log('🔌 Test de connexion à PostgreSQL...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('❌ Impossible de démarrer le serveur sans connexion BD');
      process.exit(1);
    }
    
    // Démarrer le serveur
    server.listen(PORT, () => {
      console.log('\n🚀 ========================================');
      console.log(`🎖️  Serveur G5C démarré avec succès !`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 URL: http://localhost:${PORT}`);
      console.log(`🔧 Environnement: ${process.env.NODE_ENV}`);
      console.log('========================================\n');
    });
    
  } catch (error) {
    console.error('❌ Erreur au démarrage:', error);
    process.exit(1);
  }
};

// Démarrer le serveur
startServer();

// Gestion des erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('❌ Erreur non gérée:', err);
  process.exit(1);
});
// Routes notifications (ajout manuel)
