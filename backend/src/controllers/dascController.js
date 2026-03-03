const { query } = require('../config/database');

// ── Dashboard DASC ────────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [stats, competitions, evenements, palmares, equipe] = await Promise.all([

      // Stats globales
      query(`
        SELECT
          (SELECT COUNT(*) FROM competitions) as total_competitions,
          (SELECT COUNT(*) FROM competitions WHERE statut='en_cours') as en_cours,
          (SELECT COUNT(*) FROM competitions WHERE statut='planifie') as planifies,
          (SELECT COUNT(*) FROM competitions WHERE statut='termine') as termines,
          (SELECT COUNT(*) FROM evenements_culturels) as total_evenements,
          (SELECT COUNT(*) FROM participations) as total_participations,
          (SELECT COUNT(*) FROM participations WHERE medaille='or') as medailles_or,
          (SELECT COUNT(*) FROM participations WHERE medaille='argent') as medailles_argent,
          (SELECT COUNT(*) FROM participations WHERE medaille='bronze') as medailles_bronze
      `),

      // Compétitions récentes
      query(`
        SELECT c.*,
          COUNT(p.id) as nb_participants,
          COUNT(p.id) FILTER (WHERE p.medaille='or') as ors,
          COUNT(p.id) FILTER (WHERE p.medaille='argent') as argents,
          COUNT(p.id) FILTER (WHERE p.medaille='bronze') as bronzes
        FROM competitions c
        LEFT JOIN participations p ON p.competition_id = c.id
        GROUP BY c.id
        ORDER BY c.date_debut DESC
        LIMIT 10
      `),

      // Événements culturels récents
      query(`
        SELECT e.*,
          COUNT(pc.id) as nb_participants
        FROM evenements_culturels e
        LEFT JOIN participations_culturelles pc ON pc.evenement_id = e.id
        GROUP BY e.id
        ORDER BY e.date_evenement DESC
        LIMIT 10
      `),

      // Palmarès top soldats
      query(`
        SELECT s.id, s.prenom, s.nom, s.grade, s.matricule, s.photo_url,
          COUNT(p.id) as nb_participations,
          COUNT(p.id) FILTER (WHERE p.medaille='or') as ors,
          COUNT(p.id) FILTER (WHERE p.medaille='argent') as argents,
          COUNT(p.id) FILTER (WHERE p.medaille='bronze') as bronzes,
          COUNT(p.id) FILTER (WHERE p.medaille IN ('or','argent','bronze')) as total_medailles
        FROM soldiers s
        JOIN participations p ON p.soldier_id = s.id
        WHERE s.statut = 'actif'
        GROUP BY s.id
        HAVING COUNT(p.id) > 0
        ORDER BY ors DESC, argents DESC, bronzes DESC, nb_participations DESC
        LIMIT 10
      `),

      // Équipe DASC
      query(`
        SELECT id, prenom, nom, grade, matricule, photo_url, fonction, telephone
        FROM soldiers
        WHERE statut = 'actif' AND section_affectation ILIKE '%DASC%'
        ORDER BY
          CASE WHEN fonction ILIKE '%directeur%' THEN 1
               WHEN fonction ILIKE '%responsable%' THEN 2
               ELSE 3 END, nom
      `),
    ]);

    res.json({
      success: true,
      data: {
        stats: stats.rows[0],
        competitions: competitions.rows,
        evenements: evenements.rows,
        palmares: palmares.rows,
        equipe: equipe.rows,
      }
    });
  } catch(e) {
    console.error('DASC dashboard error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── CRUD Compétitions ─────────────────────────────────────────────────────────
const creerCompetition = async (req, res) => {
  try {
    const { titre, sport, type, date_debut, date_fin, lieu, description, statut } = req.body;
    if (!titre || !sport || !date_debut)
      return res.status(400).json({ success: false, message: 'Titre, sport et date requis' });
    const r = await query(
      `INSERT INTO competitions (titre, sport, type, date_debut, date_fin, lieu, description, statut, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [titre, sport, type||'interne', date_debut, date_fin||null, lieu||null, description||null, statut||'planifie', req.user.id]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const modifierCompetition = async (req, res) => {
  try {
    const { id } = req.params;
    const { titre, sport, type, date_debut, date_fin, lieu, description, statut } = req.body;
    const r = await query(
      `UPDATE competitions SET titre=$1, sport=$2, type=$3, date_debut=$4, date_fin=$5,
       lieu=$6, description=$7, statut=$8 WHERE id=$9 RETURNING *`,
      [titre, sport, type, date_debut, date_fin||null, lieu||null, description||null, statut, id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const supprimerCompetition = async (req, res) => {
  try {
    await query('DELETE FROM competitions WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const getCompetition = async (req, res) => {
  try {
    const [comp, parts] = await Promise.all([
      query('SELECT * FROM competitions WHERE id=$1', [req.params.id]),
      query(`
        SELECT p.*, s.prenom, s.nom, s.grade, s.matricule, s.photo_url
        FROM participations p
        LEFT JOIN soldiers s ON p.soldier_id = s.id
        WHERE p.competition_id = $1
        ORDER BY p.classement ASC NULLS LAST, p.medaille ASC
      `, [req.params.id]),
    ]);
    res.json({ success: true, data: { ...comp.rows[0], participants: parts.rows } });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── CRUD Participations ───────────────────────────────────────────────────────
const ajouterParticipation = async (req, res) => {
  try {
    const { competition_id, soldier_id, cric_id, sport, classement, medaille, performance, observations } = req.body;
    if (!competition_id || (!soldier_id && !cric_id))
      return res.status(400).json({ success: false, message: 'Compétition et participant requis' });
    const r = await query(
      `INSERT INTO participations (competition_id, soldier_id, cric_id, sport, classement, medaille, performance, observations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [competition_id, soldier_id||null, cric_id||null, sport||null, classement||null, medaille||'aucune', performance||null, observations||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const supprimerParticipation = async (req, res) => {
  try {
    await query('DELETE FROM participations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── CRUD Événements culturels ─────────────────────────────────────────────────
const creerEvenement = async (req, res) => {
  try {
    const { titre, type, date_evenement, lieu, description, statut } = req.body;
    if (!titre || !type || !date_evenement)
      return res.status(400).json({ success: false, message: 'Titre, type et date requis' });
    const r = await query(
      `INSERT INTO evenements_culturels (titre, type, date_evenement, lieu, description, statut, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [titre, type, date_evenement, lieu||null, description||null, statut||'planifie', req.user.id]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const modifierEvenement = async (req, res) => {
  try {
    const { id } = req.params;
    const { titre, type, date_evenement, lieu, description, statut } = req.body;
    const r = await query(
      `UPDATE evenements_culturels SET titre=$1, type=$2, date_evenement=$3,
       lieu=$4, description=$5, statut=$6 WHERE id=$7 RETURNING *`,
      [titre, type, date_evenement, lieu||null, description||null, statut, id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const supprimerEvenement = async (req, res) => {
  try {
    await query('DELETE FROM evenements_culturels WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const ajouterParticipationCulturelle = async (req, res) => {
  try {
    const { evenement_id, soldier_id, cric_id, role, distinction, observations } = req.body;
    if (!evenement_id || (!soldier_id && !cric_id))
      return res.status(400).json({ success: false, message: 'Événement et participant requis' });
    const r = await query(
      `INSERT INTO participations_culturelles (evenement_id, soldier_id, cric_id, role, distinction, observations)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [evenement_id, soldier_id||null, cric_id||null, role||null, distinction||null, observations||null]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
  getDashboard,
  creerCompetition, modifierCompetition, supprimerCompetition, getCompetition,
  ajouterParticipation, supprimerParticipation,
  creerEvenement, modifierEvenement, supprimerEvenement, ajouterParticipationCulturelle,
};
