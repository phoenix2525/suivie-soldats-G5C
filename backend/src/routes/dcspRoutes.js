const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');
const {
  getDashboard, getFormations, creerFormation, modifierFormation, supprimerFormation,
  getFiches, getFichePDF, creerFiche, supprimerFiche,
  getTournois, creerTournoi, majStatutTournoi, supprimerTournoi,
  majEquipe, ajouterMembre, retirerMembre, getMembres,
  enregistrerMatch, supprimerMatch, getProfilAcademique,
} = require('../controllers/dcspController');

router.use(protect);

router.get('/dashboard',                    getDashboard);
router.get('/formations',                   getFormations);
router.post('/formations',                  creerFormation);
router.put('/formations/:id',               modifierFormation);
router.delete('/formations/:id',            supprimerFormation);

router.get('/fiches',                       getFiches);
router.get('/fiches/:id/pdf/:type',         getFichePDF);
router.post('/fiches',                      creerFiche);
router.delete('/fiches/:id',               supprimerFiche);

router.get('/genie',                        getTournois);
router.post('/genie/tournois',              creerTournoi);
router.put('/genie/tournois/:id',           majStatutTournoi);
router.delete('/genie/tournois/:id',        supprimerTournoi);
router.put('/genie/equipes/:id',            majEquipe);
router.get('/genie/equipes/:id/membres',    getMembres);
router.post('/genie/equipes/:id/membres',   ajouterMembre);
router.delete('/genie/equipes/:id/membres/:soldier_id', retirerMembre);
router.post('/genie/matchs',               enregistrerMatch);
router.delete('/genie/matchs/:id',         supprimerMatch);

router.get('/profil/:id',                  getProfilAcademique);

module.exports = router;
