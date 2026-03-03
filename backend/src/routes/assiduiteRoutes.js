const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');
const {
  getSeances, createSeance, deleteSeance,
  getPointage, savePointage, getStats, getTableau
} = require('../controllers/assiduiteController');

const perm = protect, auth = authorize('admin','instructeur');

router.get('/stats',                  perm, auth, getStats);
router.get('/tableau',                perm, auth, getTableau);
router.get('/seances',                perm, auth, getSeances);
router.post('/seances',               perm, auth, createSeance);
router.delete('/seances/:id',         perm, auth, deleteSeance);
router.get('/seances/:id/pointage',   perm, auth, getPointage);
router.post('/seances/:id/pointage',  perm, auth, savePointage);

module.exports = router;
