const { query } = require('../config/database');

const ajouterSanction = async (req, res) => {
  const { soldier_id, date_sanction, type_sanction, categorie, motif, faits, severite, duree_jours, date_debut_execution } = req.body;

  if (!soldier_id || !date_sanction || !type_sanction || !motif || !severite) {
    return res.status(400).json({ success: false, error: 'Champs requis : soldier_id, date_sanction, type_sanction, motif, severite' });
  }

  const severites_valides = ['mineure', 'moyenne', 'grave', 'tres_grave'];
  if (!severites_valides.includes(severite)) {
    return res.status(400).json({ success: false, error: `Sévérité invalide. Valeurs: ${severites_valides.join(', ')}` });
  }

  try {
    const soldat = await query('SELECT id, nom, prenom FROM soldiers WHERE id = $1', [soldier_id]);
    if (soldat.rows.length === 0) return res.status(404).json({ success: false, error: 'Soldat introuvable' });

    const result = await query(
      `INSERT INTO sanctions 
        (soldier_id, date_sanction, type_sanction, categorie, motif, faits, severite, duree_jours, date_debut_execution, prononce_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [soldier_id, date_sanction, type_sanction, categorie||null, motif, faits||null, severite, duree_jours||null, date_debut_execution||null, req.user.id]
    );

    res.status(201).json({ success: true, message: `Sanction enregistrée pour ${soldat.rows[0].prenom} ${soldat.rows[0].nom}`, data: result.rows[0] });
  } catch (error) {
    console.error('Erreur ajout sanction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getAllSanctions = async (req, res) => {
  const { severite, date_debut, date_fin, statut } = req.query;
  try {
    let conditions = [], params = [];
    if (severite)    { params.push(severite);    conditions.push(`sa.severite = $${params.length}`); }
    if (statut)      { params.push(statut);      conditions.push(`sa.statut = $${params.length}`); }
    if (date_debut)  { params.push(date_debut);  conditions.push(`sa.date_sanction >= $${params.length}`); }
    if (date_fin)    { params.push(date_fin);    conditions.push(`sa.date_sanction <= $${params.length}`); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT sa.*, s.matricule, s.nom, s.prenom, s.grade, s.photo_url,
              u.username as prononce_par_nom
       FROM sanctions sa
       JOIN soldiers s ON sa.soldier_id = s.id
       LEFT JOIN users u ON sa.prononce_par = u.id
       ${whereClause}
       ORDER BY sa.date_sanction DESC`,
      params
    );
    res.status(200).json({ success: true, total: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Erreur liste sanctions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getSanctionsSoldat = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT sa.*, u.username as prononce_par_nom
       FROM sanctions sa
       LEFT JOIN users u ON sa.prononce_par = u.id
       WHERE sa.soldier_id = $1
       ORDER BY sa.date_sanction DESC`,
      [id]
    );
    const stats = await query(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE severite='mineure') as mineures,
              COUNT(*) FILTER (WHERE severite='moyenne') as moyennes,
              COUNT(*) FILTER (WHERE severite='grave') as graves,
              COUNT(*) FILTER (WHERE severite='tres_grave') as tres_graves
       FROM sanctions WHERE soldier_id = $1`,
      [id]
    );
    res.status(200).json({ success: true, data: result.rows, stats: stats.rows[0] });
  } catch (error) {
    console.error('Erreur sanctions soldat:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const supprimerSanction = async (req, res) => {
  try {
    const result = await query('DELETE FROM sanctions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, error: 'Sanction introuvable' });
    res.status(200).json({ success: true, message: 'Sanction supprimée' });
  } catch (error) {
    console.error('Erreur suppression sanction:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { ajouterSanction, getAllSanctions, getSanctionsSoldat, supprimerSanction };
