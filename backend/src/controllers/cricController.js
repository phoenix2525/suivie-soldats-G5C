const { pool } = require('../config/database');

// ── Lister tous les CRICs ─────────────────────────────────────────────────
const getAllCrics = async (req, res) => {
  try {
    const { statut } = req.query;
    let query = `
      SELECT c.*, 
        CONCAT(c.prenom, ' ', c.nom) AS nom_complet,
        u.username AS created_by_user
      FROM crics c
      LEFT JOIN users u ON c.created_by = u.id
    `;
    const params = [];
    if (statut) {
      query += ` WHERE c.statut = $1`;
      params.push(statut);
    }
    query += ` ORDER BY c.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Obtenir un CRIC par ID ────────────────────────────────────────────────
const getCricById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, CONCAT(c.prenom, ' ', c.nom) AS nom_complet
       FROM crics c WHERE c.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'CRIC non trouvé' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Enregistrer un nouveau CRIC ───────────────────────────────────────────
const createCric = async (req, res) => {
  try {
    const {
      nom, prenom, date_naissance, lieu_naissance, telephone, email, photo_url,
      ufr, departement, annee_etude, matricule_etudiant,
      village, batiment, numero_chambre, adresse, notes_generales
    } = req.body;

    if (!nom || !prenom)
      return res.status(400).json({ success: false, error: 'Nom et prénom obligatoires' });

    const result = await pool.query(
      `INSERT INTO crics (
        nom, prenom, date_naissance, lieu_naissance, telephone, email, photo_url,
        ufr, departement, annee_etude, matricule_etudiant,
        village, batiment, numero_chambre, adresse, notes_generales,
        statut, date_candidature, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'candidature',CURRENT_DATE,$16)
      RETURNING *`,
      [nom, prenom, date_naissance||null, lieu_naissance||null,
       telephone||null, email||null, photo_url||null,
       ufr||null, departement||null, annee_etude||null, matricule_etudiant||null,
       village||null, batiment||null, numero_chambre||null, adresse||null,
       notes_generales||null, req.user.id]
    );
    res.status(201).json({ success: true, data: result.rows[0], message: 'CRIC enregistré' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Modifier un CRIC ──────────────────────────────────────────────────────
const updateCric = async (req, res) => {
  try {
    const {
      nom, prenom, date_naissance, lieu_naissance, telephone, email, photo_url,
      ufr, departement, annee_etude, matricule_etudiant,
      village, batiment, numero_chambre, adresse, notes_generales
    } = req.body;

    const result = await pool.query(
      `UPDATE crics SET
        nom=$1, prenom=$2, date_naissance=$3, lieu_naissance=$4,
        telephone=$5, email=$6, photo_url=$7,
        ufr=$8, departement=$9, annee_etude=$10, matricule_etudiant=$11,
        village=$12, batiment=$13, numero_chambre=$14, adresse=$15,
        notes_generales=$16, updated_by=$17, updated_at=NOW()
       WHERE id=$18 RETURNING *`,
      [nom, prenom, date_naissance||null, lieu_naissance||null,
       telephone||null, email||null, photo_url||null,
       ufr||null, departement||null, annee_etude||null, matricule_etudiant||null,
       village||null, batiment||null, numero_chambre||null, adresse||null,
       notes_generales||null, req.user.id, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'CRIC non trouvé' });
    res.json({ success: true, data: result.rows[0], message: 'CRIC mis à jour' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Avancer le statut d'un CRIC ───────────────────────────────────────────
const updateStatut = async (req, res) => {
  try {
    const { statut, date_entretien, resultat_entretien, notes_entretien,
            date_visite_medicale, avis_medical, notes_medicales,
            decision_instructeur, date_integration, date_serment } = req.body;

    const statutsValides = ['candidature','entretien_planifié','confirmé',
      'visite_médicale','apte','inapte','intégration','serment','refusé'];
    if (!statutsValides.includes(statut))
      return res.status(400).json({ success: false, error: 'Statut invalide' });

    const result = await pool.query(
      `UPDATE crics SET
        statut=$1,
        date_entretien=COALESCE($2, date_entretien),
        resultat_entretien=COALESCE($3, resultat_entretien),
        notes_entretien=COALESCE($4, notes_entretien),
        date_visite_medicale=COALESCE($5, date_visite_medicale),
        avis_medical=COALESCE($6, avis_medical),
        notes_medicales=COALESCE($7, notes_medicales),
        decision_instructeur=COALESCE($8, decision_instructeur),
        date_integration=COALESCE($9, date_integration),
        date_serment=COALESCE($10, date_serment),
        updated_by=$11, updated_at=NOW()
       WHERE id=$12 RETURNING *`,
      [statut,
       date_entretien||null, resultat_entretien||null, notes_entretien||null,
       date_visite_medicale||null, avis_medical||null, notes_medicales||null,
       decision_instructeur||null, date_integration||null, date_serment||null,
       req.user.id, req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'CRIC non trouvé' });
    res.json({ success: true, data: result.rows[0], message: `Statut mis à jour : ${statut}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Convertir un CRIC en soldat (après serment) ───────────────────────────
const convertToSoldier = async (req, res) => {
  const client = pool;
  try {
    await client.query('BEGIN');

    // Récupérer le CRIC
    const cricResult = await client.query('SELECT * FROM crics WHERE id=$1', [req.params.id]);
    if (cricResult.rows.length === 0)
      throw new Error('CRIC non trouvé');

    const cric = cricResult.rows[0];
    if (!['serment','intégration'].includes(cric.statut))
      throw new Error('Le CRIC doit être au stade serment ou intégration');

    const { grade, promotion, date_integration, unite } = req.body;
    if (!promotion) throw new Error('La promotion est obligatoire');

    // Générer le matricule via la fonction PostgreSQL (même formule que les soldats)
    const dateIntegration = date_integration || cric.date_serment || new Date().toISOString().split('T')[0];
    const matriculeResult = await client.query(
      'SELECT generer_matricule($1::DATE, $2, $3) as matricule',
      [dateIntegration, promotion, cric.matricule_etudiant || '']
    );
    const matricule = matriculeResult.rows[0].matricule;

    // Créer le soldat
    const soldierResult = await client.query(
      `INSERT INTO soldiers (
        nom, prenom, grade, promotion, matricule,
        date_integration, date_naissance, lieu_naissance,
        telephone, email, photo_url,
        ufr, departement, annee_etude, matricule_etudiant,
        village, batiment, numero_chambre,
        statut, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'actif',$19)
      RETURNING *`,
      [cric.nom, cric.prenom, grade||'Soldat', promotion, matricule,
       date_integration||cric.date_serment, cric.date_naissance, cric.lieu_naissance,
       cric.telephone ? cric.telephone.replace(/[^0-9+]/g, '').slice(0,20) : null, cric.email, cric.photo_url,
       cric.ufr, cric.departement, cric.annee_etude, cric.matricule_etudiant,
       cric.village, cric.batiment, cric.numero_chambre,
       req.user.id]
    );

    // Marquer le CRIC comme converti
    await client.query(
      `UPDATE crics SET statut='converti', updated_by=$1, updated_at=NOW() WHERE id=$2`,
      [req.user.id, req.params.id]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      data: { soldier: soldierResult.rows[0] },
      message: `${cric.prenom} ${cric.nom} est maintenant soldat avec le matricule ${matricule} !`
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ success: false, error: err.message });
  } finally {
    
  }
};

// ── Statistiques CRICs ────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE statut='candidature')       AS candidatures,
        COUNT(*) FILTER (WHERE statut='entretien_planifié') AS entretiens_planifies,
        COUNT(*) FILTER (WHERE statut='confirmé')          AS confirmes,
        COUNT(*) FILTER (WHERE statut='visite_médicale')   AS visites_medicales,
        COUNT(*) FILTER (WHERE statut='apte')              AS aptes,
        COUNT(*) FILTER (WHERE statut='inapte')            AS inaptes,
        COUNT(*) FILTER (WHERE statut='intégration')       AS en_integration,
        COUNT(*) FILTER (WHERE statut='serment')           AS serment,
        COUNT(*) FILTER (WHERE statut='refusé')            AS refuses,
        COUNT(*)                                           AS total
      FROM crics
    `);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ── Supprimer un CRIC ─────────────────────────────────────────────────────
const deleteCric = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM crics WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, error: 'CRIC non trouvé' });
    res.json({ success: true, message: 'CRIC supprimé' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  getAllCrics, getCricById, createCric, updateCric,
  updateStatut, convertToSoldier, getStats, deleteCric
};
