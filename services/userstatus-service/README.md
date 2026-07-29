# userstatus-service

> Node.js / WebSocket - Port 8087 - Redis

Permet a un eleve ou un membre du personnel de publier son statut courant (malade, en deplacement, distanciel). Les changements de statut sont diffuses en temps reel via WebSocket vers les tableaux de bord d'administration.

## Responsabilites

- Publication et mise a jour du statut utilisateur
- Diffusion temps reel des changements (WebSocket)
- Historique des statuts par utilisateur

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/status` | Tous acteurs | Publier un statut |
| GET | `/api/v1/status/history/{id}` | Admin | Consulter l'historique de statut |
| GET | `/api/v1/status/live` | Admin | Flux temps reel des statuts (WebSocket) |

## Communications sortantes (Kafka / REST)

| Service cible | Topic / Evenement | Payload | Declencheur |
|---|---|---|---|
| notification-service | `sm.userstatus.changed` | `{userId, statusType}` | Changement de statut -> notification |

## Base de donnees

`sm_userstatus_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC20 - Publier / consulter un statut utilisateur

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
