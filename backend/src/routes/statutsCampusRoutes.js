const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const c = require('../controllers/statutsCampusController');
const p = protect, a = authorize('admin','instructeur');

router.get ('/stats',             p,a, c.getStats);
router.get ('/',                  p,a, c.getListe);
router.put ('/:id',               p,a, c.changerStatut);
router.get ('/:id/historique',    p,a, c.getHistorique);
router.get ('/historique/global', p,a, c.getHistoriqueGlobal);

module.exports = router;
