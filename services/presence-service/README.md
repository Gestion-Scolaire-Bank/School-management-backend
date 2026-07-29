# presence-service

> Node.js / Express - Port 8084 - PostgreSQL, Redis

Gere le pointage des eleves et du personnel par QR code ou biometrie. Les disponibilites et statuts du jour sont maintenus dans Redis pour un affichage temps reel. Un job planifie detecte quotidiennement les absences non justifiees et declenche une alerte.

## Responsabilites

- Enregistrement des check-in / check-out par QR code
- Tableau de bord de presence en temps reel
- Detection automatique des absences (job planifie)
- Suivi des retards et generation de rapports journaliers/hebdomadaires

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/presence/check-in` | Eleve / Staff | Enregistrer une entree |
| POST | `/api/v1/presence/check-out` | Eleve / Staff | Enregistrer une sortie |
| GET | `/api/v1/presence/class/{id}` | Enseignant / Admin | Tableau de presence d'une classe |
| GET | `/api/v1/presence/student/{id}` | Parent / Admin | Historique de presence d'un eleve |

## Communications sortantes (Kafka / REST)

| Service cible | Topic / Evenement | Payload | Declencheur |
|---|---|---|---|
| notification-service | `sm.presence.absence.detected` | `{studentId, date}` | Absence detectee -> alerte parent |
| analytics-service | `sm.presence.recorded` | `{status, classId}` | Mise a jour des indicateurs d'assiduite |

## Base de donnees

`sm_presence_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC13 - Scanner QR (check-in/out)
- UC14 - Consulter le tableau de presence
- UC15 - Recevoir une alerte d'absence

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
