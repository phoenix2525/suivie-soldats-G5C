const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');
const {
  getDashboard,
  creerCompetition, modifierCompetition, supprimerCompetition, getCompetition,
  ajouterParticipation, supprimerParticipation,
  creerEvenement, modifierEvenement, supprimerEvenement, ajouterParticipationCulturelle,
} = require('../controllers/dascController');

router.use(protect);

// Dashboard
router.get('/dashboard', getDashboard);

// Compétitions
router.post('/competitions',           creerCompetition);
router.put('/competitions/:id',        modifierCompetition);
router.delete('/competitions/:id',     supprimerCompetition);
router.get('/competitions/:id',        getCompetition);

// Participations sportives
router.post('/participations',         ajouterParticipation);
router.delete('/participations/:id',   supprimerParticipation);

// Événements culturels
router.post('/evenements',             creerEvenement);
router.put('/evenements/:id',          modifierEvenement);
router.delete('/evenements/:id',       supprimerEvenement);
router.post('/evenements/participer',  ajouterParticipationCulturelle);

module.exports = router;
