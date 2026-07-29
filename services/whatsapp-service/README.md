# whatsapp-service

> Node.js - Port 8088 - WhatsApp Cloud API, MongoDB

Integre l'API WhatsApp Business (Cloud API) pour la creation automatique de groupes de classe lors des inscriptions, la diffusion d'annonces et la messagerie parent-enseignant. Les messages sont archives dans MongoDB pour moderation.

## Responsabilites

- Creation automatique d'un groupe WhatsApp par classe
- Diffusion d'annonces vers les groupes de classe
- Messagerie directe parent-enseignant
- Archivage et moderation des messages

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/v1/whatsapp/groups` | Systeme (interne) | Creer un groupe de classe |
| POST | `/api/v1/whatsapp/broadcast` | Enseignant / Admin | Diffuser une annonce |
| GET | `/api/v1/whatsapp/groups/{classId}` | Enseignant | Consulter un groupe de classe |

## Communications entrantes

Consumer sm.registration.student.enrolled -> ajout automatique au groupe WhatsApp de classe

## Cas d'utilisation associes

- UC19 - Diffuser une annonce

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
