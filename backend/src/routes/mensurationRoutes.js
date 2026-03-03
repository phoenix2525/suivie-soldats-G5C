const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  ajouterMensuration,
  getMensurationActuelle,
  getHistoriqueMensurations,
  getAllMensurationsActuelles,
  getSoldatsSansMensurations
} = require('../controllers/mensurationController');

// Toutes les routes nécessitent d'être connecté
router.use(protect);

// Toutes les mensurations actuelles (pour confection uniformes)
router.get('/', getAllMensurationsActuelles);

// Soldats sans mensurations enregistrées
router.get('/manquants', getSoldatsSansMensurations);

// Ajouter / mettre à jour les mensurations d'un soldat
router.post('/', authorize('admin', 'officier', 'instructeur'), ajouterMensuration);

// Mensurations actuelles d'un soldat
router.get('/soldat/:id', getMensurationActuelle);

// Historique complet des mensurations d'un soldat
router.get('/soldat/:id/historique', getHistoriqueMensurations);

module.exports = router;
