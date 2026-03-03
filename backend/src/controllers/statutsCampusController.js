const { pool } = require('../config/database');

const STATUTS = {
  actif:             { label:'Actif',             color:'#34d399' },
  absent_temporaire: { label:'Absent temporaire', color:'#f59e0b' },
  inactif:           { label:'Inactif',           color:'#ef4444' },
};

// Stats globales
const getStats = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE statut_campus='actif')             AS actifs,
        COUNT(*) FILTER (WHERE statut_campus='absent_temporaire') AS absents,
        COUNT(*) FILTER (WHERE statut_campus='inactif')           AS inactifs,
        COUNT(*)                                                  AS total
      FROM soldiers WHERE statut='actif'
    `);
    // Alertes : absents depuis plus de 7 jours sans date de retour
    const alertes = await pool.query(`
      SELECT s.id, s.nom, s.prenom, s.grade, s.photo_url,
        s.motif_absence_campus, s.date_retour_prevue,
        h.created_at AS depuis
      FROM soldiers s
      LEFT JOIN historique_statuts_campus h ON h.id = (
        SELECT id FROM historique_statuts_campus
        WHERE soldier_id = s.id ORDER BY created_at DESC LIMIT 1
      )
      WHERE s.statut_campus = 'absent_temporaire'
        AND (s.date_retour_prevue IS NULL OR s.date_retour_prevue < CURRENT_DATE)
      ORDER BY h.created_at ASC
    `);
    res.json({ success:true, data:{ ...r.rows[0], alertes:alertes.rows } });
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

// Liste soldats avec statut campus
const getListe = async (req, res) => {
  try {
    const { statut_campus } = req.query;
    let where = "WHERE s.statut = 'actif'";
    const params = [];
    if (statut_campus) {
      params.push(statut_campus);
      where += ` AND s.statut_campus = $${params.length}`;
    }
    const r = await pool.query(`
      SELECT s.id, s.nom, s.prenom, s.grade, s.matricule, s.photo_url,
        s.unite, s.promotion, s.statut_campus,
        s.date_retour_prevue, s.motif_absence_campus,
        h.created_at AS depuis,
        u.username AS modifie_par
      FROM soldiers s
      LEFT JOIN historique_statuts_campus h ON h.id = (
        SELECT id FROM historique_statuts_campus
        WHERE soldier_id = s.id ORDER BY created_at DESC LIMIT 1
      )
      LEFT JOIN users u ON u.id = h.changed_by
      ${where}
      ORDER BY
        CASE s.statut_campus
          WHEN 'absent_temporaire' THEN 1
          WHEN 'inactif' THEN 2
          ELSE 3
        END, s.nom, s.prenom
    `, params);
    res.json({ success:true, data:r.rows });
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

// Changer statut d'un soldat
const changerStatut = async (req, res) => {
  try {
    const { statut_campus, motif, date_retour_prevue } = req.body;
    const { id } = req.params;

    if (!STATUTS[statut_campus])
      return res.status(400).json({ success:false, error:'Statut invalide' });

    const current = await pool.query(
      'SELECT statut_campus FROM soldiers WHERE id=$1', [id]
    );
    if (!current.rows[0])
      return res.status(404).json({ success:false, error:'Soldat introuvable' });

    const ancien = current.rows[0].statut_campus;

    await pool.query(`
      UPDATE soldiers SET
        statut_campus = $1,
        motif_absence_campus = $2,
        date_retour_prevue = $3
      WHERE id = $4
    `, [statut_campus, motif||null, date_retour_prevue||null, id]);

    // Enregistrer dans l'historique
    await pool.query(`
      INSERT INTO historique_statuts_campus
        (soldier_id, ancien_statut, nouveau_statut, motif, date_retour_prevue, changed_by)
      VALUES ($1,$2,$3,$4,$5,$6)
    `, [id, ancien, statut_campus, motif||null, date_retour_prevue||null, req.user.id]);

    res.json({ success:true, message:`Statut mis à jour → ${STATUTS[statut_campus].label}` });
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

// Historique d'un soldat
const getHistorique = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT h.*, u.username AS modifie_par
      FROM historique_statuts_campus h
      LEFT JOIN users u ON u.id = h.changed_by
      WHERE h.soldier_id = $1
      ORDER BY h.created_at DESC
    `, [req.params.id]);
    res.json({ success:true, data:r.rows });
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

// Historique global
const getHistoriqueGlobal = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT h.*, s.nom, s.prenom, s.grade, s.photo_url, u.username AS modifie_par
      FROM historique_statuts_campus h
      JOIN soldiers s ON s.id = h.soldier_id
      LEFT JOIN users u ON u.id = h.changed_by
      ORDER BY h.created_at DESC
      LIMIT 50
    `);
    res.json({ success:true, data:r.rows });
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

module.exports = { getStats, getListe, changerStatut, getHistorique, getHistoriqueGlobal };
