const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getUsers, createUser, updateUser,
  deleteUser, toggleUser, getStats
} = require('../controllers/usersController');

const adminOnly = [protect, authorize('admin')];

router.get  ('/',          ...adminOnly, getUsers);
router.get  ('/stats',     ...adminOnly, getStats);
router.post ('/',          ...adminOnly, createUser);
router.put  ('/:id',       ...adminOnly, updateUser);
router.put  ('/:id/toggle',...adminOnly, toggleUser);
router.delete('/:id',      ...adminOnly, deleteUser);

module.exports = router;
