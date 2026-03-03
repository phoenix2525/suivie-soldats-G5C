const { query } = require('../config/database');

// ── Dashboard ─────────────────────────────────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const [stats, formations, certifs, equipe, classement] = await Promise.all([
      query(`
        SELECT
          (SELECT COUNT(*) FROM soldiers WHERE statut='actif') as total_soldats,
          (SELECT COUNT(*) FROM crics) as total_crics,
          (SELECT COUNT(*) FROM formations) as total_formations,
          (SELECT COUNT(*) FROM formations WHERE statut='validee') as formations_validees,
          (SELECT COUNT(*) FROM formations WHERE certificat_obtenu=true) as certifications,
          (SELECT COUNT(*) FROM fiches_academiques) as total_fiches,
          (SELECT ROUND(AVG(moyenne_annuelle),2) FROM fiches_academiques WHERE moyenne_annuelle IS NOT NULL) as moyenne_generale
      `),
      query(`
        SELECT f.*, s.prenom, s.nom, s.grade, s.photo_url
        FROM formations f JOIN soldiers s ON f.soldier_id=s.id
        ORDER BY f.created_at DESC LIMIT 10
      `),
      query(`
        SELECT f.*, s.prenom, s.nom, s.grade, s.photo_url
        FROM formations f JOIN soldiers s ON f.soldier_id=s.id
        WHERE f.certificat_obtenu=true ORDER BY f.date_fin DESC LIMIT 8
      `),
      query(`
        SELECT id,prenom,nom,grade,matricule,photo_url,fonction
        FROM soldiers WHERE statut='actif' AND section_affectation ILIKE '%DCSP%'
        ORDER BY CASE WHEN fonction ILIKE '%directeur%' THEN 1 WHEN fonction ILIKE '%responsable%' THEN 2 ELSE 3 END, nom
      `),
      query(`
        SELECT ge.palier, ge.score_total, ge.victoires, ge.defaites, ge.nuls,
               s.prenom as cap_prenom, s.nom as cap_nom
        FROM genie_equipes ge
        LEFT JOIN soldiers s ON ge.capitaine_id=s.id
        JOIN genie_tournois gt ON ge.tournoi_id=gt.id
        WHERE gt.statut='en_cours' OR gt.statut='termine'
        ORDER BY ge.score_total DESC LIMIT 4
      `),
    ]);
    res.json({ success:true, data:{ stats:stats.rows[0], formations:formations.rows, certifications:certifs.rows, equipe:equipe.rows, classement:classement.rows } });
  } catch(e) { console.error(e); res.status(500).json({ success:false, message:e.message }); }
};

