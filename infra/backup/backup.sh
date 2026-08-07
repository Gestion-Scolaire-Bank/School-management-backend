#!/bin/bash
# Sauvegarde complete de l'etat persistant de SchoolManage App :
#   - PostgreSQL (11 bases applicatives, pattern "Database per Service")
#   - MongoDB (whatsapp-service - groupes de classe)
#   - Redis (userstatus-service : donnees primaires, pas seulement du cache -
#     cf. sm:userstatus:current:*/sm:userstatus:history:* - + blacklist JWT/idempotence paiement)
#   - MinIO (documents uploades : photos, actes de naissance, CV, cartes ID)
#
# Usage : ./backup.sh [dossier-de-destination]
# Necessite les conteneurs infra demarres (docker-compose.infra.yml) et les identifiants
# du fichier .env a la racine du depot (POSTGRES_USER/PASSWORD, REDIS_PASSWORD, MINIO_*).
#
# Planification (cron, tous les jours a 2h) :
#   0 2 * * * cd /chemin/vers/le/depot && ./infra/backup/backup.sh /var/backups/schoolmanage >> /var/log/schoolmanage-backup.log 2>&1
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

BACKUP_ROOT="${1:-$REPO_ROOT/backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DEST="$BACKUP_ROOT/$TIMESTAMP"
mkdir -p "$DEST"

echo "=== Sauvegarde SchoolManage App -> $DEST ==="

echo "-> PostgreSQL (pg_dumpall, toutes les bases + roles)"
docker exec -e PGPASSWORD="${POSTGRES_PASSWORD:-schoolmanage_dev_pwd}" sm-postgres \
  pg_dumpall -U "${POSTGRES_USER:-schoolmanage}" | gzip > "$DEST/postgres.sql.gz"

echo "-> MongoDB (mongodump)"
docker exec sm-mongo mongodump --archive --gzip \
  --username "${MONGO_ROOT_USER:-schoolmanage}" --password "${MONGO_ROOT_PASSWORD:-schoolmanage_dev_pwd}" \
  --authenticationDatabase admin \
  > "$DEST/mongo.archive.gz"

echo "-> Redis (SAVE + copie du RDB)"
docker exec sm-redis redis-cli -a "${REDIS_PASSWORD}" --no-auth-warning SAVE > /dev/null
docker cp sm-redis:/data/dump.rdb "$DEST/redis-dump.rdb"

echo "-> MinIO (archive du volume de donnees)"
docker run --rm \
  -v schoolmanage-infra_minio_data:/data:ro \
  -v "$DEST":/backup \
  alpine tar czf /backup/minio-data.tar.gz -C /data .

echo "=== Sauvegarde terminee ==="
du -sh "$DEST"/*

# Retention : conserve les 14 derniers jours de sauvegardes, supprime le reste - a ajuster
# selon la politique de conservation reelle de l'etablissement (obligations legales comprises).
find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -mtime +14 -print -exec rm -rf {} \;
