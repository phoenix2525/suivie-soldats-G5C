const { query } = require('../config/database');

// ── Créer une évaluation médicale (soldat ou CRIC) ──────────────────────────
const ajouterAptitude = async (req, res) => {
  try {
    const {
      soldier_id, cric_id,
      date_visite, aptitude_generale,
      groupe_sanguin,
      poids_kg, taille_cm, tension_arterielle, frequence_cardiaque, pouls,
      etat_sante_general,
      restriction_course, restriction_port_charge,
      restriction_station_debout_prolongee, restriction_ceremonies,
      autres_restrictions,
      pathologies_actuelles, blessures_en_cours, traitements_en_cours,
      visite_urgente_requise,
      observations, recommandations,
      medecin_nom, medecin_signature,
    } = req.body;

    if (!date_visite || !aptitude_generale) {
      return res.status(400).json({ success: false, error: 'Date de visite et aptitude sont obligatoires' });
    }
    if (!soldier_id && !cric_id) {
      return res.status(400).json({ success: false, error: 'Un patient (soldat ou CRIC) est requis' });
    }

    // Désactiver l'ancienne évaluation valide
    if (soldier_id) {
      await query(`UPDATE aptitudes_medicales SET est_valide = false WHERE soldier_id = $1 AND est_valide = true`, [soldier_id]);
      // Mettre à jour groupe sanguin sur le soldat si fourni
      if (groupe_sanguin) {
        await query(`UPDATE soldiers SET groupe_sanguin = $1 WHERE id = $2`, [groupe_sanguin, soldier_id]);
      }
    }
    if (cric_id) {
      await query(`UPDATE aptitudes_medicales SET est_valide = false WHERE cric_id = $1 AND est_valide = true`, [cric_id]);
    }

    const result = await query(
      `INSERT INTO aptitudes_medicales (
        soldier_id, cric_id, date_visite, aptitude_generale,
        groupe_sanguin, poids_kg, taille_cm, tension_arterielle, frequence_cardiaque, pouls,
        etat_sante_general,
        restriction_course, restriction_port_charge, restriction_station_debout_prolongee, restriction_ceremonies,
        autres_restrictions, pathologies_actuelles, blessures_en_cours, traitements_en_cours,
        visite_urgente_requise, observations, recommandations,
        medecin_nom, medecin_signature, medecin_user_id, est_valide
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,true
      ) RETURNING *`,
      [
        soldier_id||null, cric_id||null, date_visite, aptitude_generale,
        groupe_sanguin||null, poids_kg||null, taille_cm||null,
        tension_arterielle||null, frequence_cardiaque||null, pouls||null,
        etat_sante_general||null,
        restriction_course||false, restriction_port_charge||false,
        restriction_station_debout_prolongee||false, restriction_ceremonies||false,
        autres_restrictions||null, pathologies_actuelles||null,
        blessures_en_cours||null, traitements_en_cours||null,
        visite_urgente_requise||false, observations||null, recommandations||null,
        medecin_nom||null, medecin_signature||null, req.user.id
      ]
    );

    // Nom du patient pour le message
    let patientNom = 'Patient';
    if (soldier_id) {
      const s = await query('SELECT prenom, nom FROM soldiers WHERE id=$1', [soldier_id]);
      if (s.rows[0]) patientNom = `${s.rows[0].prenom} ${s.rows[0].nom}`;
    } else if (cric_id) {
      const c = await query('SELECT prenom, nom FROM crics WHERE id=$1', [cric_id]);
      if (c.rows[0]) patientNom = `${c.rows[0].prenom} ${c.rows[0].nom} (CRIC)`;
    }

    res.status(201).json({
      success: true,
      message: `Évaluation médicale enregistrée pour ${patientNom}`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erreur ajout aptitude:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Inaptes et restrictions (soldats) ────────────────────────────────────────
const getInaptes = async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*, s.prenom, s.nom, s.matricule, s.grade, s.photo_url, s.promotion, s.ufr,
             'soldat' as type_patient
      FROM aptitudes_medicales a
      JOIN soldiers s ON a.soldier_id = s.id
      WHERE a.est_valide = true AND a.aptitude_generale != 'apte'
      ORDER BY a.date_visite DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Toutes les évaluations (soldats + CRICs) ─────────────────────────────────
const getAllAptitudes = async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*, 
             s.prenom, s.nom, s.matricule, s.grade, s.photo_url, s.promotion, s.ufr,
             'soldat' as type_patient
      FROM aptitudes_medicales a
      JOIN soldiers s ON a.soldier_id = s.id
      WHERE a.est_valide = true
      UNION ALL
      SELECT a.*,
             c.prenom, c.nom, c.matricule_etudiant as matricule, 'CRIC' as grade, c.photo_url, null as promotion, c.ufr,
             'cric' as type_patient
      FROM aptitudes_medicales a
      JOIN crics c ON a.cric_id = c.id
      WHERE a.est_valide = true
      ORDER BY date_visite DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Visites en retard (> 6 mois sans visite) ─────────────────────────────────
const getRetard = async (req, res) => {
  try {
    const result = await query(`
      SELECT s.id, s.prenom, s.nom, s.matricule, s.grade, s.photo_url, s.promotion, s.ufr,
             a.date_visite, a.aptitude_generale,
             EXTRACT(DAY FROM NOW() - a.date_visite)::int as jours_depuis_visite,
             'soldat' as type_patient
      FROM soldiers s
      LEFT JOIN aptitudes_medicales a ON a.soldier_id = s.id AND a.est_valide = true
      WHERE s.statut = 'actif'
        AND (a.date_visite IS NULL OR a.date_visite < NOW() - INTERVAL '6 months')
      ORDER BY a.date_visite ASC NULLS FIRST
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Aptitude actuelle d'un soldat ────────────────────────────────────────────
const getAptitudeActuelle = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.* FROM aptitudes_medicales a
       WHERE a.soldier_id = $1 AND a.est_valide = true
       ORDER BY a.date_visite DESC LIMIT 1`,
      [id]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Historique médical d'un soldat ───────────────────────────────────────────
const getHistoriqueMedical = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT a.* FROM aptitudes_medicales a
       WHERE a.soldier_id = $1
       ORDER BY a.date_visite DESC`,
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── Stats médicales ──────────────────────────────────────────────────────────
const getStatsMedicales = async (req, res) => {
  try {
    const stats = await query(`
      SELECT 
        COUNT(DISTINCT soldier_id) FILTER (WHERE est_valide = true) as soldats_evalues,
        COUNT(*) FILTER (WHERE est_valide = true AND aptitude_generale = 'apte') as aptes,
        COUNT(*) FILTER (WHERE est_valide = true AND aptitude_generale = 'apte_avec_restrictions') as avec_restrictions,
        COUNT(*) FILTER (WHERE est_valide = true AND aptitude_generale = 'inapte_temporaire') as inaptes_temp,
        COUNT(*) FILTER (WHERE est_valide = true AND aptitude_generale = 'inapte_definitif') as inaptes_def,
        COUNT(*) FILTER (WHERE est_valide = true AND visite_urgente_requise = true) as urgences
      FROM aptitudes_medicales
    `);
    res.json({ success: true, data: stats.rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  ajouterAptitude,
  getInaptes,
  getAllAptitudes,
  getRetard,
  getAptitudeActuelle,
  getHistoriqueMedical,
  getStatsMedicales,
};

// ── Modifier une évaluation ──────────────────────────────────────────────────
const modifierAptitude = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date_visite, aptitude_generale, groupe_sanguin,
      poids_kg, taille_cm, tension_arterielle, frequence_cardiaque, pouls,
      etat_sante_general,
      restriction_course, restriction_port_charge,
      restriction_station_debout_prolongee, restriction_ceremonies,
      autres_restrictions, pathologies_actuelles, blessures_en_cours,
      traitements_en_cours, visite_urgente_requise,
      observations, recommandations, medecin_nom, medecin_signature,
    } = req.body;

    const result = await query(
      `UPDATE aptitudes_medicales SET
        date_visite=$1, aptitude_generale=$2, groupe_sanguin=$3,
        poids_kg=$4, taille_cm=$5, tension_arterielle=$6,
        frequence_cardiaque=$7, pouls=$8, etat_sante_general=$9,
        restriction_course=$10, restriction_port_charge=$11,
        restriction_station_debout_prolongee=$12, restriction_ceremonies=$13,
        autres_restrictions=$14, pathologies_actuelles=$15,
        blessures_en_cours=$16, traitements_en_cours=$17,
        visite_urgente_requise=$18, observations=$19,
        recommandations=$20, medecin_nom=$21, medecin_signature=$22
      WHERE id=$23 RETURNING *`,
      [
        date_visite, aptitude_generale, groupe_sanguin||null,
        poids_kg||null, taille_cm||null, tension_arterielle||null,
        frequence_cardiaque||null, pouls||null, etat_sante_general||null,
        restriction_course||false, restriction_port_charge||false,
        restriction_station_debout_prolongee||false, restriction_ceremonies||false,
        autres_restrictions||null, pathologies_actuelles||null,
        blessures_en_cours||null, traitements_en_cours||null,
        visite_urgente_requise||false, observations||null,
        recommandations||null, medecin_nom||null, medecin_signature||null,
        id
      ]
    );

    // Mettre à jour groupe sanguin sur le soldat si fourni
    if (groupe_sanguin && result.rows[0]?.soldier_id) {
      await query(`UPDATE soldiers SET groupe_sanguin=$1 WHERE id=$2`, [groupe_sanguin, result.rows[0].soldier_id]);
    }

    res.json({ success: true, data: result.rows[0] });
  } catch(e) {
    console.error('Erreur modifierAptitude:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── Supprimer une évaluation ─────────────────────────────────────────────────
const supprimerAptitude = async (req, res) => {
  try {
    const { id } = req.params;
    // Récupérer le patient avant suppression
    const apt = await query('SELECT * FROM aptitudes_medicales WHERE id=$1', [id]);
    if (!apt.rows[0]) return res.status(404).json({ success: false, error: 'Évaluation non trouvée' });

    await query('DELETE FROM aptitudes_medicales WHERE id=$1', [id]);

    // Si c'était la valide, remettre la plus récente comme valide
    const { soldier_id, cric_id } = apt.rows[0];
    if (soldier_id) {
      await query(`
        UPDATE aptitudes_medicales SET est_valide=true
        WHERE id = (SELECT id FROM aptitudes_medicales WHERE soldier_id=$1 ORDER BY date_visite DESC LIMIT 1)
      `, [soldier_id]);
    } else if (cric_id) {
      await query(`
        UPDATE aptitudes_medicales SET est_valide=true
        WHERE id = (SELECT id FROM aptitudes_medicales WHERE cric_id=$1 ORDER BY date_visite DESC LIMIT 1)
      `, [cric_id]);
    }

    res.json({ success: true, message: 'Évaluation supprimée' });
  } catch(e) {
    console.error('Erreur supprimerAptitude:', e);
    res.status(500).json({ success: false, error: e.message });
  }
};

// ── Détail d'une évaluation ──────────────────────────────────────────────────
const getAptitudeDetail = async (req, res) => {
  try {
    const result = await query(`
      SELECT a.*,
        s.prenom, s.nom, s.grade, s.matricule, s.photo_url, s.promotion, s.ufr,
        s.telephone, s.date_naissance, 'soldat' as type_patient
      FROM aptitudes_medicales a
      LEFT JOIN soldiers s ON a.soldier_id = s.id
      WHERE a.id = $1
    `, [req.params.id]);

    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Non trouvée' });
    res.json({ success: true, data: result.rows[0] });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
};

module.exports = {
  ajouterAptitude, getInaptes, getAllAptitudes, getRetard,
  getAptitudeActuelle, getHistoriqueMedical, getStatsMedicales,
  modifierAptitude, supprimerAptitude, getAptitudeDetail,
};
