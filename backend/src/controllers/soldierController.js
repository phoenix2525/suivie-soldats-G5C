// Controller pour la gestion des soldats
const { query } = require('../config/database');

// @desc    Obtenir tous les soldats (avec filtres optionnels)
// @route   GET /api/soldiers
// @access  Private
const getSoldiers = async (req, res) => {
  try {
    // Récupération des paramètres de filtrage depuis la query string
    const { grade, promotion, statut, village, search } = req.query;
    
    // Construction dynamique de la requête SQL
    let sqlQuery = `
      SELECT 
        id, uuid, matricule, nom, prenom, nom_complet, grade, promotion, 
        unite, date_integration, statut, telephone, email, photo_url,
        ufr, departement, filiere, annee_etude, village, batiment, numero_chambre, section_affectation, fonction
      FROM soldiers 
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    // Ajouter les filtres dynamiquement
    if (grade) {
      sqlQuery += ` AND grade = $${paramCount}`;
      params.push(grade);
      paramCount++;
    }
    
    if (promotion) {
      sqlQuery += ` AND promotion = $${paramCount}`;
      params.push(promotion);
      paramCount++;
    }
    
    if (statut) {
      sqlQuery += ` AND statut = $${paramCount}`;
      params.push(statut);
      paramCount++;
    }
    
    if (village) {
      sqlQuery += ` AND village = $${paramCount}`;
      params.push(village);
      paramCount++;
    }
    
    // Recherche par nom/prénom/matricule
    if (search) {
      sqlQuery += ` AND (nom ILIKE $${paramCount} OR prenom ILIKE $${paramCount} OR matricule ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    sqlQuery += ` ORDER BY nom, prenom`;
    
    const result = await query(sqlQuery, params);
    
    res.status(200).json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
    
  } catch (error) {
    console.error('❌ Erreur getSoldiers:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};

// @desc    Obtenir un soldat par ID
// @route   GET /api/soldiers/:id
// @access  Private
const getSoldier = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Utiliser la vue pour avoir toutes les infos
    const result = await query(
      'SELECT * FROM vue_fiche_soldat WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Soldat non trouvé'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur getSoldier:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};

// @desc    Créer un nouveau soldat
// @route   POST /api/soldiers
// @access  Private (admin, officier)
const createSoldier = async (req, res) => {
  try {
    const {
      nom, prenom, alias, grade, promotion, date_integration,
      date_naissance, lieu_naissance, telephone, email, adresse,
      matricule_etudiant, ufr, departement, filiere, specialite, annee_etude, niveau_etude,
      village, batiment, numero_chambre, section_affectation, unite, photo_url, fonction, haut_commandement
    } = req.body;
    
    // Validation des champs obligatoires
    if (!nom || !prenom || !grade || !promotion || !date_integration) {
      return res.status(400).json({
        success: false,
        error: 'Nom, prénom, grade, promotion et date d\'intégration sont obligatoires'
      });
    }
    
    // Générer le matricule automatiquement
    const matriculeResult = await query(
      'SELECT generer_matricule($1::DATE, $2, $3) as matricule',
      [date_integration, promotion, matricule_etudiant||null]
    );
    
    const matricule = matriculeResult.rows[0].matricule;
    
    // Insérer le nouveau soldat
    const result = await query(
      `INSERT INTO soldiers (
        matricule, nom, prenom, alias, grade, promotion, date_integration,
        date_naissance, lieu_naissance, telephone, email, adresse,
        matricule_etudiant, ufr, departement, filiere, specialite, annee_etude, niveau_etude,
        village, batiment, numero_chambre, section_affectation, unite, photo_url, fonction, haut_commandement,
        created_by, statut
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      ) RETURNING *`,
      [
        matricule, nom, prenom, alias||null, grade, promotion, date_integration,
        date_naissance, lieu_naissance, telephone, email, adresse,
        matricule_etudiant, ufr, departement, filiere, specialite, annee_etude, niveau_etude,
        village, batiment, numero_chambre, section_affectation, fonction, unite, photo_url, fonction||null, haut_commandement||false,
        req.user.id, 'actif'
      ]
    );
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: `Soldat créé avec matricule ${matricule}`
    });
    
  } catch (error) {
    console.error('❌ Erreur createSoldier:', error);
    
    // Gestion des erreurs spécifiques
    if (error.code === '23505') { // Violation de contrainte unique
      return res.status(400).json({
        success: false,
        error: 'Ce matricule ou email existe déjà'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la création'
    });
  }
};

// @desc    Modifier un soldat
// @route   PUT /api/soldiers/:id
// @access  Private (admin, officier)
const updateSoldier = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nom, prenom, alias, grade, promotion, date_promotion_actuelle,
      date_naissance, lieu_naissance, telephone, email, adresse,
      matricule_etudiant, ufr, departement, filiere, specialite, annee_etude, niveau_etude,
      village, batiment, numero_chambre, section_affectation, unite, photo_url, fonction, haut_commandement, statut, motif_statut
    } = req.body;
    
    // Vérifier que le soldat existe
    const checkResult = await query('SELECT id FROM soldiers WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Soldat non trouvé'
      });
    }
    
    // Mise à jour
    const result = await query(
      `UPDATE soldiers SET
        nom = COALESCE($1, nom),
        prenom = COALESCE($2, prenom),
        alias = COALESCE($3, alias),
        grade = COALESCE($4, grade),
        promotion = COALESCE($5, promotion),
        date_promotion_actuelle = COALESCE($6, date_promotion_actuelle),
        date_naissance = COALESCE($7, date_naissance),
        lieu_naissance = COALESCE($8, lieu_naissance),
        telephone = COALESCE($9, telephone),
        email = COALESCE($10, email),
        adresse = COALESCE($11, adresse),
        matricule_etudiant = COALESCE($12, matricule_etudiant),
        ufr = COALESCE($13, ufr),
        departement = COALESCE($14, departement),
        filiere = COALESCE($15, filiere),
        specialite = COALESCE($16, specialite),
        annee_etude = COALESCE($17, annee_etude),
        niveau_etude = COALESCE($18, niveau_etude),
        village = COALESCE($19, village),
        batiment = COALESCE($20, batiment),
        numero_chambre = COALESCE($21, numero_chambre),
        section_affectation = COALESCE($22, section_affectation),
        unite = COALESCE($23, unite),
        photo_url = COALESCE($24, photo_url),
        fonction = COALESCE($25, fonction),
        haut_commandement = $26,
        statut = COALESCE($27, statut),
        motif_statut = COALESCE($28, motif_statut),
        updated_by = $29,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $30
      RETURNING *`,
      [
        nom, prenom, alias||null, grade, promotion, date_promotion_actuelle,
        date_naissance, lieu_naissance, telephone, email, adresse,
        matricule_etudiant, ufr, departement, filiere, specialite, annee_etude, niveau_etude,
        village, batiment, numero_chambre, section_affectation||null, unite||null,
        photo_url||null, fonction||null,
        haut_commandement === true || haut_commandement === 'true' ? true : false,
        statut, motif_statut, req.user.id, id
      ]
    );
    
    res.status(200).json({
      success: true,
      data: result.rows[0],
      message: 'Soldat mis à jour avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur updateSoldier:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la mise à jour'
    });
  }
};

