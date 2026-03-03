const pool   = require('../config/database');
const bcrypt = require('bcrypt');

// GET /api/users — liste tous les utilisateurs
const getUsers = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.id, u.username, u.role, u.is_active, u.nom_complet,
             u.section_slug, u.last_login, u.created_at,
             s.prenom || ' ' || s.nom AS soldat_nom, s.grade AS soldat_grade
      FROM users u
      LEFT JOIN soldiers s ON s.id = u.soldier_id
      ORDER BY u.created_at DESC
    `);
    res.json({ success:true, data:r.rows });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
};

// POST /api/users — créer un utilisateur
const createUser = async (req, res) => {
  const { username, password, role, nom_complet, section_slug, soldier_id } = req.body;
  if (!username || !password || !role) 
    return res.status(400).json({ success:false, error:'Champs requis manquants' });
  if (!['admin','instructeur','officier','soldat'].includes(role))
    return res.status(400).json({ success:false, error:'Rôle invalide' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const r = await pool.query(`
      INSERT INTO users (username, password_hash, role, nom_complet, section_slug, soldier_id, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,true)
      RETURNING id, username, role, nom_complet, is_active, created_at
    `, [username, hash, role, nom_complet||null, section_slug||null, soldier_id||null]);
    res.status(201).json({ success:true, data:r.rows[0] });
  } catch(e) {
    if (e.code==='23505') return res.status(400).json({ success:false, error:"Nom d'utilisateur déjà pris" });
    res.status(500).json({ success:false, error:e.message });
  }
};

// PUT /api/users/:id — modifier
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, password, role, nom_complet, section_slug, soldier_id, is_active } = req.body;
  try {
    let hash = null;
    if (password) hash = await bcrypt.hash(password, 10);
    const r = await pool.query(`
      UPDATE users SET
        username    = COALESCE($1, username),
        password_hash = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE password_hash END,
        role        = COALESCE($3, role),
        nom_complet = COALESCE($4, nom_complet),
        section_slug= COALESCE($5, section_slug),
        soldier_id  = $6,
        is_active   = COALESCE($7, is_active)
      WHERE id=$8
      RETURNING id, username, role, nom_complet, is_active
    `, [username||null, hash, role||null, nom_complet||null, section_slug||null,
        soldier_id||null, is_active??null, id]);
    if (!r.rows[0]) return res.status(404).json({ success:false, error:'Utilisateur introuvable' });
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id)===req.user.id)
    return res.status(400).json({ success:false, error:'Impossible de supprimer votre propre compte' });
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ success:true });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
};

// PUT /api/users/:id/toggle — activer/désactiver
const toggleUser = async (req, res) => {
  const { id } = req.params;
  if (parseInt(id)===req.user.id)
    return res.status(400).json({ success:false, error:'Impossible de vous désactiver vous-même' });
  try {
    const r = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, username, is_active',
      [id]
    );
    res.json({ success:true, data:r.rows[0] });
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
};

// GET /api/users/stats
const getStats = async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT role, COUNT(*) as count, COUNT(*) FILTER (WHERE is_active) as actifs
      FROM users GROUP BY role ORDER BY role
    `);
    const total = await pool.query('SELECT COUNT(*) FROM users');
    res.json({ success:true, data:{ par_role:r.rows, total:parseInt(total.rows[0].count) }});
  } catch(e) { res.status(500).json({ success:false, error:e.message }); }
};

module.exports = { getUsers, createUser, updateUser, deleteUser, toggleUser, getStats };
