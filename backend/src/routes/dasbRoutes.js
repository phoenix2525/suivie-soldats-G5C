const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');
const {
  getDashboard,
  creerBudget, modifierBudget, supprimerBudget,
  creerDemande, traiterDemande, supprimerDemande,
  getDepenses,
} = require('../controllers/dasbController');

router.use(protect);

router.get('/dashboard',         getDashboard);
router.post('/budgets',          creerBudget);
router.put('/budgets/:id',       modifierBudget);
router.delete('/budgets/:id',    supprimerBudget);
router.post('/demandes',         creerDemande);
router.put('/demandes/:id',      traiterDemande);
router.delete('/demandes/:id',   supprimerDemande);
router.get('/depenses',          getDepenses);

module.exports = router;
