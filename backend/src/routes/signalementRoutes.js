const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl    = require('../controllers/signalementController');

const p = protect, a = authorize('admin','instructeur');
router.get  ('/',              p, a, ctrl.getSignalements);
router.get  ('/stats',         p, a, ctrl.getStats);
router.post ('/',              p, a, ctrl.createSignalement);
router.patch('/:id/statut',    p, a, ctrl.updateStatut);
router.post ('/:id/sanctionner', p, a, ctrl.sanctionnerDepuisSignalement);
module.exports = router;
