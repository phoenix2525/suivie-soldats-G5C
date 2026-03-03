const pool = require('../config/database');
const { notifyCeremonieAuto } = require('../services/notificationService');

// ── Paramètres ────────────────────────────────────────────────────────────
const getParametres = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM parametres_drapeau LIMIT 1');
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const updateParametres = async (req, res) => {
  try {
    const { auto_levee_active, auto_descente_active, heure_levee, heure_descente } = req.body;
    const r = await pool.query(
      `UPDATE parametres_drapeau SET
        auto_levee_active=$1, auto_descente_active=$2,
        heure_levee=$3, heure_descente=$4,
        updated_by=$5, updated_at=NOW()
       WHERE id=1 RETURNING *`,
      [auto_levee_active, auto_descente_active, heure_levee, heure_descente, req.user.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Cérémonies ────────────────────────────────────────────────────────────
const getCeremonies = async (req, res) => {
  try {
    const { statut, type, from, to } = req.query;
    let q = `SELECT v.*, u.username AS created_by_user
             FROM vue_stats_ceremonies v
             LEFT JOIN ceremonies c ON c.id = v.id
             LEFT JOIN users u ON c.created_by = u.id
             WHERE 1=1`;
    const params = [];
    if (statut) { params.push(statut); q += ` AND v.statut=$${params.length}`; }
    if (type)   { params.push(type);   q += ` AND v.type=$${params.length}`; }
    if (from)   { params.push(from);   q += ` AND v.date_ceremonie >= $${params.length}`; }
    if (to)     { params.push(to);     q += ` AND v.date_ceremonie <= $${params.length}`; }
    q += ' ORDER BY v.date_ceremonie DESC, v.heure_debut DESC';
    const r = await pool.query(q, params);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const createCeremonie = async (req, res) => {
  try {
    const { type, titre, date_ceremonie, heure_debut, lieu, description } = req.body;
    if (!type || !titre || !date_ceremonie || !heure_debut)
      return res.status(400).json({ success: false, error: 'Champs obligatoires manquants' });

    const r = await pool.query(
      `INSERT INTO ceremonies (type, titre, date_ceremonie, heure_debut, lieu, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [type, titre, date_ceremonie, heure_debut, lieu || 'QG — UGB', description || null, req.user.id]
    );
    res.status(201).json({ success: true, data: r.rows[0], message: 'Cérémonie créée' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const confirmerCeremonie = async (req, res) => {
  try {
    // Confirmer + pré-remplir les présences avec tous les participants
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cer = await client.query(
        `UPDATE ceremonies SET statut='confirmee', updated_at=NOW() WHERE id=$1 RETURNING *`,
        [req.params.id]
      );
      if (cer.rows.length === 0) throw new Error('Cérémonie non trouvée');

      // Soldats actifs
      const soldiers = await client.query(
        `SELECT id FROM soldiers WHERE statut='actif' AND statut_campus='actif'`
      );
      // Tous les CRICs (pas refusé/inapte)
      const crics = await client.query(
        `SELECT id FROM crics WHERE statut NOT IN ('refusé','inapte')`
      );

      for (const s of soldiers.rows) {
        await client.query(
          `INSERT INTO ceremonie_presences (ceremonie_id, participant_type, soldier_id, presence, created_by)
           VALUES ($1,'soldier',$2,'absent',$3) ON CONFLICT DO NOTHING`,
          [req.params.id, s.id, req.user.id]
        );
      }
      for (const c of crics.rows) {
        await client.query(
          `INSERT INTO ceremonie_presences (ceremonie_id, participant_type, cric_id, presence, created_by)
           VALUES ($1,'cric',$2,'absent',$3) ON CONFLICT DO NOTHING`,
          [req.params.id, c.id, req.user.id]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, data: cer.rows[0], message: 'Cérémonie confirmée — pointage ouvert' });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const terminerCeremonie = async (req, res) => {
  try {
    // Terminer + auto-signaler les absents
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `UPDATE ceremonies SET statut='terminee', updated_at=NOW() WHERE id=$1`,
        [req.params.id]
      );

      // Récupérer les absents soldats
      const absents = await client.query(
        `SELECT cp.soldier_id, cp.cric_id, cp.participant_type
         FROM ceremonie_presences cp
         WHERE cp.ceremonie_id=$1 AND cp.presence='absent'`,
        [req.params.id]
      );

      // Créer un signalement par absent
      for (const a of absents.rows) {
        await client.query(
          `INSERT INTO signalements (section_slug, ceremonie_id, soldier_id, cric_id, type, description, created_by)
           VALUES ('drapeau', $1, $2, $3, 'absence', 'Absent à la cérémonie', $4)`,
          [req.params.id, a.soldier_id || null, a.cric_id || null, req.user.id]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true, message: `Cérémonie terminée — ${absents.rows.length} signalement(s) créé(s)` });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const annulerCeremonie = async (req, res) => {
  try {
    await pool.query(
      `UPDATE ceremonies SET statut='annulee', updated_at=NOW() WHERE id=$1`,
      [req.params.id]
    );
    res.json({ success: true, message: 'Cérémonie annulée' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Pointage ──────────────────────────────────────────────────────────────
const getPointage = async (req, res) => {
  try {
    const soldiers = await pool.query(`
      SELECT s.id, s.nom, s.prenom, s.grade, s.photo_url, s.matricule,
        'soldier' AS participant_type,
        COALESCE(cp.presence, 'absent') AS presence, cp.motif
      FROM soldiers s
      LEFT JOIN ceremonie_presences cp ON cp.soldier_id = s.id AND cp.ceremonie_id=$1
      WHERE s.statut='actif' AND s.statut_campus='actif'
      ORDER BY s.nom, s.prenom
    `, [req.params.id]);

    const crics = await pool.query(`
      SELECT c.id, c.nom, c.prenom, c.photo_url, c.statut AS statut_cric,
        'cric' AS participant_type,
        COALESCE(cp.presence, 'absent') AS presence, cp.motif
      FROM crics c
      LEFT JOIN ceremonie_presences cp ON cp.cric_id = c.id AND cp.ceremonie_id=$1
      WHERE c.statut NOT IN ('refusé','inapte')
      ORDER BY c.nom, c.prenom
    `, [req.params.id]);

    res.json({ success: true, data: { soldiers: soldiers.rows, crics: crics.rows } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const savePointage = async (req, res) => {
  try {
    const { pointages } = req.body;
    for (const p of pointages) {
      if (p.type === 'soldier') {
        await pool.query(
          `INSERT INTO ceremonie_presences (ceremonie_id, participant_type, soldier_id, presence, motif, created_by)
           VALUES ($1,'soldier',$2,$3,$4,$5)
           ON CONFLICT (ceremonie_id, soldier_id)
           DO UPDATE SET presence=$3, motif=$4, created_by=$5`,
          [req.params.id, p.id, p.presence, p.motif || null, req.user.id]
        );
      } else {
        await pool.query(
          `INSERT INTO ceremonie_presences (ceremonie_id, participant_type, cric_id, presence, motif, created_by)
           VALUES ($1,'cric',$2,$3,$4,$5)
           ON CONFLICT (ceremonie_id, cric_id)
           DO UPDATE SET presence=$3, motif=$4, created_by=$5`,
          [req.params.id, p.id, p.presence, p.motif || null, req.user.id]
        );
      }
    }
    res.json({ success: true, message: 'Pointage enregistré' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Membres de la section ─────────────────────────────────────────────────
const getMembres = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT sm.*, s.nom, s.prenom, s.grade, s.photo_url, s.matricule
      FROM section_membres sm
      JOIN soldiers s ON s.id = sm.soldier_id
      WHERE sm.section_slug = 'drapeau'
      ORDER BY CASE sm.role WHEN 'chef' THEN 1 WHEN 'second' THEN 2 ELSE 3 END, s.nom
    `);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const addMembre = async (req, res) => {
  try {
    const { soldier_id, role } = req.body;
    // Un seul chef et un seul second à la fois
    if (role === 'chef' || role === 'second') {
      await pool.query(
        `UPDATE section_membres SET role='membre' WHERE section_slug='drapeau' AND role=$1`,
        [role]
      );
    }
    const r = await pool.query(
      `INSERT INTO section_membres (section_slug, soldier_id, role, created_by)
       VALUES ('drapeau', $1, $2, $3)
       ON CONFLICT (section_slug, soldier_id) DO UPDATE SET role=$2
       RETURNING *`,
      [soldier_id, role || 'membre', req.user.id]
    );
    res.json({ success: true, data: r.rows[0], message: 'Membre ajouté' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const removeMembre = async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM section_membres WHERE section_slug='drapeau' AND soldier_id=$1`,
      [req.params.soldier_id]
    );
    res.json({ success: true, message: 'Membre retiré' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Stats dashboard ───────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [total, mois, taux, prochaine, absents] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM ceremonies WHERE statut != 'annulee'`),
      pool.query(`SELECT COUNT(*) AS total FROM ceremonies WHERE statut != 'annulee' AND date_trunc('month', date_ceremonie) = date_trunc('month', NOW())`),
      pool.query(`SELECT ROUND(AVG(taux_presence)) AS taux FROM vue_stats_ceremonies WHERE statut='terminee'`),
      pool.query(`SELECT titre, date_ceremonie, heure_debut, type FROM ceremonies WHERE statut='planifiee' AND date_ceremonie >= CURRENT_DATE ORDER BY date_ceremonie, heure_debut LIMIT 1`),
      pool.query(`
        SELECT s.nom, s.prenom, s.photo_url, COUNT(*) AS nb_absences
        FROM ceremonie_presences cp
        JOIN soldiers s ON s.id = cp.soldier_id
        WHERE cp.presence = 'absent'
        GROUP BY s.id, s.nom, s.prenom, s.photo_url
        ORDER BY nb_absences DESC LIMIT 5
      `),
    ]);
    res.json({
      success: true,
      data: {
        total_ceremonies:   parseInt(total.rows[0].total),
        ceremonies_ce_mois: parseInt(mois.rows[0].total),
        taux_presence_moyen: parseInt(taux.rows[0].taux) || 0,
        prochaine_ceremonie: prochaine.rows[0] || null,
        top_absents:        absents.rows,
      }
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Génération auto Levée/Descente ────────────────────────────────────────
const genererSemaine = async (req, res) => {
  try {
    const params = await pool.query('SELECT * FROM parametres_drapeau LIMIT 1');
    const p = params.rows[0];
    const created = [];

    // Trouver le prochain lundi et vendredi
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    const nextFriday = new Date(now);
    nextFriday.setDate(now.getDate() + ((5 + 7 - now.getDay()) % 7 || 7));

    if (p.auto_levee_active) {
      const dateStr = nextMonday.toISOString().slice(0, 10);
      const exists = await pool.query(
        `SELECT id FROM ceremonies WHERE type='levee' AND date_ceremonie=$1`, [dateStr]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO ceremonies (type, titre, date_ceremonie, heure_debut, lieu, auto_generee, created_by)
           VALUES ('levee','Levée des Couleurs',$1,$2,'QG — UGB',true,$3)`,
          [dateStr, p.heure_levee, req.user.id]
        );
        created.push(`Levée — ${dateStr}`);
      }
    }

    if (p.auto_descente_active) {
      const dateStr = nextFriday.toISOString().slice(0, 10);
      const exists = await pool.query(
        `SELECT id FROM ceremonies WHERE type='descente' AND date_ceremonie=$1`, [dateStr]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO ceremonies (type, titre, date_ceremonie, heure_debut, lieu, auto_generee, created_by)
           VALUES ('descente','Descente des Couleurs',$1,$2,'QG — UGB',true,$3)`,
          [dateStr, p.heure_descente, req.user.id]
        );
        created.push(`Descente — ${dateStr}`);
      }
    }

    res.json({ success: true, created, message: created.length ? `${created.length} cérémonie(s) générée(s)` : 'Déjà à jour' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

module.exports = {
  getParametres, updateParametres,
  getCeremonies, createCeremonie, confirmerCeremonie, terminerCeremonie, annulerCeremonie,
  getPointage, savePointage,
  getMembres, addMembre, removeMembre,
  getStats, genererSemaine,
};
