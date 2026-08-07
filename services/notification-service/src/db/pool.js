const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://schoolmanage:schoolmanage_dev_pwd@localhost:5432/sm_notification_db',
    });
  }
  return pool;
}

module.exports = { getPool };
