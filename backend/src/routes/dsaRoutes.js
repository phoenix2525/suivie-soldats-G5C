const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');
const { getDashboardSante, ajouterVaccin, supprimerVaccin, getVaccinsSoldat, getEquipeMedicale } = require('../controllers/dsaController');

router.use(protect);
router.get('/dashboard',           getDashboardSante);
router.post('/vaccins',            ajouterVaccin);
router.delete('/vaccins/:id',      supprimerVaccin);
router.get('/vaccins/soldat/:id',  getVaccinsSoldat);
router.get('/equipe',             getEquipeMedicale);

module.exports = router;
