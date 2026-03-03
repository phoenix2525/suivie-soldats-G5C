const pool = require('../config/database');

// ── Stats dashboard ───────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [total, mois, taux, prochain, top] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM entrainements WHERE statut != 'annule'`),
      pool.query(`SELECT COUNT(*) AS total FROM entrainements WHERE statut!='annule' AND date_trunc('month',date_seance)=date_trunc('month',NOW())`),
      pool.query(`
        SELECT ROUND(
          COUNT(ep.id) FILTER (WHERE ep.presence='present') * 100.0 / NULLIF(COUNT(ep.id),0)
        ) AS taux
        FROM entrainement_presences ep
        JOIN entrainements e ON e.id = ep.entrainement_id
        WHERE e.statut = 'termine'
      `),
      pool.query(`SELECT titre,date_seance,heure_debut,type_seance FROM entrainements WHERE statut='planifie' AND date_seance>=CURRENT_DATE ORDER BY date_seance,heure_debut LIMIT 1`),
      pool.query(`
        SELECT s.nom,s.prenom,s.photo_url,s.grade,
          COUNT(*) FILTER (WHERE ep.presence='present') AS presences,
          COUNT(*) AS total,
          ROUND(COUNT(*) FILTER (WHERE ep.presence='present')*100.0/NULLIF(COUNT(*),0)) AS taux
        FROM entrainement_presences ep
        JOIN soldiers s ON s.id=ep.soldier_id
        GROUP BY s.id,s.nom,s.prenom,s.photo_url,s.grade
        ORDER BY taux DESC LIMIT 5
      `),
    ]);
    res.json({ success:true, data:{
      total: parseInt(total.rows[0].total),
      ce_mois: parseInt(mois.rows[0].total),
      taux_presence: parseInt(taux.rows[0].taux)||0,
      prochain: prochain.rows[0]||null,
      top_presents: top.rows,
    }});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

