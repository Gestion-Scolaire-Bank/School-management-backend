# admin-service

> Java Spring Boot - Port 8092 - PostgreSQL

Permet a l'administrateur systeme de gerer les etablissements rattaches a la plateforme, la configuration technique globale et les comptes utilisateurs a l'echelle multi-etablissement.

## Responsabilites

- Ajout / configuration des etablissements
- Gestion des comptes utilisateurs (activation, suspension)
- Parametrage global du systeme (tarifs, periodes scolaires)

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/admin/establishments` | Admin Systeme | Ajouter un etablissement |
| PATCH | `/api/v1/admin/users/{id}/status` | Admin Systeme | Activer / suspendre un compte |
| GET | `/api/v1/admin/config` | Admin Systeme | Consulter la configuration globale |

## Communications sortantes (Kafka / REST)

| Service cible | Topic / Evenement | Payload | Declencheur |
|---|---|---|---|
| auth-service | `REST /api/auth/users/{id}/status` | `{userId, status}` | Suspension d'un compte utilisateur |

## Base de donnees

`sm_admin_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC23 - Gerer la configuration multi-etablissement

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
