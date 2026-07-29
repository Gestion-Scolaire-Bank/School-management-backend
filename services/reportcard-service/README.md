# reportcard-service

> Python FastAPI - Port 8086 - PostgreSQL, WeasyPrint/ReportLab

Gere la saisie des notes par matiere et par periode, le calcul automatique des moyennes et des rangs, ainsi que la generation des bulletins au format PDF. Les bulletins generes sont stockes sur MinIO et accessibles en lecture par les parents.

## Responsabilites

- Saisie des notes par matiere et par periode
- Calcul automatique des moyennes ponderees et des rangs
- Generation PDF des bulletins (WeasyPrint/ReportLab)
- Archives historiques des notes par eleve

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/reports/grades` | Enseignant | Saisir une note |
| POST | `/api/v1/reports/generate` | Admin | Generer les bulletins d'une classe/periode |
| GET | `/api/v1/reports/student/{id}` | Parent / Eleve | Consulter / telecharger le bulletin |
| GET | `/api/v1/reports/class/{id}/summary` | Enseignant / Admin | Statistiques de classe |

## Communications sortantes (Kafka / REST)

| Service cible | Topic / Evenement | Payload | Declencheur |
|---|---|---|---|
| notification-service | `sm.reportcard.available` | `{studentId, bulletin_url}` | Bulletin genere -> notification |
| analytics-service | `sm.reportcard.generated` | `{classId, moyennes}` | Mise a jour indicateurs academiques |

## Base de donnees

`sm_reportcard_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC16 - Saisir les notes
- UC17 - Generer les bulletins
- UC18 - Consulter le bulletin

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
