const { pool } = require('../config/database');

const getNotifications = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json({ success: true, data: r.rows });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const markAllRead = async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET lu=true WHERE user_id=$1`, [req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const markRead = async (req, res) => {
  try {
    await pool.query(`UPDATE notifications SET lu=true WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

const deleteNotification = async (req, res) => {
  try {
    await pool.query(`DELETE FROM notifications WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

module.exports = { getNotifications, markAllRead, markRead, deleteNotification };
