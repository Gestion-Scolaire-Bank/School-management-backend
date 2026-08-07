const { getPool } = require('./pool');

async function ensureSchema() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(36) PRIMARY KEY,
      recipient_user_id VARCHAR(100),
      recipient_address VARCHAR(255),
      channel VARCHAR(20) NOT NULL,
      type VARCHAR(50),
      subject VARCHAR(255),
      body TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      error_message TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      source_topic VARCHAR(150),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (recipient_user_id);');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);');
}

module.exports = { ensureSchema };
