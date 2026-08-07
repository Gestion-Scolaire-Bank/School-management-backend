# Sauvegarde / restauration

Aucune donnee de SchoolManage App n'etait sauvegardee avant ce jour - un incident sur le
volume Docker (disque plein, mise a jour ratee, suppression accidentelle) aurait signifie
une perte totale des notes, paiements, dossiers d'inscription et documents des eleves.

## Ce qui est sauvegarde

| Composant  | Outil                  | Contenu                                                                 |
|------------|-------------------------|--------------------------------------------------------------------------|
| PostgreSQL | `pg_dumpall`             | Les 11 bases applicatives (pattern "Database per Service") + roles       |
| MongoDB    | `mongodump`              | Groupes de classe WhatsApp (whatsapp-service)                            |
| Redis      | `SAVE` + copie du RDB    | Statuts temps reel (userstatus-service - donnees primaires, pas du cache seul), blacklist JWT, cles d'idempotence |
| MinIO      | archive du volume        | Documents uploades : photos, actes de naissance, CV, cartes d'identite scolaire |

Kafka n'est pas sauvegarde : c'est un bus d'evenements transitoire entre services, pas un
systeme de verite (chaque service persiste deja ce dont il a besoin dans sa propre base).

## Utilisation manuelle

```bash
# Sauvegarde vers ./backups/AAAAMMJJ-HHMMSS/ (par defaut)
./infra/backup/backup.sh

# Sauvegarde vers un dossier precis (ex. un point de montage externe/NAS)
./infra/backup/backup.sh /mnt/backups-schoolmanage

# Restauration (ecrase les donnees actuelles - demande confirmation)
./infra/backup/restore.sh ./backups/20260115-020000
```

Necessite les conteneurs infra demarres (`docker compose -f docker-compose.infra.yml up -d`)
et un fichier `.env` a la racine du depot avec les identifiants Postgres/Redis/MinIO.

## Planification automatique (cron)

Sauvegarde quotidienne a 2h du matin, retention de 14 jours geree par `backup.sh` lui-meme :

```cron
0 2 * * * cd /chemin/vers/le/depot && ./infra/backup/backup.sh /var/backups/schoolmanage >> /var/log/schoolmanage-backup.log 2>&1
```

**Important** : ne pas se contenter de ce cron seul. Les sauvegardes doivent aussi etre
copiees regulierement vers un stockage hors du serveur (autre machine, cloud, disque externe)
- une sauvegarde qui reste sur le meme disque que les donnees originales ne protege pas contre
une panne materielle ou un vol du serveur.

## Note sur l'authentification MongoDB

Depuis la correction de la faille "Mongo sans mot de passe", `MONGO_INITDB_ROOT_USERNAME` /
`MONGO_INITDB_ROOT_PASSWORD` (docker-compose.infra.yml) ne creent l'utilisateur root que sur un
volume Mongo **vide** (tout premier demarrage). Sur une instance existante (volume deja
initialise), l'utilisateur doit etre cree une seule fois a la main avant de redemarrer avec
`--auth` :

```bash
docker exec sm-mongo mongosh --quiet --eval '
db.getSiblingDB("admin").createUser({
  user: "VOTRE_MONGO_ROOT_USER",
  pwd: "VOTRE_MONGO_ROOT_PASSWORD",
  roles: [{ role: "root", db: "admin" }]
})'
```

## Verification

Une sauvegarde qui n'a jamais ete restauree avec succes n'est pas fiable. Tester
periodiquement `restore.sh` sur un environnement de test (jamais en production) pour
confirmer que les fichiers generes sont bien exploitables.
