const { query } = require('../config/database');

// ── Tableau de bord santé complet ────────────────────────────────────────────
const getDashboardSante = async (req, res) => {
  try {
    const [stats, alertes, inaptes, retard, evolution, vaccins, equipe] = await Promise.all([

      // Stats globales
      query(`
        SELECT
          (SELECT COUNT(*) FROM soldiers WHERE statut='actif') as total_soldats,
          COUNT(*)        FILTER (WHERE a.est_valide AND a.aptitude_generale='apte')                  as aptes,
          COUNT(*)        FILTER (WHERE a.est_valide AND a.aptitude_generale='apte_avec_restrictions') as restrictions,
          COUNT(*)        FILTER (WHERE a.est_valide AND a.aptitude_generale='inapte_temporaire')      as inaptes_temp,
          COUNT(*)        FILTER (WHERE a.est_valide AND a.aptitude_generale='inapte_definitif')       as inaptes_def,
          COUNT(*)        FILTER (WHERE a.est_valide AND a.visite_urgente_requise=true)                as urgences,
          COUNT(DISTINCT a.soldier_id) FILTER (WHERE a.est_valide)                                    as evalues
        FROM aptitudes_medicales a
      `),

      // Alertes urgentes
      query(`
        SELECT s.id, s.prenom, s.nom, s.matricule, s.grade, s.photo_url,
               a.aptitude_generale, a.date_visite, a.visite_urgente_requise,
               a.pathologies_actuelles, a.blessures_en_cours, a.observations,
               EXTRACT(DAY FROM NOW()-a.date_visite)::int as jours
        FROM aptitudes_medicales a
        JOIN soldiers s ON a.soldier_id = s.id
        WHERE a.est_valide = true AND a.visite_urgente_requise = true
        ORDER BY a.date_visite ASC
        LIMIT 10
      `),

      // Inaptes actifs
      query(`
        SELECT s.id, s.prenom, s.nom, s.matricule, s.grade, s.photo_url,
               a.aptitude_generale, a.date_visite, a.date_prochaine_visite,
               a.pathologies_actuelles, 
               a.restriction_course, a.restriction_port_charge,
               a.restriction_ceremonies,
               EXTRACT(DAY FROM NOW()-a.date_visite)::int as jours_depuis
        FROM aptitudes_medicales a
        JOIN soldiers s ON a.soldier_id = s.id
        WHERE a.est_valide = true
          AND a.aptitude_generale IN ('inapte_temporaire','inapte_definitif','apte_avec_restrictions')
        ORDER BY a.aptitude_generale DESC, a.date_visite ASC
      `),

      // Soldats en retard de visite (> 6 mois ou jamais)
      query(`
        SELECT s.id, s.prenom, s.nom, s.matricule, s.grade, s.photo_url, s.promotion,
               a.date_visite,
               CASE WHEN a.date_visite IS NULL THEN NULL
                    ELSE EXTRACT(DAY FROM NOW()-a.date_visite)::int END as jours_retard
        FROM soldiers s
        LEFT JOIN aptitudes_medicales a ON a.soldier_id=s.id AND a.est_valide=true
        WHERE s.statut='actif'
          AND (a.date_visite IS NULL OR a.date_visite < NOW() - INTERVAL '6 months')
        ORDER BY a.date_visite ASC NULLS FIRST
        LIMIT 20
      `),

      // Évolution mensuelle aptitudes (12 derniers mois)
      query(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', date_visite), 'Mon YY') as mois,
          DATE_TRUNC('month', date_visite) as mois_date,
          COUNT(*) FILTER (WHERE aptitude_generale='apte')                   as aptes,
          COUNT(*) FILTER (WHERE aptitude_generale='apte_avec_restrictions') as restrictions,
          COUNT(*) FILTER (WHERE aptitude_generale LIKE 'inapte%')           as inaptes
        FROM aptitudes_medicales
        WHERE date_visite >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', date_visite)
        ORDER BY mois_date ASC
      `),

      // Vaccinations récentes
      query(`
        SELECT v.*, s.prenom, s.nom, s.matricule, s.grade
        FROM vaccinations v
        JOIN soldiers s ON v.soldier_id = s.id
        ORDER BY v.date_vaccin DESC
        LIMIT 15
      `),

      // Équipe médicale DSA
      query(`
        SELECT id, prenom, nom, grade, matricule, photo_url,
               fonction, section_affectation, telephone
        FROM soldiers
        WHERE statut = 'actif'
          AND section_affectation ILIKE '%DSA%'
        ORDER BY
          CASE WHEN fonction ILIKE '%chef%' THEN 1
               WHEN fonction ILIKE '%médecin%' THEN 2
               WHEN fonction ILIKE '%infirmier%' THEN 3
               ELSE 4 END, nom
      `),
    ]);

    const st = stats.rows[0];
    const nonEvalues = parseInt(st.total_soldats) - parseInt(st.evalues);

    res.json({
      success: true,
      data: {
        stats: { ...st, non_evalues: nonEvalues },
        alertes:   alertes.rows,
        inaptes:   inaptes.rows,
        retard:    retard.rows,
        evolution: evolution.rows,
        vaccins:   vaccins.rows,
        equipe:    equipe.rows,
      }
    });
  } catch (e) {
    console.error('DSA dashboard error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Ajouter un vaccin ────────────────────────────────────────────────────────
const ajouterVaccin = async (req, res) => {
  try {
    const { soldier_id, cric_id, vaccin, date_vaccin, prochain_rappel, lot, medecin, remarques } = req.body;
    if (!vaccin || (!soldier_id && !cric_id))
      return res.status(400).json({ success: false, message: 'Vaccin et patient requis' });

    const result = await query(
      `INSERT INTO vaccinations (soldier_id, cric_id, vaccin, date_vaccin, prochain_rappel, lot, medecin, remarques)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [soldier_id||null, cric_id||null, vaccin, date_vaccin||new Date(), prochain_rappel||null, lot||null, medecin||null, remarques||null]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Supprimer un vaccin ──────────────────────────────────────────────────────
const supprimerVaccin = async (req, res) => {
  try {
    await query('DELETE FROM vaccinations WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── Vaccins d'un soldat ──────────────────────────────────────────────────────
const getVaccinsSoldat = async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM vaccinations WHERE soldier_id=$1 ORDER BY date_vaccin DESC',
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getDashboardSante, ajouterVaccin, supprimerVaccin, getVaccinsSoldat };

// ── Équipe médicale (section DSA) ─────────────────────────────────────────────
const getEquipeMedicale = async (req, res) => {
  try {
    const result = await query(`
      SELECT id, prenom, nom, grade, matricule, photo_url, 
             fonction, section_affectation, telephone, email
      FROM soldiers 
      WHERE statut = 'actif' 
        AND section_affectation ILIKE '%DSA%'
      ORDER BY 
        CASE WHEN fonction ILIKE '%Médecin Chef%' THEN 1
             WHEN fonction ILIKE '%Médecin%' THEN 2
             WHEN fonction ILIKE '%Infirmier%' THEN 3
             ELSE 4 END,
        nom, prenom
    `);
    res.json({ success: true, data: result.rows });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { 
  getDashboardSante, ajouterVaccin, supprimerVaccin, getVaccinsSoldat, getEquipeMedicale 
};
