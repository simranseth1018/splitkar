const db = require('../db/connection');

module.exports = function groupAccess(req, res, next) {
  const groupId = req.params.groupId;
  if (!groupId) return next();

  const membership = db.prepare(
    'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(groupId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'Access denied' });
  }
  req.membership = membership;
  next();
};
