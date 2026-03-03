// Middleware d'authentification JWT
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware pour vérifier le token JWT
const protect = async (req, res, next) => {
  let token;

  // Vérifier si le header Authorization existe et commence par "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extraire le token du header "Bearer TOKEN_ICI"
      token = req.headers.authorization.split(' ')[1];

      // Décoder et vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Ajouter les infos de l'utilisateur à la requête
      // Maintenant dans tous les controllers, on peut accéder à req.user
      req.user = {
        id:          decoded.id,
        username:    decoded.username,
        role:        decoded.role,
        section_slug:decoded.section_slug || null,
        soldier_id:  decoded.soldier_id   || null,
      };

      // Continuer vers le controller
      next();
    } catch (error) {
      console.error('❌ Token invalide:', error.message);
      return res.status(401).json({
        success: false,
        error: 'Non autorisé, token invalide'
      });
    }
  }

  // Si pas de token
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Non autorisé, pas de token'
    });
  }
};

// Middleware pour vérifier les rôles
// Usage: authorize('admin', 'officier')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Rôle ${req.user.role} non autorisé pour cette action`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
