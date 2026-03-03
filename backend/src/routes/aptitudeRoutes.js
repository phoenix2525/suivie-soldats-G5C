const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  ajouterAptitude,
  getInaptes,
  getAllAptitudes,
  getRetard,
  getAptitudeActuelle,
  getHistoriqueMedical,
  getStatsMedicales,
  modifierAptitude, supprimerAptitude, getAptitudeDetail,
} = require('../controllers/aptitudeController');

router.use(protect);

router.post('/',                          ajouterAptitude);
router.get('/inaptes',                    getInaptes);
router.get('/all',                        getAllAptitudes);
router.get('/retard',                     getRetard);
router.get('/stats',                      getStatsMedicales);
router.get('/soldat/:id',                 getAptitudeActuelle);
router.get('/soldat/:id/historique',      getHistoriqueMedical);
router.get('/:id',                         getAptitudeDetail);
router.put('/:id',                         modifierAptitude);
router.delete('/:id',                      supprimerAptitude);
module.exports = router;
