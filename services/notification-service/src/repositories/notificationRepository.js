const { randomUUID } = require('crypto');
const { getPool } = require('../db/pool');

async function create({ recipientUserId, recipientAddress, channel, type, subject, body, sourceTopic }) {
  const pool = getPool();
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO notifications
       (id, recipient_user_id, recipient_address, channel, type, subject, body, status, attempts, source_topic)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', 0, $8)
     RETURNING *`,
    [
      id,
      recipientUserId || null,
      recipientAddress || null,
      channel,
      type || null,
      subject || null,
      body,
      sourceTopic || null,
    ]
  );
  return result.rows[0];
}

async function findById(id) {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function markSent(id) {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE notifications SET status = 'SENT', error_message = NULL, attempts = attempts + 1, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
}

async function markFailed(id, errorMessage) {
  const pool = getPool();
  const result = await pool.query(
    `UPDATE notifications SET status = 'FAILED', error_message = $2, attempts = attempts + 1, updated_at = now()
     WHERE id = $1 RETURNING *`,
    [id, errorMessage]
  );
  return result.rows[0];
}

async function listByUser(userId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM notifications WHERE recipient_user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

async function listAll({ status, channel, limit = 50 } = {}) {
  const pool = getPool();
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (channel) {
    params.push(channel);
    conditions.push(`channel = $${params.length}`);
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);
  const result = await pool.query(
    `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

module.exports = { create, findById, markSent, markFailed, listByUser, listAll };
