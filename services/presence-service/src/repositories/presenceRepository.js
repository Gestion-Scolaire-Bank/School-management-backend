const { randomUUID } = require('crypto');
const { getPool } = require('../db/pool');

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function findOpenRecord(personId) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM presence_records WHERE person_id = $1 AND check_out_at IS NULL ORDER BY check_in_at DESC LIMIT 1',
    [personId]
  );
  return result.rows[0] || null;
}

async function createCheckIn({ personId, personType, classId, establishmentId }) {
  const pool = getPool();
  const id = randomUUID();
  const now = new Date();
  const result = await pool.query(
    `INSERT INTO presence_records (id, person_id, person_type, class_id, establishment_id, record_date, check_in_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PRESENT')
     RETURNING *`,
    [id, personId, personType, classId || null, establishmentId || null, toDateOnly(now), now]
  );
  return result.rows[0];
}

async function closeCheckOut(recordId) {
  const pool = getPool();
  const result = await pool.query(
    'UPDATE presence_records SET check_out_at = $2, updated_at = now() WHERE id = $1 RETURNING *',
    [recordId, new Date()]
  );
  return result.rows[0] || null;
}

async function listByClass(classId, date) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT * FROM presence_records WHERE class_id = $1 AND record_date = $2 ORDER BY check_in_at ASC',
    [classId, date]
  );
  return result.rows;
}

async function listByPerson(personId, { from, to } = {}) {
  const pool = getPool();
  const conditions = ['person_id = $1'];
  const params = [personId];
  if (from) {
    params.push(from);
    conditions.push(`record_date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`record_date <= $${params.length}`);
  }
  const result = await pool.query(
    `SELECT * FROM presence_records WHERE ${conditions.join(' AND ')} ORDER BY record_date DESC, check_in_at DESC`,
    params
  );
  return result.rows;
}

async function findPresentPersonIds(classId, date) {
  const pool = getPool();
  const result = await pool.query(
    'SELECT DISTINCT person_id FROM presence_records WHERE class_id = $1 AND record_date = $2',
    [classId, date]
  );
  return result.rows.map((row) => row.person_id);
}

module.exports = {
  findOpenRecord,
  createCheckIn,
  closeCheckOut,
  listByClass,
  listByPerson,
  findPresentPersonIds,
};
