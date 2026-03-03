const { query } = require('../config/database');

// =====================================================
// ENREGISTRER LES PRÉSENCES D'UNE ACTIVITÉ
// =====================================================
const enregistrerPresences = async (req, res) => {
  const { date_activite, type_activite, presences, remarque_generale } = req.body;

  // Validation
  if (!date_activite || !type_activite || !presences || !Array.isArray(presences)) {
    return res.status(400).json({
      success: false,
      message: 'Données invalides. date_activite, type_activite et presences sont requis.'
    });
  }

  const types_valides = ['levee_couleurs', 'descente_couleurs', 'entrainement', 'course', 'autre'];
  if (!types_valides.includes(type_activite)) {
    return res.status(400).json({
      success: false,
      message: `Type d'activité invalide. Valeurs acceptées: ${types_valides.join(', ')}`
    });
  }

  try {
    // Insérer chaque présence
    const resultats = [];
    for (const p of presences) {
      const { soldier_id, present, remarque } = p;

      // Vérifier si une présence existe déjà pour ce soldat/date/activité
      const existant = await query(
        'SELECT id FROM presences WHERE soldier_id = $1 AND date_activite = $2 AND type_activite = $3',
        [soldier_id, date_activite, type_activite]
      );

      let result;
      if (existant.rows.length > 0) {
        // Mettre à jour si déjà existant
        result = await query(
          `UPDATE presences SET present = $1, remarque = $2, enregistre_par = $3
           WHERE soldier_id = $4 AND date_activite = $5 AND type_activite = $6
           RETURNING *`,
          [present, remarque || null, req.user.id, soldier_id, date_activite, type_activite]
        );
      } else {
        // Créer une nouvelle entrée
        result = await query(
          `INSERT INTO presences (soldier_id, date_activite, type_activite, present, remarque, enregistre_par)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
          [soldier_id, date_activite, type_activite, present, remarque || null, req.user.id]
        );
      }
      resultats.push(result.rows[0]);
    }

    res.status(200).json({
      success: true,
      message: `${resultats.length} présence(s) enregistrée(s) avec succès`,
      data: resultats
    });

  } catch (error) {
    console.error('Erreur enregistrement présences:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// =====================================================
// OBTENIR LES PRÉSENCES D'UNE ACTIVITÉ (par date + type)
// =====================================================
const getPresencesActivite = async (req, res) => {
  const { date_activite, type_activite } = req.query;

  if (!date_activite || !type_activite) {
    return res.status(400).json({
      success: false,
      message: 'date_activite et type_activite sont requis'
    });
  }

  try {
    const result = await query(
      `SELECT 
        p.id,
        p.soldier_id,
        s.matricule,
        s.nom,
        s.prenom,
        s.grade,
        s.promotion,
        p.present,
        p.remarque,
        p.date_activite,
        p.type_activite,
        u.username as enregistre_par
       FROM presences p
       JOIN soldiers s ON p.soldier_id = s.id
       LEFT JOIN users u ON p.enregistre_par = u.id
       WHERE p.date_activite = $1 AND p.type_activite = $2
       ORDER BY s.grade, s.nom`,
      [date_activite, type_activite]
    );

    // Stats rapides
    const total = result.rows.length;
    const presents = result.rows.filter(r => r.present).length;
    const absents = total - presents;

    res.status(200).json({
      success: true,
      data: result.rows,
      stats: {
        total,
        presents,
        absents,
        taux_presence: total > 0 ? Math.round((presents / total) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Erreur récupération présences:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// =====================================================
// OBTENIR LES PRÉSENCES D'UN SOLDAT
// =====================================================
const getPresencesSoldat = async (req, res) => {
  const { id } = req.params;
  const { limite = 30, type_activite } = req.query;

  try {
    let sql = `
      SELECT p.*, u.username as enregistre_par_nom
      FROM presences p
      LEFT JOIN users u ON p.enregistre_par = u.id
      WHERE p.soldier_id = $1
    `;
    const params = [id];

    if (type_activite) {
      params.push(type_activite);
      sql += ` AND p.type_activite = $${params.length}`;
    }

    sql += ` ORDER BY p.date_activite DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limite));

    const result = await query(sql, params);

    // Calculer les statistiques globales du soldat
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_activites,
        COUNT(*) FILTER (WHERE present = true) as total_presents,
        COUNT(*) FILTER (WHERE present = false) as total_absents,
        COUNT(*) FILTER (WHERE type_activite = 'levee_couleurs') as levees_total,
        COUNT(*) FILTER (WHERE type_activite = 'levee_couleurs' AND present = true) as levees_presents,
        COUNT(*) FILTER (WHERE type_activite = 'descente_couleurs') as descentes_total,
        COUNT(*) FILTER (WHERE type_activite = 'descente_couleurs' AND present = true) as descentes_presents
       FROM presences WHERE soldier_id = $1`,
      [id]
    );

    const stats = statsResult.rows[0];
    stats.taux_presence_global = stats.total_activites > 0
      ? Math.round((stats.total_presents / stats.total_activites) * 100)
      : 0;

    res.status(200).json({
      success: true,
      data: result.rows,
      stats
    });

  } catch (error) {
    console.error('Erreur présences soldat:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// =====================================================
// OBTENIR LES SOLDATS SANS PRÉSENCE ENREGISTRÉE
// (pour savoir qui manque lors d'un appel)
// =====================================================
const getSoldatsSansPresence = async (req, res) => {
  const { date_activite, type_activite } = req.query;

  if (!date_activite || !type_activite) {
    return res.status(400).json({
      success: false,
      message: 'date_activite et type_activite sont requis'
    });
  }

  try {
    const result = await query(
      `SELECT s.id, s.matricule, s.nom, s.prenom, s.grade, s.promotion, s.village, s.pavillon
       FROM soldiers s
       WHERE s.statut = 'actif'
       AND s.id NOT IN (
         SELECT soldier_id FROM presences
         WHERE date_activite = $1 AND type_activite = $2
       )
       ORDER BY s.grade, s.nom`,
      [date_activite, type_activite]
    );

    res.status(200).json({
      success: true,
      message: `${result.rows.length} soldat(s) sans présence enregistrée`,
      data: result.rows
    });

  } catch (error) {
    console.error('Erreur soldats sans présence:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// =====================================================
// STATISTIQUES GLOBALES DES PRÉSENCES
// =====================================================
const getStatsPresences = async (req, res) => {
  const { date_debut, date_fin } = req.query;

  try {
    let whereClause = '';
    const params = [];

    if (date_debut && date_fin) {
      params.push(date_debut, date_fin);
      whereClause = `WHERE p.date_activite BETWEEN $1 AND $2`;
    }

    const result = await query(
      `SELECT 
        p.type_activite,
        COUNT(DISTINCT p.date_activite) as nb_activites,
        COUNT(*) as total_enregistrements,
        COUNT(*) FILTER (WHERE p.present = true) as total_presents,
        ROUND(AVG(CASE WHEN p.present THEN 1 ELSE 0 END) * 100) as taux_moyen
       FROM presences p
       ${whereClause}
       GROUP BY p.type_activite
       ORDER BY p.type_activite`,
      params
    );

    // Top 5 soldats les plus assidus
    const topSoldats = await query(
      `SELECT 
        s.matricule, s.nom, s.prenom, s.grade,
        COUNT(*) as total_activites,
        COUNT(*) FILTER (WHERE p.present = true) as presents,
        ROUND(COUNT(*) FILTER (WHERE p.present = true)::numeric / COUNT(*) * 100) as taux
       FROM presences p
       JOIN soldiers s ON p.soldier_id = s.id
       GROUP BY s.id, s.matricule, s.nom, s.prenom, s.grade
       HAVING COUNT(*) > 0
       ORDER BY taux DESC, presents DESC
       LIMIT 5`
    );

    res.status(200).json({
      success: true,
      data: {
        par_type: result.rows,
        top_assidus: topSoldats.rows
      }
    });

  } catch (error) {
    console.error('Erreur stats présences:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  enregistrerPresences,
  getPresencesActivite,
  getPresencesSoldat,
  getSoldatsSansPresence,
  getStatsPresences
};
