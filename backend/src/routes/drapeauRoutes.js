const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');
const ctrl    = require('../controllers/drapeauController');

const p = protect, a = authorize('admin','instructeur');

router.get   ('/stats',                      p, a, ctrl.getStats);
router.get   ('/parametres',                 p, a, ctrl.getParametres);
router.put   ('/parametres',                 p, a, ctrl.updateParametres);
router.get   ('/ceremonies',                 p, a, ctrl.getCeremonies);
router.post  ('/ceremonies',                 p, a, ctrl.createCeremonie);
router.post  ('/ceremonies/generer',         p, a, ctrl.genererSemaine);
router.patch ('/ceremonies/:id/confirmer',   p, a, ctrl.confirmerCeremonie);
router.patch ('/ceremonies/:id/terminer',    p, a, ctrl.terminerCeremonie);
router.patch ('/ceremonies/:id/annuler',     p, a, ctrl.annulerCeremonie);
router.get   ('/ceremonies/:id/pointage',    p, a, ctrl.getPointage);
router.post  ('/ceremonies/:id/pointage',    p, a, ctrl.savePointage);
router.get   ('/membres',                    p, a, ctrl.getMembres);
router.post  ('/membres',                    p, a, ctrl.addMembre);
router.delete('/membres/:soldier_id',        p, a, ctrl.removeMembre);

module.exports = router;
