# notification-service

> Node.js / Express - Port 8085 - Kafka consumer, Redis Pub/Sub

Service de communication sortante de la plateforme. S'abonne aux evenements publies par les autres services via Kafka et declenche l'envoi de communications par email (SendGrid), SMS (Twilio) ou push (FCM). Chaque notification est journalisee avec son statut (envoye, echec, retry).

## Responsabilites

- Envoi d'emails transactionnels (confirmation, recu, bulletin)
- Notifications push et SMS (alertes, retards, annonces)
- Journalisation de chaque notification envoyee
- Retry automatique en cas d'echec d'envoi (backoff exponentiel)

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/notifications/send` | Services internes / Admin | Envoyer une notification manuelle |
| GET | `/api/v1/notifications/user/{id}` | Utilisateur | Historique des notifications recues |
| GET | `/api/v1/notifications/logs` | Admin | Consulter les logs d'envoi (statuts, erreurs) |
| PATCH | `/api/v1/notifications/{id}/retry` | Admin | Forcer le renvoi d'une notification en echec |

## Communications entrantes

Consumer multi-topics : reagit a tous les evenements metier de la plateforme (sm.auth.*, sm.payment.*, sm.presence.*, sm.reportcard.*, sm.userstatus.*, sm.schoolid.*)

## Base de donnees

`sm_notification_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC19 - Diffuser une annonce
- UC21 - Recevoir une notification

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
