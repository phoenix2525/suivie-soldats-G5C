const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  ajouterDistinction,
  getDistinctionsSoldat,
  getAllDistinctions,
  supprimerDistinction,
  getClassementDistinctions
} = require('../controllers/distinctionController');

// Toutes les routes nécessitent d'être connecté
router.use(protect);

// Toutes les distinctions
router.get('/', getAllDistinctions);

// Classement des soldats les plus décorés
router.get('/classement', getClassementDistinctions);

// Ajouter une distinction (officier et admin uniquement)
router.post('/', authorize('admin', 'officier'), ajouterDistinction);

// Distinctions d'un soldat spécifique
router.get('/soldat/:id', getDistinctionsSoldat);

// Supprimer une distinction (admin uniquement)
router.delete('/:id', authorize('admin'), supprimerDistinction);

module.exports = router;
