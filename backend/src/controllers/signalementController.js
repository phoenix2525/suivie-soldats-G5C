const pool = require('../config/database');
const { notifySignalement } = require('../services/notificationService');

const getSignalements = async (req, res) => {
  try {
    const { statut, section, type } = req.query;
    let q = `
      SELECT sg.*,
        s.nom  AS soldier_nom,  s.prenom  AS soldier_prenom,  s.grade,      s.photo_url AS soldier_photo,
        c.nom  AS cric_nom,     c.prenom  AS cric_prenom,                   c.photo_url AS cric_photo,
        cer.titre AS ceremonie_titre, cer.date_ceremonie,
        u.username AS created_by_user
      FROM signalements sg
      LEFT JOIN soldiers  s   ON s.id   = sg.soldier_id
      LEFT JOIN crics     c   ON c.id   = sg.cric_id
      LEFT JOIN ceremonies cer ON cer.id = sg.ceremonie_id
      LEFT JOIN users     u   ON u.id   = sg.created_by
      WHERE 1=1`;
    const params = [];
    if (statut)  { params.push(statut);  q += ` AND sg.statut=$${params.length}`; }
    if (section) { params.push(section); q += ` AND sg.section_slug=$${params.length}`; }
    if (type)    { params.push(type);    q += ` AND sg.type=$${params.length}`; }
    q += ' ORDER BY sg.created_at DESC';
    const r = await pool.query(q, params);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const createSignalement = async (req, res) => {
  try {
    const { section_slug, soldier_id, cric_id, type, description, ceremonie_id } = req.body;
    if (!section_slug) return res.status(400).json({ success: false, error: 'Section obligatoire' });
    const r = await pool.query(
      `INSERT INTO signalements (section_slug, soldier_id, cric_id, type, description, ceremonie_id, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [section_slug, soldier_id||null, cric_id||null, type||'autre', description||null, ceremonie_id||null, req.user.id]
    );
    const sg = r.rows[0]; notifySignalement({...sg, ...req.body}).catch(()=>{}); res.status(201).json({ success: true, data: sg });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const updateStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    const r = await pool.query(
      `UPDATE signalements SET statut=$1 WHERE id=$2 RETURNING *`,
      [statut, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// Sanctionner depuis un signalement (soldats uniquement)
const sanctionnerDepuisSignalement = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { soldier_id, date_sanction, type_sanction, categorie, motif, faits, severite, duree_jours } = req.body;

    // Créer la sanction
    const sanction = await client.query(
      `INSERT INTO sanctions (soldier_id, date_sanction, type_sanction, categorie, motif, faits, severite, duree_jours, prononce_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [soldier_id, date_sanction||new Date().toISOString().slice(0,10),
       type_sanction, categorie||'autre', motif, faits||motif,
       severite||'mineure', duree_jours||null, req.user.id]
    );

    // Clôturer le signalement
    await client.query(
      `UPDATE signalements SET statut='cloture' WHERE id=$1`, [req.params.id]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: sanction.rows[0], message: 'Sanction prononcée et signalement clôturé' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally { client.release(); }
};

const getStats = async (req, res) => {
  try {
    const [global, parSection, topSignales] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                          AS total,
          COUNT(*) FILTER (WHERE statut='ouvert')          AS ouverts,
          COUNT(*) FILTER (WHERE statut='pris_en_charge')  AS en_cours,
          COUNT(*) FILTER (WHERE statut='cloture')         AS clotures,
          COUNT(*) FILTER (WHERE type='absence')           AS absences,
          COUNT(*) FILTER (WHERE type='retard')            AS retards,
          COUNT(*) FILTER (WHERE type='comportement')      AS comportements,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS cette_semaine
        FROM signalements
      `),
      pool.query(`
        SELECT section_slug, COUNT(*) AS total,
          COUNT(*) FILTER (WHERE statut='ouvert') AS ouverts
        FROM signalements
        GROUP BY section_slug ORDER BY total DESC
      `),
      pool.query(`
        SELECT s.id, s.nom, s.prenom, s.grade, s.photo_url, COUNT(sg.id) AS nb_signalements
        FROM signalements sg
        JOIN soldiers s ON s.id = sg.soldier_id
        GROUP BY s.id, s.nom, s.prenom, s.grade, s.photo_url
        ORDER BY nb_signalements DESC LIMIT 5
      `),
    ]);
    res.json({ success: true, data: {
      global:      global.rows[0],
      par_section: parSection.rows,
      top_signales: topSignales.rows,
    }});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

module.exports = { getSignalements, createSignalement, updateStatut, sanctionnerDepuisSignalement, getStats };
