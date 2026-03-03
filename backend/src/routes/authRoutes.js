// Routes pour l'authentification
const express = require('express');
const router = express.Router();
const { login, getMe, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Route publique (pas besoin de token)
router.post('/login', login);

// Routes protégées (nécessitent un token)
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.put('/change-password', protect, changePassword);

module.exports = router;
