const pool = require('../config/database');

const getSeances = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, u.username AS created_by_user,
        COUNT(a.id) FILTER (WHERE a.presence='present') AS nb_presents,
        (SELECT COUNT(*) FROM crics WHERE statut NOT IN ('refusé','inapte')) AS total_crics
      FROM cric_seances s
      LEFT JOIN users u ON s.created_by = u.id
      LEFT JOIN cric_assiduites a ON a.seance_id = s.id
      GROUP BY s.id, u.username
      ORDER BY s.date_seance DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const createSeance = async (req, res) => {
  try {
    const { titre, type_seance, date_seance, heure_debut, heure_fin, lieu, description } = req.body;
    if (!titre) return res.status(400).json({ success: false, error: 'Titre obligatoire' });
    const result = await pool.query(
      `INSERT INTO cric_seances (titre, type_seance, date_seance, heure_debut, heure_fin, lieu, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [titre, type_seance||'autre', date_seance||null, heure_debut||null, heure_fin||null, lieu||null, description||null, req.user.id]
    );
    const crics = await pool.query(`SELECT id FROM crics WHERE statut NOT IN ('refusé','inapte')`);
    for (const c of crics.rows) {
      await pool.query(
        `INSERT INTO cric_assiduites (seance_id, cric_id, presence, created_by) VALUES ($1,$2,'absent',$3) ON CONFLICT DO NOTHING`,
        [result.rows[0].id, c.id, req.user.id]
      );
    }
    res.status(201).json({ success: true, data: result.rows[0], message: 'Séance créée' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const deleteSeance = async (req, res) => {
  try {
    await pool.query('DELETE FROM cric_seances WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Séance supprimée' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const getPointage = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.id, c.nom, c.prenom, c.photo_url, c.statut, c.ufr, c.annee_etude,
        COALESCE(a.presence, 'absent') AS presence, a.motif, a.id AS assiduite_id
      FROM crics c
      LEFT JOIN cric_assiduites a ON a.cric_id = c.id AND a.seance_id = $1
      WHERE c.statut NOT IN ('refusé','inapte')
      ORDER BY c.nom, c.prenom
    `, [req.params.id]);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const savePointage = async (req, res) => {
  try {
    const { pointages } = req.body;
    for (const p of pointages) {
      await pool.query(
        `INSERT INTO cric_assiduites (seance_id, cric_id, presence, motif, created_by)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (seance_id, cric_id) DO UPDATE SET presence=$3, motif=$4, created_by=$5`,
        [req.params.id, p.cric_id, p.presence, p.motif||null, req.user.id]
      );
    }
    res.json({ success: true, message: 'Pointage enregistré' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const getStats = async (req, res) => {
  try {
    const [seances, taux, alertes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE date_seance = CURRENT_DATE) AS aujourd_hui FROM cric_seances`),
      pool.query(`SELECT ROUND(AVG(taux_assiduite)) AS taux_moyen FROM vue_assiduite_crics WHERE total_seances > 0`),
      pool.query(`SELECT COUNT(*) AS nb_alertes FROM vue_assiduite_crics WHERE total_seances > 0 AND taux_assiduite < 70`),
    ]);
    res.json({ success: true, data: {
      total_seances: parseInt(seances.rows[0].total),
      seances_auj:   parseInt(seances.rows[0].aujourd_hui),
      taux_moyen:    parseInt(taux.rows[0].taux_moyen)||0,
      nb_alertes:    parseInt(alertes.rows[0].nb_alertes),
    }});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const getTableau = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vue_assiduite_crics ORDER BY taux_assiduite ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

module.exports = { getSeances, createSeance, deleteSeance, getPointage, savePointage, getStats, getTableau };
