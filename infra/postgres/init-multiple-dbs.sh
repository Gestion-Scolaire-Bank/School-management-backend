#!/bin/bash
# Cree une base PostgreSQL dediee par micro-service (pattern "Database per Service", section 8.3).
# Execute automatiquement au premier demarrage du conteneur postgres (docker-entrypoint-initdb.d).
set -e

DATABASES="sm_auth_db sm_registration_db sm_payment_db sm_presence_db sm_reportcard_db sm_notification_db sm_userstatus_db sm_schoolid_db sm_admin_db sm_analytics_db sm_pedagogic_db"

for DB in $DATABASES; do
  echo "Creation de la base : $DB"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE $DB'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB')\gexec
EOSQL
done