// ── Formations ────────────────────────────────────────────────────────────────
const getFormations = async (req, res) => {
  try {
    const r = await query(`
      SELECT f.*, s.prenom, s.nom, s.grade, s.matricule, s.photo_url,
             c.prenom as cric_prenom, c.nom as cric_nom
      FROM formations f
      LEFT JOIN soldiers s ON f.soldier_id=s.id
      LEFT JOIN crics c ON f.cric_id=c.id
      ORDER BY f.created_at DESC
    `);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const creerFormation = async (req, res) => {
  try {
    const { soldier_id,cric_id,intitule,type_formation,domaine,description,date_debut,date_fin,duree_heures,statut,note_finale,note_sur,appreciation,certifiante,certificat_obtenu,numero_certificat,organisme,formateur,lieu } = req.body;
    if (!intitule||!date_debut) return res.status(400).json({ success:false, message:'Intitulé et date requis' });
    if (!soldier_id&&!cric_id) return res.status(400).json({ success:false, message:'Soldat ou CRIC requis' });
    const r = await query(
      `INSERT INTO formations (soldier_id,cric_id,intitule,type_formation,domaine,description,date_debut,date_fin,duree_heures,statut,note_finale,note_sur,appreciation,certifiante,certificat_obtenu,numero_certificat,organisme,formateur,lieu,enregistre_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [soldier_id||null,cric_id||null,intitule,type_formation||'autre',domaine||null,description||null,date_debut,date_fin||null,duree_heures||null,statut||'en_cours',note_finale||null,note_sur||20,appreciation||null,certifiante||false,certificat_obtenu||false,numero_certificat||null,organisme||null,formateur||null,lieu||null,req.user.id]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const modifierFormation = async (req, res) => {
  try {
    const { intitule,type_formation,domaine,description,date_debut,date_fin,duree_heures,statut,note_finale,note_sur,appreciation,certifiante,certificat_obtenu,numero_certificat,organisme,formateur,lieu } = req.body;
    const r = await query(
      `UPDATE formations SET intitule=$1,type_formation=$2,domaine=$3,description=$4,date_debut=$5,date_fin=$6,duree_heures=$7,statut=$8,note_finale=$9,note_sur=$10,appreciation=$11,certifiante=$12,certificat_obtenu=$13,numero_certificat=$14,organisme=$15,formateur=$16,lieu=$17,updated_at=NOW() WHERE id=$18 RETURNING *`,
      [intitule,type_formation||'autre',domaine||null,description||null,date_debut,date_fin||null,duree_heures||null,statut||'en_cours',note_finale||null,note_sur||20,appreciation||null,certifiante||false,certificat_obtenu||false,numero_certificat||null,organisme||null,formateur||null,lieu||null,req.params.id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const supprimerFormation = async (req, res) => {
  try { await query('DELETE FROM formations WHERE id=$1',[req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── Fiches académiques ────────────────────────────────────────────────────────
const getFiches = async (req, res) => {
  try {
    const r = await query(`
      SELECT fa.id, fa.soldier_id, fa.cric_id, fa.annee_academique, fa.moyenne_annuelle,
             fa.mention, fa.statut, fa.observations, fa.created_at, fa.updated_at,
             fa.releve_notes IS NOT NULL as has_releve,
             fa.attestation IS NOT NULL as has_attestation,
             s.prenom, s.nom, s.grade, s.matricule, s.photo_url, s.ufr,
             c.prenom as cric_prenom, c.nom as cric_nom, c.matricule_etudiant as cric_matricule
      FROM fiches_academiques fa
      LEFT JOIN soldiers s ON fa.soldier_id=s.id
      LEFT JOIN crics c ON fa.cric_id=c.id
      ORDER BY fa.annee_academique DESC, fa.created_at DESC
    `);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const getFichePDF = async (req, res) => {
  try {
    const { id, type } = req.params;
    const col = type === 'releve' ? 'releve_notes' : 'attestation';
    const r = await query(`SELECT ${col} as data FROM fiches_academiques WHERE id=$1`, [id]);
    if (!r.rows[0]?.data) return res.status(404).json({ success:false, message:'Document non trouvé' });
    res.json({ success:true, data: r.rows[0].data });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const creerFiche = async (req, res) => {
  try {
    const { soldier_id,cric_id,annee_academique,moyenne_annuelle,mention,statut,releve_notes,attestation,observations } = req.body;
    if (!annee_academique) return res.status(400).json({ success:false, message:'Année académique requise' });
    if (!soldier_id&&!cric_id) return res.status(400).json({ success:false, message:'Soldat ou CRIC requis' });
    const r = await query(
      `INSERT INTO fiches_academiques (soldier_id,cric_id,annee_academique,moyenne_annuelle,mention,statut,releve_notes,attestation,observations,enregistre_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (soldier_id,annee_academique) DO UPDATE SET moyenne_annuelle=$4,mention=$5,statut=$6,releve_notes=COALESCE($7,fiches_academiques.releve_notes),attestation=COALESCE($8,fiches_academiques.attestation),observations=$9,updated_at=NOW()
       RETURNING id,soldier_id,cric_id,annee_academique,moyenne_annuelle,mention,statut,observations`,
      [soldier_id||null,cric_id||null,annee_academique,moyenne_annuelle||null,mention||null,statut||'en_cours',releve_notes||null,attestation||null,observations||null,req.user.id]
    );
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const supprimerFiche = async (req, res) => {
  try { await query('DELETE FROM fiches_academiques WHERE id=$1',[req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

// ── Génie en herbe ────────────────────────────────────────────────────────────
const PALIERS = ['Infanterie','Artillerie','Marine','Air'];

const getTournois = async (req, res) => {
  try {
    const tournois = await query(`SELECT * FROM genie_tournois ORDER BY created_at DESC`);
    const equipes  = await query(`
      SELECT ge.*, s.prenom as cap_prenom, s.nom as cap_nom, s.photo_url as cap_photo,
             COUNT(gm.id) as nb_membres
      FROM genie_equipes ge
      LEFT JOIN soldiers s ON ge.capitaine_id=s.id
      LEFT JOIN genie_membres gm ON gm.equipe_id=ge.id
      GROUP BY ge.id, s.prenom, s.nom, s.photo_url
      ORDER BY ge.score_total DESC
    `);
    const matchs = await query(`
      SELECT gma.*, e1.palier as palier1, e2.palier as palier2
      FROM genie_matchs gma
      JOIN genie_equipes e1 ON gma.equipe1_id=e1.id
      JOIN genie_equipes e2 ON gma.equipe2_id=e2.id
      ORDER BY gma.date_match DESC, gma.created_at DESC
    `);
    res.json({ success:true, data:{ tournois:tournois.rows, equipes:equipes.rows, matchs:matchs.rows } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const creerTournoi = async (req, res) => {
  try {
    const { titre,annee,description,date_debut,date_fin } = req.body;
    if (!titre) return res.status(400).json({ success:false, message:'Titre requis' });
    const t = await query(
      `INSERT INTO genie_tournois (titre,annee,description,date_debut,date_fin) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [titre,annee||new Date().getFullYear(),description||null,date_debut||null,date_fin||null]
    );
    // Créer automatiquement les 4 équipes palier
    for (const palier of PALIERS) {
      await query(`INSERT INTO genie_equipes (tournoi_id,palier) VALUES ($1,$2)`,[t.rows[0].id,palier]);
    }
    res.status(201).json({ success:true, data:t.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const majStatutTournoi = async (req, res) => {
  try {
    const r = await query(`UPDATE genie_tournois SET statut=$1 WHERE id=$2 RETURNING *`,[req.body.statut,req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const supprimerTournoi = async (req, res) => {
  try { await query('DELETE FROM genie_tournois WHERE id=$1',[req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const majEquipe = async (req, res) => {
  try {
    const { capitaine_id } = req.body;
    const r = await query(`UPDATE genie_equipes SET capitaine_id=$1 WHERE id=$2 RETURNING *`,[capitaine_id||null,req.params.id]);
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const ajouterMembre = async (req, res) => {
  try {
    const { soldier_id,role } = req.body;
    const r = await query(`INSERT INTO genie_membres (equipe_id,soldier_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *`,[req.params.id,soldier_id,role||'membre']);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const retirerMembre = async (req, res) => {
  try { await query('DELETE FROM genie_membres WHERE equipe_id=$1 AND soldier_id=$2',[req.params.id,req.params.soldier_id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const getMembres = async (req, res) => {
  try {
    const r = await query(`
      SELECT gm.*, s.prenom, s.nom, s.grade, s.matricule, s.photo_url
      FROM genie_membres gm JOIN soldiers s ON gm.soldier_id=s.id
      WHERE gm.equipe_id=$1 ORDER BY gm.role, s.nom
    `,[req.params.id]);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const enregistrerMatch = async (req, res) => {
  try {
    const { tournoi_id,equipe1_id,equipe2_id,score1,score2,phase,date_match,lieu,statut,observations } = req.body;
    if (!equipe1_id||!equipe2_id) return res.status(400).json({ success:false, message:'Les deux équipes requises' });

    const r = await query(
      `INSERT INTO genie_matchs (tournoi_id,equipe1_id,equipe2_id,score1,score2,phase,date_match,lieu,statut,observations)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [tournoi_id,equipe1_id,equipe2_id,score1||0,score2||0,phase||'poule',date_match||null,lieu||null,statut||'joue',observations||null]
    );

    // Mettre à jour les stats des équipes si match joué
    if ((statut||'joue') === 'joue') {
      const s1=parseInt(score1||0), s2=parseInt(score2||0);
      if (s1>s2) {
        await query(`UPDATE genie_equipes SET score_total=score_total+$1, victoires=victoires+1 WHERE id=$2`,[s1,equipe1_id]);
        await query(`UPDATE genie_equipes SET score_total=score_total+$1, defaites=defaites+1  WHERE id=$2`,[s2,equipe2_id]);
      } else if (s2>s1) {
        await query(`UPDATE genie_equipes SET score_total=score_total+$1, defaites=defaites+1  WHERE id=$2`,[s1,equipe1_id]);
        await query(`UPDATE genie_equipes SET score_total=score_total+$1, victoires=victoires+1 WHERE id=$2`,[s2,equipe2_id]);
      } else {
        await query(`UPDATE genie_equipes SET score_total=score_total+$1, nuls=nuls+1 WHERE id=$2`,[s1,equipe1_id]);
        await query(`UPDATE genie_equipes SET score_total=score_total+$1, nuls=nuls+1 WHERE id=$2`,[s2,equipe2_id]);
      }
    }
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const supprimerMatch = async (req, res) => {
  try { await query('DELETE FROM genie_matchs WHERE id=$1',[req.params.id]); res.json({ success:true }); }
  catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

const getProfilAcademique = async (req, res) => {
  try {
    const { id } = req.params;
    const [soldat,formations,fiches] = await Promise.all([
      query('SELECT * FROM soldiers WHERE id=$1',[id]),
      query('SELECT * FROM formations WHERE soldier_id=$1 ORDER BY date_debut DESC',[id]),
      query('SELECT id,annee_academique,moyenne_annuelle,mention,statut,observations,has_releve,has_attestation FROM (SELECT *, releve_notes IS NOT NULL as has_releve, attestation IS NOT NULL as has_attestation FROM fiches_academiques WHERE soldier_id=$1) t ORDER BY annee_academique DESC',[id]),
    ]);
    res.json({ success:true, data:{ soldat:soldat.rows[0], formations:formations.rows, fiches:fiches.rows } });
  } catch(e) { res.status(500).json({ success:false, message:e.message }); }
};

module.exports = {
  getDashboard, getFormations, creerFormation, modifierFormation, supprimerFormation,
  getFiches, getFichePDF, creerFiche, supprimerFiche,
  getTournois, creerTournoi, majStatutTournoi, supprimerTournoi,
  majEquipe, ajouterMembre, retirerMembre, getMembres,
  enregistrerMatch, supprimerMatch, getProfilAcademique,
};
