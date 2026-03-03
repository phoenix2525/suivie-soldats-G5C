// Routes pour la gestion des soldats
const express = require('express');
const router = express.Router();
const {
  getSoldiers,
  getSoldier,
  createSoldier,
  updateSoldier,
  deleteSoldier,
  getSoldiersStats
} = require('../controllers/soldierController');
const { protect, authorize } = require('../middleware/auth');

// Toutes les routes nécessitent une authentification
router.use(protect);

// Routes statistiques (doit être avant /:id pour éviter confusion)
router.get('/stats/overview', getSoldiersStats);

// Routes CRUD
router.route('/')
  .get(getSoldiers)  // GET /api/soldiers - Tous peuvent voir
  .post(authorize('admin', 'officier'), createSoldier);  // POST /api/soldiers - Admin et officiers uniquement

router.route('/:id')
  .get(getSoldier)  // GET /api/soldiers/:id - Tous peuvent voir
  .put(authorize('admin', 'officier'), updateSoldier)  // PUT /api/soldiers/:id - Admin et officiers
  .delete(authorize('admin'), deleteSoldier);  // DELETE /api/soldiers/:id - Admin uniquement

module.exports = router;
