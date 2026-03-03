const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  ajouterSanction,
  getSanctionsSoldat,
  getAllSanctions,
  supprimerSanction
} = require('../controllers/sanctionController');

// Toutes les routes nécessitent d'être connecté
router.use(protect);

// Toutes les sanctions (avec filtres optionnels)
router.get('/', getAllSanctions);

// Ajouter une sanction (officier et admin uniquement)
router.post('/', authorize('admin', 'officier'), ajouterSanction);

// Sanctions d'un soldat spécifique
router.get('/soldat/:id', getSanctionsSoldat);

// Supprimer une sanction (admin uniquement)
router.delete('/:id', authorize('admin'), supprimerSanction);

module.exports = router;
