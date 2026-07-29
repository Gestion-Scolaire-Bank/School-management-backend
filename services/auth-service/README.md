# auth-service

> Java Spring Boot + Keycloak (OAuth2/OIDC) - Port 8081 - PostgreSQL, Redis

Gardien central de la plateforme. Gere le cycle de vie des identites : inscription, connexion, generation/validation des tokens JWT, revocation et controle d'acces base sur les roles (RBAC).

## Responsabilites

- Inscription et verification de l'unicite de l'email
- Authentification multi-roles avec generation de JWT (access 15min + refresh 7j)
- Blacklist des tokens invalides dans Redis
- Controle d'acces RBAC sur toutes les routes protegees
- Reinitialisation securisee de mot de passe (lien tokenise, TTL 1h)
- Desactivation / suspension de comptes par l'administrateur

## Endpoints REST

| Methode | Route | Roles autorises | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Creer un nouveau compte |
| POST | `/api/auth/login` | Public | Authentifier et retourner les tokens JWT |
| POST | `/api/auth/logout` | Authentifie | Invalider le token (blacklist Redis) |
| POST | `/api/auth/refresh` | Authentifie | Renouveler l'access token |
| GET | `/api/auth/me` | Authentifie | Retourner le profil de l'utilisateur connecte |
| POST | `/api/auth/validate-token` | Services internes | Valider un JWT (usage interne) |
| PATCH | `/api/auth/users/{id}/status` | Admin | Activer, desactiver ou suspendre un compte |

## Communications sortantes (Kafka / REST)

| Service cible | Topic / Evenement | Payload | Declencheur |
|---|---|---|---|
| notification-service | `sm.auth.user.registered` | `{email, nom, token}` | Inscription -> email de bienvenue |
| notification-service | `sm.auth.password.reset` | `{email, reset_link}` | Demande de reinitialisation |
| registration-service | `sm.auth.user.created` | `{userId, email, role}` | Creation de profil initial |

## Base de donnees

`sm_auth_db` (PostgreSQL dediee, pattern Database per Service)

## Cas d'utilisation associes

- UC1 - S'inscrire
- UC2 - Se connecter
- UC3 - Reinitialiser le mot de passe
- UC4 - Se deconnecter

## Demarrage local

Ce service fait partie du monorepo. Voir le `README.md` a la racine pour lancer
l'ensemble de la plateforme via `docker-compose.yml` / `docker-compose.infra.yml`.
Ordre de demarrage obligatoire : `sm-config-service -> sm-registry-service -> sm-gateway-service`
avant tout service metier (cf. section 5.1 du document de conception).
