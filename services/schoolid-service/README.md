# schoolid-service

> Python - Port 8090 - Pillow/ReportLab, PostgreSQL

Genere automatiquement les cartes d'identite scolaires avec QR code integre et photo, a la suite d'une inscription validee. Gere egalement le renouvellement et la revocation des cartes.

## Responsabilites

- Generation de cartes d'identite avec QR code
- Integration de la photo depuis l'inscription
- Impression en lot (bulk export PDF)
- Gestion de la validite et du renouvellement des cartes

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/school-id/generate` | Systeme (interne) | Generer une carte ID |
| POST | `/api/v1/school-id/{studentId}/reissue` | Admin | Renouveler une carte ID |
| GET | `/api/v1/school-id/{studentId}` | Parent / Admin | Telecharger la carte ID |

## Communications sortantes (Kafka / REST)

| Service cible | Topic / Evenement | Payload | Declencheur |
|---|---|---|---|
| notification-service | `sm.schoolid.generated` | `{studentId, idCardUrl}` | Carte generee -> notification |

## Base de donnees

`sm_schoolid_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC7 - Generer la carte d'identite scolaire

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
