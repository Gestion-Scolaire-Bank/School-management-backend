# registration-service

> Java Spring Boot - Port 8082 - PostgreSQL, MinIO

Gere l'enregistrement des eleves et du personnel : formulaire d'inscription, upload de documents (photo, acte de naissance), affectation de classe et historique d'inscription. Declenche la creation du compte via auth-service et la generation de la carte d'identite via schoolid-service.

## Responsabilites

- Enregistrement des eleves et onboarding du personnel
- Upload et stockage des documents (MinIO)
- Logique d'affectation automatique de classe
- Suivi de l'historique des inscriptions
- Declenchement de la generation de carte ID

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/registrations/student` | Admin | Inscrire un nouvel eleve |
| POST | `/api/v1/registrations/staff` | Admin | Inscrire un membre du personnel |
| GET | `/api/v1/registrations/{id}` | Admin | Consulter un dossier d'inscription |
| PATCH | `/api/v1/registrations/{id}/class` | Admin | Affecter / modifier la classe |

## Communications sortantes (Kafka / REST)

| Service cible | Topic / Evenement | Payload | Declencheur |
|---|---|---|---|
| auth-service | `REST /api/auth/register` | `{email, role}` | Creation du compte utilisateur |
| schoolid-service | `sm.registration.student.enrolled` | `{studentId, photo}` | Inscription validee -> generation ID |
| notification-service | `sm.registration.student.enrolled` | `{studentId, parentEmail}` | Envoi notification de bienvenue |
| whatsapp-service | `sm.registration.student.enrolled` | `{classId, studentId}` | Ajout au groupe WhatsApp de classe |

## Base de donnees

`sm_registration_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC6 - Inscrire un eleve/staff
- UC8 - Affecter une classe

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
