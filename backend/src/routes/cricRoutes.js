const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');
const {
  getAllCrics, getCricById, createCric, updateCric,
  updateStatut, convertToSoldier, getStats, deleteCric
} = require('../controllers/cricController');

router.get('/stats',          protect, authorize('admin', 'instructeur'), getStats);
router.get('/',               protect, authorize('admin', 'instructeur'), getAllCrics);
router.get('/:id',            protect, authorize('admin', 'instructeur'), getCricById);
router.post('/',              protect, authorizeSection("recrutement"), authorize('admin', 'instructeur'), createCric);
router.put('/:id',            protect, authorizeSection("recrutement"), authorize('admin', 'instructeur'), updateCric);
router.patch('/:id/statut',   protect, authorize('admin', 'instructeur'), updateStatut);
router.post('/:id/convertir', protect, authorizeSection("recrutement"), authorize('admin', 'instructeur'), convertToSoldier);
router.delete('/:id',         protect, authorizeSection("recrutement"), authorize('admin', 'instructeur'), deleteCric);

module.exports = router;
