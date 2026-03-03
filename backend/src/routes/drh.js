const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { protect } = require('../middleware/auth');
const { authorizeSection } = require('../middleware/authorizeSection');

// Historique grades d'un soldat
router.get('/grades/:soldatId', protect, async (req, res) => {
  try {
    const result = await query(
      `SELECT hg.*, s.nom, s.prenom, s.grade as grade_actuel
       FROM historique_grades hg
       JOIN soldiers s ON s.id = hg.soldier_id
       WHERE hg.soldier_id = $1
       ORDER BY hg.date_promotion DESC`,
      [req.params.soldatId]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Enregistrer une promotion
router.post('/promotion', protect, authorizeSection("drh"), async (req, res) => {
  try {
    const { soldier_id, nouveau_grade, date_promotion, motif, autorise_par } = req.body;
    
    // Récupérer grade actuel
    const soldat = await query('SELECT grade FROM soldiers WHERE id = $1', [soldier_id]);
    if (!soldat.rows.length) return res.status(404).json({ success: false, message: 'Soldat introuvable' });
    
    const ancien_grade = soldat.rows[0].grade;
    
    // Insérer historique
    await query(
      `INSERT INTO historique_grades (soldier_id, ancien_grade, nouveau_grade, date_promotion, motif, autorise_par)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [soldier_id, ancien_grade, nouveau_grade, date_promotion || new Date(), motif, autorise_par]
    );
    
    // Mettre à jour grade actuel
    await query('UPDATE soldiers SET grade = $1 WHERE id = $2', [nouveau_grade, soldier_id]);
    
    res.json({ success: true, message: 'Promotion enregistrée !' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Distinctions d'un soldat
router.get('/distinctions/:soldatId', protect, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM distinctions WHERE soldier_id = $1 ORDER BY date_distinction DESC',
      [req.params.soldatId]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Ajouter une distinction
router.post('/distinctions', protect, authorizeSection("drh"), async (req, res) => {
  try {
    const { soldier_id, type, libelle, date_attribution, motif } = req.body;
    const result = await query(
      `INSERT INTO distinctions (soldier_id, type_distinction, intitule, date_distinction, motif)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [soldier_id, type, libelle, date_attribution || new Date(), motif]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Supprimer une distinction
router.delete('/distinctions/:id', protect, authorizeSection("drh"), async (req, res) => {
  try {
    await query('DELETE FROM distinctions WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Supprimé' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Stats globales DRH pour dashboard
router.get('/stats', protect, async (req, res) => {
  try {
    const [promos, distinctions, parGrade] = await Promise.all([
      query(`SELECT COUNT(*) as total, DATE_TRUNC('month', date_promotion) as mois
             FROM historique_grades
             WHERE date_promotion >= NOW() - INTERVAL '12 months'
             GROUP BY mois ORDER BY mois`),
      query(`SELECT type_distinction as type, COUNT(*) as total FROM distinctions GROUP BY type_distinction`),
      query(`SELECT grade, COUNT(*) as total FROM soldiers WHERE statut='actif' GROUP BY grade ORDER BY total DESC`),
    ]);
    res.json({
      success: true,
      data: {
        promotions_mensuelles: promos.rows,
        distinctions_par_type: distinctions.rows,
        soldats_par_grade: parGrade.rows,
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Promotions récentes (toutes)
router.get('/grades/recent', protect, async (req, res) => {
  try {
    const result = await query(
      `SELECT hg.*, s.nom, s.prenom, s.grade as grade_actuel
       FROM historique_grades hg
       JOIN soldiers s ON s.id = hg.soldier_id
       ORDER BY hg.date_promotion DESC LIMIT 20`,
    );
    res.json({ success: true, data: result.rows });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
