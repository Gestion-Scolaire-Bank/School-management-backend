const { getPool } = require('./pool');

async function ensureSchema() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS presence_records (
      id VARCHAR(36) PRIMARY KEY,
      person_id VARCHAR(100) NOT NULL,
      person_type VARCHAR(20) NOT NULL,
      class_id VARCHAR(100),
      establishment_id VARCHAR(100),
      record_date DATE NOT NULL,
      check_in_at TIMESTAMPTZ,
      check_out_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'PRESENT',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // ALTER ... IF NOT EXISTS : necessaire pour une base deja existante, ou CREATE TABLE
  // IF NOT EXISTS ci-dessus n'a aucun effet sur les colonnes d'une table deja creee.
  await pool.query('ALTER TABLE presence_records ADD COLUMN IF NOT EXISTS establishment_id VARCHAR(100);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_presence_person ON presence_records (person_id, record_date);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_presence_class ON presence_records (class_id, record_date);');
}

module.exports = { ensureSchema };