// @desc    Supprimer un soldat
// @route   DELETE /api/soldiers/:id
// @access  Private (admin uniquement)
const deleteSoldier = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que le soldat existe
    const checkResult = await query('SELECT id, nom_complet FROM soldiers WHERE id = $1', [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Soldat non trouvé'
      });
    }
    
    const soldierName = checkResult.rows[0].nom_complet;
    
    // Supprimer (CASCADE supprimera aussi présences, sanctions, etc.)
    await query('DELETE FROM soldiers WHERE id = $1', [id]);
    
    res.status(200).json({
      success: true,
      message: `Soldat ${soldierName} supprimé avec succès`
    });
    
  } catch (error) {
    console.error('❌ Erreur deleteSoldier:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur lors de la suppression'
    });
  }
};

// @desc    Obtenir les statistiques des soldats
// @route   GET /api/soldiers/stats/overview
// @access  Private
const getSoldiersStats = async (req, res) => {
  try {
    // Effectif total
    const totalResult = await query(
      "SELECT COUNT(*) as total FROM soldiers WHERE statut = 'actif'"
    );
    
    // Répartition par grade
    const gradeResult = await query(
      'SELECT * FROM vue_effectif_par_grade ORDER BY effectif DESC'
    );
    
    // Répartition par promotion
    const promoResult = await query(
      "SELECT promotion, COUNT(*) as effectif FROM soldiers WHERE statut = 'actif' GROUP BY promotion ORDER BY promotion DESC"
    );
    
    // Alertes présences
    const alertesResult = await query(
      'SELECT COUNT(*) as total FROM vue_alertes_presences'
    );
    
    res.status(200).json({
      success: true,
      data: {
        effectif_total: parseInt(totalResult.rows[0].total),
        repartition_grade: gradeResult.rows,
        repartition_promotion: promoResult.rows,
        alertes_presences: parseInt(alertesResult.rows[0].total)
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getSoldiersStats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
};

module.exports = {
  getSoldiers,
  getSoldier,
  createSoldier,
  updateSoldier,
  deleteSoldier,
  getSoldiersStats
};
