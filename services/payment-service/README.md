# payment-service

> Java Spring Boot - Port 8083 - PostgreSQL + Oracle, Kafka (idempotency keys)

Orchestre toutes les transactions financieres de la plateforme : frais de scolarite et salaires. Integre les API Mobile Money de MTN (MoMo) et Orange Money. Chaque transaction est securisee par un mecanisme d'idempotence (cle unique Redis) qui evite les doubles debits en cas de retry reseau.

## Responsabilites

- Initiation des paiements Mobile Money (MTN MoMo / Orange Money)
- Reception et traitement des webhooks de confirmation / echec
- Mecanisme d'idempotence pour eviter les doubles debits
- Gestion des remboursements en cas d'annulation eligible
- Generation automatique des recus PDF
- Calcul des recapitulatifs financiers par etablissement

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/payments/fees` | Parent | Initier un paiement de frais de scolarite |
| POST | `/api/v1/payments/salary` | Admin | Initier un paiement de salaire |
| GET | `/api/v1/payments/{id}/status` | Parent / Admin | Consulter le statut d'une transaction |
| GET | `/api/v1/payments/{id}/receipt` | Parent | Telecharger le recu PDF |
| POST | `/api/v1/payments/webhook/mtn` | Systeme (MTN) | Notification de paiement MTN |
| POST | `/api/v1/payments/webhook/orange` | Systeme (Orange) | Notification de paiement Orange |
| GET | `/api/v1/payments/student/{id}` | Parent / Admin | Historique des paiements d'un eleve |
| GET | `/api/v1/payments/reports/revenue` | Admin / Directeur | Rapport de recettes |

## Communications sortantes (Kafka / REST)

| Service cible | Topic / Evenement | Payload | Declencheur |
|---|---|---|---|
| notification-service | `sm.payment.completed` | `{userId, montant, recu_url}` | Paiement reussi -> recu au parent |
| notification-service | `sm.payment.failed` | `{userId, motif}` | Paiement echoue -> notification |
| analytics-service | `sm.payment.completed` | `{montant, etablissementId}` | Mise a jour des indicateurs financiers |

## Base de donnees

`sm_payment_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC9 - Payer les frais de scolarite
- UC10 - Consulter un recu de paiement
- UC11 - Effectuer un paiement de salaire
- UC12 - Consulter l'historique de paiement

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
