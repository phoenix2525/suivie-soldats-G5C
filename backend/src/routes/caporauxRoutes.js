const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');
const c = require('../controllers/caporauxController');
const p = protect, a = authorize('admin','instructeur');

router.get   ('/stats',                        p,a, c.getStats);
router.get   ('/entrainements',                p,a, c.getEntrainements);
router.post  ('/entrainements',                p,a, c.creerEntrainement);
router.patch ('/entrainements/:id/demarrer',   p,a, c.demarrerEntrainement);
router.patch ('/entrainements/:id/terminer',   p,a, c.terminerEntrainement);
router.patch ('/entrainements/:id/annuler',    p,a, c.annulerEntrainement);
router.delete('/entrainements/:id',            p,a, c.supprimerEntrainement);
router.get   ('/entrainements/:id/pointage',   p,a, c.getPointage);
router.post  ('/entrainements/:id/pointage',   p,a, c.savePointage);
router.get   ('/entrainements/:id/perf',       p,a, c.getPerformances);
router.post  ('/entrainements/:id/perf',       p,a, c.savePerformance);
router.get   ('/membres',                      p,a, c.getMembres);
router.post  ('/membres',                      p,a, c.addMembre);
router.delete('/membres/:soldier_id',          p,a, c.removeMembre);

module.exports = router;
