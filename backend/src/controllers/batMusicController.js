const { pool } = require('../config/database');
const { notifyFeuCamp, notifyRepetition } = require('../services/notificationService');

// ── Stats ─────────────────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [chansons, playlists, feux, reps, membres] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM bat_chansons`),
      pool.query(`SELECT COUNT(*) AS total FROM bat_playlists`),
      pool.query(`
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE statut='planifie' AND date_evenement >= CURRENT_DATE) AS a_venir,
          COUNT(*) FILTER (WHERE statut='termine') AS termines
        FROM bat_feux_camp
      `),
      pool.query(`
        SELECT COUNT(*) AS total,
          COUNT(*) FILTER (WHERE statut='planifiee' AND date_rep >= CURRENT_DATE) AS a_venir
        FROM bat_repetitions
      `),
      pool.query(`SELECT COUNT(*) AS total FROM section_membres WHERE section_slug='bat_music'`),
    ]);
    res.json({ success: true, data: {
      total_chansons:  parseInt(chansons.rows[0].total),
      total_playlists: parseInt(playlists.rows[0].total),
      total_feux:      parseInt(feux.rows[0].total),
      feux_a_venir:    parseInt(feux.rows[0].a_venir),
      feux_termines:   parseInt(feux.rows[0].termines),
      total_reps:      parseInt(reps.rows[0].total),
      reps_a_venir:    parseInt(reps.rows[0].a_venir),
      total_membres:   parseInt(membres.rows[0].total),
    }});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Chansons ──────────────────────────────────────────────────────────────
