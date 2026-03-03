const { query } = require('../config/database');

// ── Dashboard ─────────────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [stats, budgets, demandes, equipe] = await Promise.all([

      query(`
        SELECT
          (SELECT COUNT(*) FROM demandes_sociales) as total_demandes,
          (SELECT COUNT(*) FROM demandes_sociales WHERE statut='en_attente') as en_attente,
          (SELECT COUNT(*) FROM demandes_sociales WHERE statut='approuvee') as approuvees,
          (SELECT COUNT(*) FROM demandes_sociales WHERE statut='rejetee') as rejetees,
          (SELECT COUNT(*) FROM demandes_sociales WHERE priorite='urgente' AND statut='en_attente') as urgentes,
          (SELECT COALESCE(SUM(montant_accorde),0) FROM demandes_sociales WHERE statut='approuvee') as total_accorde,
          (SELECT COALESCE(SUM(montant_total),0) FROM budgets WHERE statut='actif') as budget_total,
          (SELECT COALESCE(SUM(montant_disponible),0) FROM budgets WHERE statut='actif') as budget_disponible
      `),

      query(`
        SELECT b.*,
          COUNT(d.id) as nb_demandes,
          ROUND((b.montant_depense / NULLIF(b.montant_total,0) * 100)::numeric, 1) as taux_utilisation
        FROM budgets b
        LEFT JOIN demandes_sociales d ON d.budget_id = b.id
        GROUP BY b.id
        ORDER BY b.created_at DESC
        LIMIT 5
      `),

      query(`
        SELECT ds.*,
          s.prenom, s.nom, s.grade, s.matricule, s.photo_url,
          c.prenom as c_prenom, c.nom as c_nom,
          b.titre as budget_titre
        FROM demandes_sociales ds
        LEFT JOIN soldiers s ON ds.soldier_id = s.id
        LEFT JOIN crics c ON ds.cric_id = c.id
        LEFT JOIN budgets b ON ds.budget_id = b.id
        ORDER BY
          CASE ds.priorite WHEN 'urgente' THEN 1 WHEN 'haute' THEN 2 ELSE 3 END,
          ds.created_at DESC
        LIMIT 20
      `),

      query(`
        SELECT id, prenom, nom, grade, matricule, photo_url, fonction
        FROM soldiers
        WHERE statut='actif' AND section_affectation ILIKE '%DASB%'
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
        budgets: budgets.rows,
        demandes: demandes.rows,
        equipe: equipe.rows,
      }
    });
  } catch(e) {
    console.error('DASB dashboard error:', e);
    res.status(500).json({ success: false, message: e.message });
  }
};

// ── CRUD Budgets ──────────────────────────────────────────────────────────────
const creerBudget = async (req, res) => {
  try {
    const { titre, periode, montant_total, description } = req.body;
    if (!titre || !montant_total) return res.status(400).json({ success: false, message: 'Titre et montant requis' });
    const r = await query(
      `INSERT INTO budgets (titre, periode, montant_total, montant_disponible, description, created_by)
       VALUES ($1,$2,$3,$3,$4,$5) RETURNING *`,
      [titre, periode||new Date().getFullYear().toString(), parseFloat(montant_total), description||null, req.user.id]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const modifierBudget = async (req, res) => {
  try {
    const { titre, periode, montant_total, statut, description } = req.body;
    const r = await query(
      `UPDATE budgets SET titre=$1, periode=$2, montant_total=$3, statut=$4, description=$5 WHERE id=$6 RETURNING *`,
      [titre, periode, parseFloat(montant_total), statut, description||null, req.params.id]
    );
    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const supprimerBudget = async (req, res) => {
  try {
    await query('DELETE FROM budgets WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── CRUD Demandes ─────────────────────────────────────────────────────────────
const creerDemande = async (req, res) => {
  try {
    const { soldier_id, cric_id, budget_id, type_aide, motif, montant_demande, priorite, date_demande } = req.body;
    if (!type_aide || !motif || (!soldier_id && !cric_id))
      return res.status(400).json({ success: false, message: 'Type, motif et demandeur requis' });
    const r = await query(
      `INSERT INTO demandes_sociales (soldier_id, cric_id, budget_id, type_aide, motif, montant_demande, priorite, date_demande)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [soldier_id||null, cric_id||null, budget_id||null, type_aide, motif,
       montant_demande||null, priorite||'normale', date_demande||new Date().toISOString().slice(0,10)]
    );
    res.status(201).json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const traiterDemande = async (req, res) => {
  try {
    const { statut, montant_accorde, observations } = req.body;
    const { id } = req.params;

    const r = await query(
      `UPDATE demandes_sociales SET statut=$1, montant_accorde=$2, observations=$3,
       date_traitement=CURRENT_DATE, traite_par=$4 WHERE id=$5 RETURNING *`,
      [statut, montant_accorde||null, observations||null, req.user.id, id]
    );

    // Si approuvée et montant accordé, mettre à jour le budget
    if (statut === 'approuvee' && montant_accorde && r.rows[0]?.budget_id) {
      await query(
        `UPDATE budgets SET
          montant_depense = montant_depense + $1,
          montant_disponible = montant_disponible - $1
         WHERE id = $2`,
        [parseFloat(montant_accorde), r.rows[0].budget_id]
      );
      // Enregistrer la dépense
      await query(
        `INSERT INTO depenses (budget_id, demande_id, libelle, montant, categorie, date_depense, created_by)
         VALUES ($1,$2,$3,$4,$5,CURRENT_DATE,$6)`,
        [r.rows[0].budget_id, id, `Aide sociale — ${r.rows[0].type_aide}`, parseFloat(montant_accorde), r.rows[0].type_aide, req.user.id]
      );
    }

    res.json({ success: true, data: r.rows[0] });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

const supprimerDemande = async (req, res) => {
  try {
    await query('DELETE FROM demandes_sociales WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── Dépenses ──────────────────────────────────────────────────────────────────
const getDepenses = async (req, res) => {
  try {
    const r = await query(`
      SELECT dep.*, b.titre as budget_titre
      FROM depenses dep
      LEFT JOIN budgets b ON dep.budget_id = b.id
      ORDER BY dep.date_depense DESC
      LIMIT 50
    `);
    res.json({ success: true, data: r.rows });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = {
  getDashboard,
  creerBudget, modifierBudget, supprimerBudget,
  creerDemande, traiterDemande, supprimerDemande,
  getDepenses,
};
