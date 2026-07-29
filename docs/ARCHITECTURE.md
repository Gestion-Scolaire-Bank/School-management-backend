# Architecture - SchoolManage App

> Reference rapide. Le document source complet est [Document_de_Conception_SchoolManage_App.pdf](./Document_de_Conception_SchoolManage_App.pdf) (v1.0, juillet 2026) - s'y referer en cas de doute.

## Vue d'ensemble

Architecture micro-services : chaque service est independant, possede sa propre base de donnees (pattern *Database per Service*) et communique soit de facon synchrone (REST/HTTP via l'API Gateway), soit de facon asynchrone (evenements Kafka/RabbitMQ).

```
Client (React Native / React.js / PWA)
        |
   API Gateway (sm-gateway-service:8888) -- JWT / RBAC / Rate limiting
        |
  12 micro-services metier (S4-S15)
        |
  PostgreSQL (par service) + Oracle (reporting) + Redis (cache/verrous) + MinIO (fichiers)
        |
  Kafka / RabbitMQ (evenements asynchrones)
```

## Ordre de demarrage obligatoire

```
sm-config-service (8080) -> sm-registry-service (8761) -> sm-gateway-service (8888) -> services metier (parallele)
```

Aucun service metier ne doit demarrer avant que ces trois services d'infrastructure soient operationnels (cf. `docker-compose.yml`, `depends_on: condition: service_healthy`).

## Table des 15 micro-services

| # | Service | Port | Stack | Domaine fonctionnel |
|---|---|---|---|---|
| S1 | sm-config-service | 8080 | Spring Cloud Config | Configuration centralisee |
| S2 | sm-registry-service | 8761 | Spring Cloud Eureka | Decouverte de services |
| S3 | sm-gateway-service | 8888 | Spring Cloud Gateway | API Gateway, JWT, RBAC |
| S4 | auth-service | 8081 | Spring Boot + Keycloak | Authentification & Autorisations |
| S5 | registration-service | 8082 | Spring Boot | Inscription eleves/personnel |
| S6 | payment-service | 8083 | Spring Boot | Paiement (Mobile Money) |
| S7 | presence-service | 8084 | Node.js/Express | Presence & assiduite (QR) |
| S8 | notification-service | 8085 | Node.js/Express | Notifications Email/SMS/Push |
| S9 | reportcard-service | 8086 | Python FastAPI | Notes et bulletins |
| S10 | userstatus-service | 8087 | Node.js/WebSocket | Statuts utilisateurs temps reel |
| S11 | whatsapp-service | 8088 | Node.js | Communaute WhatsApp |
| S12 | pedagogic-service | 8089 | Python FastAPI | Ressources pedagogiques |
| S13 | schoolid-service | 8090 | Python | Cartes d'identite scolaires |
| S14 | analytics-service | 8091 | Python | Tableaux de bord et KPI |
| S15 | admin-service | 8092 | Spring Boot | Configuration multi-etablissement |

## Communications inter-services (evenements Kafka principaux)

| Source | Cible | Evenement | Declencheur |
|---|---|---|---|
| auth-service | notification-service | `sm.auth.user.registered` | Inscription -> email de bienvenue |
| registration-service | schoolid-service | `sm.registration.student.enrolled` | Inscription validee -> generation carte ID |
| registration-service | whatsapp-service | `sm.registration.student.enrolled` | Ajout automatique au groupe de classe |
| payment-service | notification-service | `sm.payment.completed` / `sm.payment.failed` | Recu ou alerte d'echec |
| payment-service | analytics-service | `sm.payment.completed` | Mise a jour des indicateurs financiers |
| presence-service | notification-service | `sm.presence.absence.detected` | Absence non justifiee -> alerte parent |
| reportcard-service | notification-service | `sm.reportcard.available` | Bulletin genere -> notification |

Voir `docs/Document_de_Conception_SchoolManage_App.pdf` section 6.2 et 8.5 pour la liste complete.

## Strategies techniques cles

- **Coherence des donnees** : pattern Saga (choregraphie) via Kafka, verrous distribues Redis (anti-doublon check-in), cles d'idempotence Redis (paiements), vues materialisees Oracle (reporting).
- **Performance** : cache Redis adaptatif (TTL 5 min recherche, 1h dashboards), read-replicas PostgreSQL, Kafka avec messages persistants.
- **Securite** : JWT (access 15 min + refresh 7 jours) avec blacklist Redis, RBAC 4 roles (Parent, Enseignant, Administrateur, Directeur), HTTPS obligatoire, validation/sanitisation OWASP Top 10.

## Conventions de nommage

| Type de ressource | Pattern | Exemple |
|---|---|---|
| Services Spring Boot | `sm-{domaine}-service` | `sm-payment-service` |
| Bases de donnees | `sm-{domaine}-db` | `sm-payment-db` |
| Topics Kafka | `sm.{domaine}.{evenement}` | `sm.payment.completed` |
| Cles Redis | `sm:{domaine}:{objet}:{id}` | `sm:presence:lock:{studentId}` |
| Buckets S3/MinIO | `sm-{domaine}-{env}` | `sm-documents-prod` |
| Images Docker | `sm/{service}:{version}` | `sm/payment-service:1.0.0` |

## Environnements

| Env | Infrastructure | Usage |
|---|---|---|
| DEV | Docker Compose | Poste de chaque developpeur |
| TEST | Namespace Kubernetes dedie | Pipeline CI/CD - tests automatises |
| PROD | Cluster Kubernetes multi-AZ | Deploiement final, haute disponibilite |

## Pour aller plus loin

Chaque service possede son propre `README.md` (dans `services/{nom-du-service}/README.md`) qui detaille : responsabilites, endpoints REST, communications inter-services, et cas d'utilisation associes (UC) - extraits directement du document de conception (section 5.2).
