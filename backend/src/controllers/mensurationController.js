const { query } = require('../config/database');

// =====================================================
// AJOUTER / METTRE À JOUR LES MENSURATIONS
// =====================================================
const ajouterMensuration = async (req, res) => {
  const {
    soldier_id,
    date_mesure,
    taille_cm,
    poids_kg,
    tour_poitrine_cm,
    tour_taille_cm,
    tour_hanches_cm,
    longueur_bras_cm,
    longueur_jambe_cm,
    pointure,
    taille_standard,
    notes
  } = req.body;

  if (!soldier_id || !date_mesure) {
    return res.status(400).json({
      success: false,
      message: 'Champs requis : soldier_id, date_mesure'
    });
  }

  const tailles_valides = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  if (taille_standard && !tailles_valides.includes(taille_standard)) {
    return res.status(400).json({
      success: false,
      message: `Taille standard invalide. Valeurs acceptées: ${tailles_valides.join(', ')}`
    });
  }

  try {
    // Vérifier que le soldat existe
    const soldat = await query('SELECT id, nom, prenom FROM soldiers WHERE id = $1', [soldier_id]);
    if (soldat.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Soldat introuvable' });
    }

    // Désactiver l'ancienne mensuration active
    await query(
      `UPDATE mensurations SET est_actuelle = false WHERE soldier_id = $1 AND est_actuelle = true`,
      [soldier_id]
    );

    // Insérer les nouvelles mensurations
    const result = await query(
      `INSERT INTO mensurations 
        (soldier_id, date_mesure, taille_cm, poids_kg, tour_poitrine_cm, tour_taille_cm,
         tour_hanches_cm, longueur_bras_cm, longueur_jambe_cm, pointure, taille_standard, notes, est_actuelle, pris_par)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13)
       RETURNING *`,
      [
        soldier_id, date_mesure,
        taille_cm || null, poids_kg || null,
        tour_poitrine_cm || null, tour_taille_cm || null,
        tour_hanches_cm || null, longueur_bras_cm || null,
        longueur_jambe_cm || null, pointure || null,
        taille_standard || null, notes || null,
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: `Mensurations enregistrées pour ${soldat.rows[0].prenom} ${soldat.rows[0].nom}`,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur ajout mensuration:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// =====================================================
// OBTENIR LES MENSURATIONS ACTUELLES D'UN SOLDAT
// =====================================================
const getMensurationActuelle = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT m.*, u.username as pris_par_nom
       FROM mensurations m
       LEFT JOIN users u ON m.pris_par = u.id
       WHERE m.soldier_id = $1 AND m.est_actuelle = true
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Aucune mensuration enregistrée',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erreur mensuration actuelle:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// =====================================================
// HISTORIQUE DES MENSURATIONS D'UN SOLDAT
// =====================================================
const getHistoriqueMensurations = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      `SELECT m.*, u.username as pris_par_nom
       FROM mensurations m
       LEFT JOIN users u ON m.pris_par = u.id
       WHERE m.soldier_id = $1
       ORDER BY m.date_mesure DESC`,
      [id]
    );

    res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows
    });

  } catch (error) {
    console.error('Erreur historique mensurations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// =====================================================
// LISTE DE TOUTES LES MENSURATIONS ACTUELLES
// (utile pour la confection des uniformes en masse)
// =====================================================
const getAllMensurationsActuelles = async (req, res) => {
  const { taille_standard, grade, promotion } = req.query;

  try {
    let conditions = ['m.est_actuelle = true', 's.statut = \'actif\''];
    const params = [];

    if (taille_standard) {
      params.push(taille_standard);
      conditions.push(`m.taille_standard = $${params.length}`);
    }
    if (grade) {
      params.push(grade);
      conditions.push(`s.grade = $${params.length}`);
    }
    if (promotion) {
      params.push(promotion);
      conditions.push(`s.promotion = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT 
        s.matricule, s.nom, s.prenom, s.grade, s.promotion,
        m.taille_cm, m.poids_kg, m.tour_poitrine_cm, m.tour_taille_cm,
        m.tour_hanches_cm, m.longueur_bras_cm, m.longueur_jambe_cm,
        m.pointure, m.taille_standard, m.date_mesure, m.notes
       FROM mensurations m
       JOIN soldiers s ON m.soldier_id = s.id
       ${whereClause}
       ORDER BY s.grade, s.nom`,
      params
    );

    // Statistiques des tailles (pour commander les uniformes)
    const statsResult = await query(
      `SELECT taille_standard, COUNT(*) as nombre
       FROM mensurations m
       JOIN soldiers s ON m.soldier_id = s.id
       WHERE m.est_actuelle = true AND s.statut = 'actif'
       AND m.taille_standard IS NOT NULL
       GROUP BY taille_standard
       ORDER BY taille_standard`
    );

    res.status(200).json({
      success: true,
      total: result.rows.length,
      data: result.rows,
      stats_tailles: statsResult.rows
    });

  } catch (error) {
    console.error('Erreur liste mensurations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// =====================================================
// SOLDATS SANS MENSURATIONS ENREGISTRÉES
// =====================================================
const getSoldatsSansMensurations = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.matricule, s.nom, s.prenom, s.grade, s.promotion
       FROM soldiers s
       WHERE s.statut = 'actif'
       AND s.id NOT IN (
         SELECT DISTINCT soldier_id FROM mensurations WHERE est_actuelle = true
       )
       ORDER BY s.grade, s.nom`
    );

    res.status(200).json({
      success: true,
      total: result.rows.length,
      message: `${result.rows.length} soldat(s) sans mensurations enregistrées`,
      data: result.rows
    });

  } catch (error) {
    console.error('Erreur soldats sans mensurations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  ajouterMensuration,
  getMensurationActuelle,
  getHistoriqueMensurations,
  getAllMensurationsActuelles,
  getSoldatsSansMensurations
};
