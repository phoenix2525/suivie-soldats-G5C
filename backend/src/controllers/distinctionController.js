const { query } = require('../config/database');

const ajouterDistinction = async (req, res) => {
  const { soldier_id, date_distinction, type_distinction, categorie, intitule, description, motif, evenement, date_ceremonie, lieu_ceremonie, remise_par } = req.body;

  if (!soldier_id || !date_distinction || !type_distinction || !intitule || !motif) {
    return res.status(400).json({ success: false, error: 'Champs requis : soldier_id, date_distinction, type_distinction, intitule, motif' });
  }

  try {
    const soldat = await query('SELECT id, nom, prenom FROM soldiers WHERE id = $1', [soldier_id]);
    if (soldat.rows.length === 0) return res.status(404).json({ success: false, error: 'Soldat introuvable' });

    const result = await query(
      `INSERT INTO distinctions 
        (soldier_id, date_distinction, type_distinction, categorie, intitule, description, motif, evenement, date_ceremonie, lieu_ceremonie, remise_par, propose_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [soldier_id, date_distinction, type_distinction, categorie||null, intitule, description||null, motif, evenement||null, date_ceremonie||null, lieu_ceremonie||null, remise_par||null, req.user.id]
    );

    res.status(201).json({ success: true, message: `Distinction accordée à ${soldat.rows[0].prenom} ${soldat.rows[0].nom}`, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur ajout distinction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllDistinctions = async (req, res) => {
  const { type_distinction, date_debut, date_fin } = req.query;
  try {
    let conditions = [], params = [];
    if (type_distinction) { params.push(`%${type_distinction}%`); conditions.push(`d.type_distinction ILIKE $${params.length}`); }
    if (date_debut)       { params.push(date_debut);              conditions.push(`d.date_distinction >= $${params.length}`); }
    if (date_fin)         { params.push(date_fin);                conditions.push(`d.date_distinction <= $${params.length}`); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT d.*, s.matricule, s.nom, s.prenom, s.grade, s.promotion, s.photo_url,
              u.username as propose_par_nom
       FROM distinctions d
       JOIN soldiers s ON d.soldier_id = s.id
       LEFT JOIN users u ON d.propose_par = u.id
       ${whereClause}
       ORDER BY d.date_distinction DESC`,
      params
    );
    res.status(200).json({ success: true, total: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Erreur liste distinctions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDistinctionsSoldat = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT d.*, u.username as propose_par_nom
       FROM distinctions d
       LEFT JOIN users u ON d.propose_par = u.id
       WHERE d.soldier_id = $1
       ORDER BY d.date_distinction DESC`,
      [id]
    );
    res.status(200).json({ success: true, total: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Erreur distinctions soldat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const supprimerDistinction = async (req, res) => {
  try {
    const result = await query('DELETE FROM distinctions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Distinction introuvable' });
    res.status(200).json({ success: true, message: 'Distinction supprimée' });
  } catch (error) {
    console.error('Erreur suppression distinction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getClassementDistinctions = async (req, res) => {
  try {
    const result = await query(
      `SELECT s.id, s.matricule, s.nom, s.prenom, s.grade, s.promotion, s.photo_url,
              COUNT(d.id) as total_distinctions,
              STRING_AGG(DISTINCT d.type_distinction, ', ') as types_distinctions
       FROM soldiers s
       LEFT JOIN distinctions d ON s.id = d.soldier_id
       WHERE s.statut = 'actif'
       GROUP BY s.id, s.matricule, s.nom, s.prenom, s.grade, s.promotion, s.photo_url
       HAVING COUNT(d.id) > 0
       ORDER BY total_distinctions DESC
       LIMIT 10`
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Erreur classement distinctions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { ajouterDistinction, getAllDistinctions, getDistinctionsSoldat, supprimerDistinction, getClassementDistinctions };