// ── Entraînements CRUD ────────────────────────────────────────────────────
const getEntrainements = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT e.*,
        COUNT(ep.id) AS total_participants,
        COUNT(ep.id) FILTER (WHERE ep.presence='present') AS nb_presents,
        COUNT(ep.id) FILTER (WHERE ep.presence='absent')  AS nb_absents
      FROM entrainements e
      LEFT JOIN entrainement_presences ep ON ep.entrainement_id=e.id
      GROUP BY e.id
      ORDER BY e.date_seance DESC, e.heure_debut DESC
    `);
    res.json({success:true,data:r.rows});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const creerEntrainement = async (req, res) => {
  try {
    const {titre,type_seance,date_seance,heure_debut,heure_fin,lieu,description} = req.body;
    if(!titre||!type_seance||!date_seance)
      return res.status(400).json({success:false,error:'Champs obligatoires manquants'});
    const r = await pool.query(
      `INSERT INTO entrainements (titre,type_seance,date_seance,heure_debut,heure_fin,lieu,description,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [titre,type_seance,date_seance,heure_debut||null,heure_fin||null,lieu||'Terrain G5C',description||null,req.user.id]
    );
    res.status(201).json({success:true,data:r.rows[0]});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const demarrerEntrainement = async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE entrainements SET statut='en_cours' WHERE id=$1`,[req.params.id]);
      const soldiers = await client.query(`SELECT id FROM soldiers WHERE statut='actif' AND statut_campus='actif'`);
      const crics    = await client.query(`SELECT id FROM crics WHERE statut NOT IN ('refusé','inapte')`);
      for(const s of soldiers.rows)
        await client.query(`INSERT INTO entrainement_presences (entrainement_id,participant_type,soldier_id,presence,created_by) VALUES ($1,'soldier',$2,'absent',$3) ON CONFLICT DO NOTHING`,[req.params.id,s.id,req.user.id]);
      for(const c of crics.rows)
        await client.query(`INSERT INTO entrainement_presences (entrainement_id,participant_type,cric_id,presence,created_by) VALUES ($1,'cric',$2,'absent',$3) ON CONFLICT DO NOTHING`,[req.params.id,c.id,req.user.id]);
      await client.query('COMMIT');
      res.json({success:true,message:'Entraînement démarré — pointage ouvert'});
    } catch(e){ await client.query('ROLLBACK'); throw e; }
    finally{ client.release(); }
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const terminerEntrainement = async (req, res) => {
  try {
    await pool.query(`UPDATE entrainements SET statut='termine' WHERE id=$1`,[req.params.id]);
    res.json({success:true,message:'Entraînement terminé'});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const annulerEntrainement = async (req, res) => {
  try {
    await pool.query(`UPDATE entrainements SET statut='annule' WHERE id=$1`,[req.params.id]);
    res.json({success:true});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const supprimerEntrainement = async (req, res) => {
  try {
    await pool.query(`DELETE FROM entrainements WHERE id=$1`,[req.params.id]);
    res.json({success:true});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

// ── Pointage ──────────────────────────────────────────────────────────────
const getPointage = async (req, res) => {
  try {
    const soldiers = await pool.query(`
      SELECT s.id,s.nom,s.prenom,s.grade,s.photo_url,s.matricule,'soldier' AS type,
        COALESCE(ep.presence,'absent') AS presence, ep.motif
      FROM soldiers s
      LEFT JOIN entrainement_presences ep ON ep.soldier_id=s.id AND ep.entrainement_id=$1
      WHERE s.statut='actif' AND s.statut_campus='actif'
      ORDER BY s.nom,s.prenom
    `,[req.params.id]);
    const crics = await pool.query(`
      SELECT c.id,c.nom,c.prenom,c.photo_url,'cric' AS type,
        COALESCE(ep.presence,'absent') AS presence, ep.motif
      FROM crics c
      LEFT JOIN entrainement_presences ep ON ep.cric_id=c.id AND ep.entrainement_id=$1
      WHERE c.statut NOT IN ('refusé','inapte')
      ORDER BY c.nom,c.prenom
    `,[req.params.id]);
    res.json({success:true,data:{soldiers:soldiers.rows,crics:crics.rows}});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const savePointage = async (req, res) => {
  try {
    const {pointages} = req.body;
    for(const p of pointages){
      if(p.type==='soldier')
        await pool.query(`INSERT INTO entrainement_presences (entrainement_id,participant_type,soldier_id,presence,motif,created_by) VALUES ($1,'soldier',$2,$3,$4,$5) ON CONFLICT (entrainement_id,soldier_id) DO UPDATE SET presence=$3,motif=$4`,[req.params.id,p.id,p.presence,p.motif||null,req.user.id]);
      else
        await pool.query(`INSERT INTO entrainement_presences (entrainement_id,participant_type,cric_id,presence,motif,created_by) VALUES ($1,'cric',$2,$3,$4,$5) ON CONFLICT (entrainement_id,cric_id) DO UPDATE SET presence=$3,motif=$4`,[req.params.id,p.id,p.presence,p.motif||null,req.user.id]);
    }
    res.json({success:true,message:'Pointage enregistré'});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

// ── Performances ──────────────────────────────────────────────────────────
const getPerformances = async (req, res) => {
  try {
    const entr = await pool.query(`SELECT type_seance FROM entrainements WHERE id=$1`,[req.params.id]);
    const perfs = await pool.query(`
      SELECT ep2.*,
        s.nom,s.prenom,s.grade,s.photo_url,'soldier' AS type,
        s.id AS participant_id
      FROM entrainement_performances ep2
      LEFT JOIN soldiers s ON s.id=ep2.soldier_id
      WHERE ep2.entrainement_id=$1 AND ep2.soldier_id IS NOT NULL
      UNION ALL
      SELECT ep2.*,
        c.nom,c.prenom,NULL AS grade,c.photo_url,'cric' AS type,
        c.id AS participant_id
      FROM entrainement_performances ep2
      LEFT JOIN crics c ON c.id=ep2.cric_id
      WHERE ep2.entrainement_id=$1 AND ep2.cric_id IS NOT NULL
      ORDER BY nom,prenom
    `,[req.params.id]);
    res.json({success:true,data:{type_seance:entr.rows[0]?.type_seance,performances:perfs.rows}});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const savePerformance = async (req, res) => {
  try {
    const {soldier_id,cric_id,distance_km,temps_footing,temps_parcours,nb_pompes,nb_abdos,nb_tractions,note,observations} = req.body;
    if(soldier_id)
      await pool.query(`INSERT INTO entrainement_performances (entrainement_id,soldier_id,distance_km,temps_footing,temps_parcours,nb_pompes,nb_abdos,nb_tractions,note,observations,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (entrainement_id,soldier_id) DO UPDATE SET distance_km=$3,temps_footing=$4,temps_parcours=$5,nb_pompes=$6,nb_abdos=$7,nb_tractions=$8,note=$9,observations=$10`,[req.params.id,soldier_id,distance_km||null,temps_footing||null,temps_parcours||null,nb_pompes||null,nb_abdos||null,nb_tractions||null,note||null,observations||null,req.user.id]);
    else
      await pool.query(`INSERT INTO entrainement_performances (entrainement_id,cric_id,distance_km,temps_footing,temps_parcours,nb_pompes,nb_abdos,nb_tractions,note,observations,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (entrainement_id,cric_id) DO UPDATE SET distance_km=$3,temps_footing=$4,temps_parcours=$5,nb_pompes=$6,nb_abdos=$7,nb_tractions=$8,note=$9,observations=$10`,[req.params.id,cric_id,distance_km||null,temps_footing||null,temps_parcours||null,nb_pompes||null,nb_abdos||null,nb_tractions||null,note||null,observations||null,req.user.id]);
    res.json({success:true,message:'Performance enregistrée'});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

// ── Membres ───────────────────────────────────────────────────────────────
const getMembres = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT sm.*,s.nom,s.prenom,s.grade,s.photo_url,s.matricule
      FROM section_membres sm JOIN soldiers s ON s.id=sm.soldier_id
      WHERE sm.section_slug='caporaux'
      ORDER BY CASE sm.role WHEN 'chef' THEN 1 WHEN 'second' THEN 2 ELSE 3 END,s.nom
    `);
    res.json({success:true,data:r.rows});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const addMembre = async (req, res) => {
  try {
    const {soldier_id,role} = req.body;
    if(role==='chef'||role==='second')
      await pool.query(`UPDATE section_membres SET role='membre' WHERE section_slug='caporaux' AND role=$1`,[role]);
    const r = await pool.query(`INSERT INTO section_membres (section_slug,soldier_id,role,created_by) VALUES ('caporaux',$1,$2,$3) ON CONFLICT (section_slug,soldier_id) DO UPDATE SET role=$2 RETURNING *`,[soldier_id,role||'membre',req.user.id]);
    res.json({success:true,data:r.rows[0]});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

const removeMembre = async (req, res) => {
  try {
    await pool.query(`DELETE FROM section_membres WHERE section_slug='caporaux' AND soldier_id=$1`,[req.params.soldier_id]);
    res.json({success:true});
  } catch(e){ res.status(500).json({success:false,error:e.message}); }
};

module.exports = {
  getStats, getEntrainements, creerEntrainement,
  demarrerEntrainement, terminerEntrainement, annulerEntrainement, supprimerEntrainement,
  getPointage, savePointage, getPerformances, savePerformance,
  getMembres, addMembre, removeMembre,
};
