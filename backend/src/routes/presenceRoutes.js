const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  enregistrerPresences,
  getPresencesActivite,
  getPresencesSoldat,
  getSoldatsSansPresence,
  getStatsPresences
} = require('../controllers/presenceController');

// Toutes les routes nécessitent d'être connecté
router.use(protect);

// Enregistrer les présences d'une activité (officier, instructeur, admin)
router.post('/', authorize('admin', 'officier', 'instructeur'), enregistrerPresences);

// Voir les présences d'une activité (date + type)
router.get('/activite', getPresencesActivite);

// Voir les soldats sans présence enregistrée
router.get('/manquants', getSoldatsSansPresence);

// Statistiques globales
router.get('/stats', getStatsPresences);

// Voir les présences d'un soldat spécifique
router.get('/soldat/:id', getPresencesSoldat);

module.exports = router;
