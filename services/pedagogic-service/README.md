# pedagogic-service

> Python FastAPI - Port 8089 - PostgreSQL, S3/MinIO

Centralise la bibliotheque de ressources pedagogiques : documents, videos, plans de cours et outils d'evaluation destines aux enseignants. Les fichiers sont stockes sur MinIO/S3 et references en base PostgreSQL.

## Responsabilites

- Upload et publication de ressources pedagogiques
- Gestion des cours et des plans de lecon
- Outils d'evaluation des enseignants

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/pedagogic/resources` | Enseignant | Uploader une ressource |
| GET | `/api/v1/pedagogic/resources` | Enseignant | Lister les ressources disponibles |
| POST | `/api/v1/pedagogic/courses` | Enseignant | Creer un cours / plan de lecon |

## Cas d'utilisation associes

- Consulter / publier une ressource pedagogique (service faiblement couple, pas d'evenement Kafka emis)

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