const getChansons = async (req, res) => {
  try {
    const { contexte, q } = req.query;
    let sql = `SELECT c.*, u.username AS created_by_user FROM bat_chansons c
               LEFT JOIN users u ON u.id = c.created_by WHERE 1=1`;
    const params = [];
    if (contexte) { params.push(contexte); sql += ` AND c.contexte=$${params.length}`; }
    if (q)        { params.push(`%${q}%`); sql += ` AND (c.titre ILIKE $${params.length} OR c.paroles ILIKE $${params.length} OR c.tags ILIKE $${params.length})`; }
    sql += ' ORDER BY c.titre';
    const r = await pool.query(sql, params);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const createChanson = async (req, res) => {
  try {
    const { titre, paroles, contexte, lien_externe, tags, notes } = req.body;
    if (!titre) return res.status(400).json({ success: false, error: 'Titre obligatoire' });
    const r = await pool.query(
      `INSERT INTO bat_chansons (titre, paroles, contexte, lien_externe, tags, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [titre, paroles||null, contexte||'general', lien_externe||null, tags||null, notes||null, req.user.id]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const updateChanson = async (req, res) => {
  try {
    const { titre, paroles, contexte, lien_externe, tags, notes } = req.body;
    const r = await pool.query(
      `UPDATE bat_chansons SET titre=$1, paroles=$2, contexte=$3, lien_externe=$4,
       tags=$5, notes=$6, updated_at=NOW() WHERE id=$7 RETURNING *`,
      [titre, paroles||null, contexte||'general', lien_externe||null, tags||null, notes||null, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const deleteChanson = async (req, res) => {
  try {
    await pool.query('DELETE FROM bat_chansons WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Chanson supprimée' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Playlists ─────────────────────────────────────────────────────────────
const getPlaylists = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT p.*, u.username AS created_by_user,
        COUNT(pc.id) AS nb_chansons
      FROM bat_playlists p
      LEFT JOIN users u ON u.id = p.created_by
      LEFT JOIN bat_playlist_chansons pc ON pc.playlist_id = p.id
      GROUP BY p.id, u.username
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const getPlaylistDetail = async (req, res) => {
  try {
    const pl = await pool.query(`SELECT * FROM bat_playlists WHERE id=$1`, [req.params.id]);
    const chansons = await pool.query(`
      SELECT c.*, pc.ordre FROM bat_chansons c
      JOIN bat_playlist_chansons pc ON pc.chanson_id = c.id
      WHERE pc.playlist_id = $1
      ORDER BY pc.ordre
    `, [req.params.id]);
    res.json({ success: true, data: { ...pl.rows[0], chansons: chansons.rows } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const createPlaylist = async (req, res) => {
  try {
    const { nom, contexte, description, chanson_ids } = req.body;
    if (!nom) return res.status(400).json({ success: false, error: 'Nom obligatoire' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `INSERT INTO bat_playlists (nom, contexte, description, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
        [nom, contexte||'general', description||null, req.user.id]
      );
      const pid = r.rows[0].id;
      if (chanson_ids?.length) {
        for (let i = 0; i < chanson_ids.length; i++) {
          await client.query(
            `INSERT INTO bat_playlist_chansons (playlist_id, chanson_id, ordre) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
            [pid, chanson_ids[i], i]
          );
        }
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, data: r.rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const updatePlaylist = async (req, res) => {
  try {
    const { nom, contexte, description, chanson_ids } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE bat_playlists SET nom=$1, contexte=$2, description=$3 WHERE id=$4`,
        [nom, contexte||'general', description||null, req.params.id]
      );
      // Remplacer les chansons
      await client.query(`DELETE FROM bat_playlist_chansons WHERE playlist_id=$1`, [req.params.id]);
      if (chanson_ids?.length) {
        for (let i = 0; i < chanson_ids.length; i++) {
          await client.query(
            `INSERT INTO bat_playlist_chansons (playlist_id, chanson_id, ordre) VALUES ($1,$2,$3)`,
            [req.params.id, chanson_ids[i], i]
          );
        }
      }
      await client.query('COMMIT');
      res.json({ success: true, message: 'Playlist mise à jour' });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const deletePlaylist = async (req, res) => {
  try {
    await pool.query('DELETE FROM bat_playlists WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Playlist supprimée' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Feux de camp ──────────────────────────────────────────────────────────
const getFeuxCamp = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT f.*, p.nom AS playlist_nom, p.contexte AS playlist_contexte,
        u.username AS created_by_user,
        COUNT(bf.id) FILTER (WHERE bf.presence='present') AS nb_presents,
        COUNT(bf.id) AS total_membres
      FROM bat_feux_camp f
      LEFT JOIN bat_playlists p ON p.id = f.playlist_id
      LEFT JOIN users u ON u.id = f.created_by
      LEFT JOIN bat_pointage_feux bf ON bf.feu_id = f.id
      GROUP BY f.id, p.nom, p.contexte, u.username
      ORDER BY f.date_evenement DESC
    `);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const createFeuCamp = async (req, res) => {
  try {
    const { titre, date_evenement, heure_debut, lieu, groupe_beneficiaire, playlist_id } = req.body;
    if (!titre || !date_evenement) return res.status(400).json({ success: false, error: 'Titre et date obligatoires' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `INSERT INTO bat_feux_camp (titre, date_evenement, heure_debut, lieu, groupe_beneficiaire, playlist_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [titre, date_evenement, heure_debut||null, lieu||null, groupe_beneficiaire||null, playlist_id||null, req.user.id]
      );
      // Pré-remplir membres BAT-MUSIC
      const membres = await client.query(
        `SELECT soldier_id FROM section_membres WHERE section_slug='bat_music'`
      );
      for (const m of membres.rows) {
        await client.query(
          `INSERT INTO bat_pointage_feux (feu_id, soldier_id, presence, created_by) VALUES ($1,$2,'absent',$3) ON CONFLICT DO NOTHING`,
          [r.rows[0].id, m.soldier_id, req.user.id]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, data: r.rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const updateFeuCamp = async (req, res) => {
  try {
    const { titre, date_evenement, heure_debut, lieu, groupe_beneficiaire, playlist_id, statut, rapport } = req.body;
    const r = await pool.query(
      `UPDATE bat_feux_camp SET titre=$1, date_evenement=$2, heure_debut=$3, lieu=$4,
       groupe_beneficiaire=$5, playlist_id=$6, statut=$7, rapport=$8 WHERE id=$9 RETURNING *`,
      [titre, date_evenement, heure_debut||null, lieu||null, groupe_beneficiaire||null,
       playlist_id||null, statut||'planifie', rapport||null, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const deleteFeuCamp = async (req, res) => {
  try {
    await pool.query('DELETE FROM bat_feux_camp WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Feu de camp supprimé' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Répétitions ───────────────────────────────────────────────────────────
const getRepetitions = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rp.*, u.username AS created_by_user,
        COUNT(br.id) FILTER (WHERE br.presence='present') AS nb_presents,
        COUNT(br.id) AS total_membres
      FROM bat_repetitions rp
      LEFT JOIN users u ON u.id = rp.created_by
      LEFT JOIN bat_pointage_reps br ON br.repetition_id = rp.id
      GROUP BY rp.id, u.username
      ORDER BY rp.date_rep DESC
    `);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const createRepetition = async (req, res) => {
  try {
    const { type_rep, date_rep, heure_debut, heure_fin, lieu, notes } = req.body;
    if (!date_rep) return res.status(400).json({ success: false, error: 'Date obligatoire' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `INSERT INTO bat_repetitions (type_rep, date_rep, heure_debut, heure_fin, lieu, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [type_rep||'interne', date_rep, heure_debut||'14:00', heure_fin||'17:00', lieu||null, notes||null, req.user.id]
      );
      // Pré-remplir membres BAT-MUSIC
      const membres = await client.query(
        `SELECT soldier_id FROM section_membres WHERE section_slug='bat_music'`
      );
      for (const m of membres.rows) {
        await client.query(
          `INSERT INTO bat_pointage_reps (repetition_id, soldier_id, presence, created_by) VALUES ($1,$2,'absent',$3) ON CONFLICT DO NOTHING`,
          [r.rows[0].id, m.soldier_id, req.user.id]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, data: r.rows[0] });
    } catch (e) { await client.query('ROLLBACK'); throw e; }
    finally { client.release(); }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const deleteRepetition = async (req, res) => {
  try {
    await pool.query('DELETE FROM bat_repetitions WHERE id=$1', [req.params.id]);
    res.json({ success: true, message: 'Répétition supprimée' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Pointage générique ────────────────────────────────────────────────────
const getPointage = async (req, res) => {
  try {
    const { type, id } = req.params;
    let r;
    if (type === 'feu') {
      r = await pool.query(`
        SELECT s.id, s.nom, s.prenom, s.grade, s.photo_url, sm.role,
          COALESCE(bp.presence,'absent') AS presence, bp.motif
        FROM section_membres sm
        JOIN soldiers s ON s.id = sm.soldier_id
        LEFT JOIN bat_pointage_feux bp ON bp.soldier_id = s.id AND bp.feu_id = $1
        WHERE sm.section_slug = 'bat_music' ORDER BY s.nom
      `, [id]);
    } else {
      r = await pool.query(`
        SELECT s.id, s.nom, s.prenom, s.grade, s.photo_url, sm.role,
          COALESCE(bp.presence,'absent') AS presence, bp.motif
        FROM section_membres sm
        JOIN soldiers s ON s.id = sm.soldier_id
        LEFT JOIN bat_pointage_reps bp ON bp.soldier_id = s.id AND bp.repetition_id = $1
        WHERE sm.section_slug = 'bat_music' ORDER BY s.nom
      `, [id]);
    }
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const savePointage = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { pointages } = req.body;
    for (const p of pointages) {
      if (type === 'feu') {
        await pool.query(
          `INSERT INTO bat_pointage_feux (feu_id, soldier_id, presence, motif, created_by)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (feu_id, soldier_id) DO UPDATE SET presence=$3, motif=$4, created_by=$5`,
          [id, p.id, p.presence, p.motif||null, req.user.id]
        );
      } else {
        await pool.query(
          `INSERT INTO bat_pointage_reps (repetition_id, soldier_id, presence, motif, created_by)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (repetition_id, soldier_id) DO UPDATE SET presence=$3, motif=$4, created_by=$5`,
          [id, p.id, p.presence, p.motif||null, req.user.id]
        );
      }
    }
    res.json({ success: true, message: 'Pointage enregistré' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// ── Membres ───────────────────────────────────────────────────────────────
const getMembres = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT sm.*, s.nom, s.prenom, s.grade, s.photo_url, s.matricule
      FROM section_membres sm JOIN soldiers s ON s.id = sm.soldier_id
      WHERE sm.section_slug='bat_music'
      ORDER BY CASE sm.role WHEN 'chef' THEN 1 WHEN 'second' THEN 2 ELSE 3 END, s.nom
    `);
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const addMembre = async (req, res) => {
  try {
    const { soldier_id, role } = req.body;
    if (role === 'chef' || role === 'second') {
      await pool.query(`UPDATE section_membres SET role='membre' WHERE section_slug='bat_music' AND role=$1`, [role]);
    }
    const r = await pool.query(
      `INSERT INTO section_membres (section_slug, soldier_id, role, created_by)
       VALUES ('bat_music',$1,$2,$3)
       ON CONFLICT (section_slug, soldier_id) DO UPDATE SET role=$2 RETURNING *`,
      [soldier_id, role||'membre', req.user.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const removeMembre = async (req, res) => {
  try {
    await pool.query(`DELETE FROM section_membres WHERE section_slug='bat_music' AND soldier_id=$1`, [req.params.soldier_id]);
    res.json({ success: true, message: 'Membre retiré' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

module.exports = {
  getStats,
  getChansons, createChanson, updateChanson, deleteChanson,
  getPlaylists, getPlaylistDetail, createPlaylist, updatePlaylist, deletePlaylist,
  getFeuxCamp, createFeuCamp, updateFeuCamp, deleteFeuCamp,
  getRepetitions, createRepetition, deleteRepetition,
  getPointage, savePointage,
  getMembres, addMembre, removeMembre,
};
