# analytics-service

> Python - Port 8091 - PostgreSQL/Oracle, Redis

Agrege les donnees de tous les services metier (paiements, presence, notes) pour alimenter les tableaux de bord des directeurs et de l'administrateur systeme. Les requetes lourdes s'appuient sur des vues materialisees Oracle et un cache Redis (TTL 1h).

## Responsabilites

- Calcul et agregation des indicateurs cles (KPI)
- Generation de tableaux de bord par etablissement
- Export de rapports (PDF / CSV)
- Mise en cache des tableaux de bord frequemment consultes

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| GET | `/api/v1/analytics/dashboard` | Directeur / Admin | Tableau de bord d'un etablissement |
| GET | `/api/v1/analytics/global` | Admin Systeme | Statistiques multi-etablissement |
| GET | `/api/v1/analytics/export` | Admin | Exporter un rapport (PDF/CSV) |

## Communications entrantes

Consumer multi-topics : sm.payment.completed, sm.presence.recorded, sm.reportcard.generated

## Cas d'utilisation associes

- UC22 - Consulter le tableau de bord analytique

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
