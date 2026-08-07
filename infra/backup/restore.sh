#!/bin/bash
# Restauration a partir d'une sauvegarde produite par backup.sh.
#
# ATTENTION : ecrase les donnees actuelles de Postgres/MongoDB/Redis/MinIO. A executer
# uniquement en cas de sinistre reel ou pour reconstituer un environnement de test - jamais
# sans confirmation explicite (le script demande une confirmation avant toute ecriture).
#
# Usage : ./restore.sh /chemin/vers/backups/20260115-020000
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$REPO_ROOT/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$REPO_ROOT/.env"
  set +a
fi

SRC="${1:?Usage: ./restore.sh /chemin/vers/backups/AAAAMMJJ-HHMMSS}"
if [ ! -d "$SRC" ]; then
  echo "Dossier de sauvegarde introuvable : $SRC" >&2
  exit 1
fi

echo "Cette operation va ECRASER les donnees actuelles de Postgres, MongoDB, Redis et MinIO"
echo "avec le contenu de : $SRC"
read -r -p "Confirmer la restauration ? (taper 'oui' pour continuer) " CONFIRM
if [ "$CONFIRM" != "oui" ]; then
  echo "Annule."
  exit 1
fi

if [ -f "$SRC/postgres.sql.gz" ]; then
  echo "-> PostgreSQL"
  gunzip -c "$SRC/postgres.sql.gz" | docker exec -i -e PGPASSWORD="${POSTGRES_PASSWORD:-schoolmanage_dev_pwd}" sm-postgres \
    psql -U "${POSTGRES_USER:-schoolmanage}"
fi

if [ -f "$SRC/mongo.archive.gz" ]; then
  echo "-> MongoDB"
  docker exec -i sm-mongo mongorestore --archive --gzip --drop \
    --username "${MONGO_ROOT_USER:-schoolmanage}" --password "${MONGO_ROOT_PASSWORD:-schoolmanage_dev_pwd}" \
    --authenticationDatabase admin \
    < "$SRC/mongo.archive.gz"
fi

if [ -f "$SRC/redis-dump.rdb" ]; then
  echo "-> Redis (necessite un redemarrage du conteneur pour charger le nouveau RDB)"
  docker cp "$SRC/redis-dump.rdb" sm-redis:/data/dump.rdb
  docker restart sm-redis
fi

if [ -f "$SRC/minio-data.tar.gz" ]; then
  echo "-> MinIO"
  docker run --rm \
    -v schoolmanage-infra_minio_data:/data \
    -v "$SRC":/backup \
    alpine sh -c "rm -rf /data/* && tar xzf /backup/minio-data.tar.gz -C /data"
  docker restart sm-minio
fi

echo "=== Restauration terminee depuis $SRC ==="
echo "Redemarrez les micro-services applicatifs (docker compose restart) pour repartir sur un etat propre."
