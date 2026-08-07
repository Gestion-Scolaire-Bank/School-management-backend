# SchoolManage App

Plateforme numerique de gestion scolaire (Cameroun) - architecture micro-services.
Projet academique. Document de conception complet : [`docs/Document_de_Conception_SchoolManage_App.pdf`](./docs/Document_de_Conception_SchoolManage_App.pdf) (v1.0) et son resume technique [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

Pour lancer le projet en local et se connecter pour la premiere fois, voir le
[**Guide de demarrage**](./GUIDE_DEMARRAGE.md).

## Sommaire

- [Structure du depot](#structure-du-depot)
- [Stack technique](#stack-technique)
- [Demarrage rapide (dev)](#demarrage-rapide-dev)
- [Travailler sur un micro-service](#travailler-sur-un-micro-service)
- [Convention Git / workflow d'equipe](#convention-git--workflow-dequipe)
- [CI/CD](#cicd)
- [Deploiement Kubernetes](#deploiement-kubernetes)

## Structure du depot

```
schoolmanage-monorepo/
├── services/                  # 15 micro-services (voir tableau ci-dessous)
│   ├── sm-config-service/      # S1 - Spring Cloud Config Server
│   ├── sm-registry-service/    # S2 - Spring Cloud Eureka
│   ├── sm-gateway-service/     # S3 - API Gateway (JWT/RBAC)
│   ├── auth-service/           # S4 - Authentification
│   ├── registration-service/   # S5 - Inscriptions
│   ├── payment-service/        # S6 - Paiements Mobile Money
│   ├── presence-service/       # S7 - Presence QR code
│   ├── notification-service/   # S8 - Notifications Email/SMS/Push
│   ├── reportcard-service/     # S9 - Notes & bulletins
│   ├── userstatus-service/     # S10 - Statuts temps reel
│   ├── whatsapp-service/       # S11 - Communaute WhatsApp
│   ├── pedagogic-service/      # S12 - Ressources pedagogiques
│   ├── schoolid-service/       # S13 - Cartes d'identite scolaires
│   ├── analytics-service/      # S14 - Tableaux de bord / KPI
│   └── admin-service/          # S15 - Configuration multi-etablissement
├── clients/
│   ├── web-dashboard/          # React.js - tableau de bord (admin/directeur)
│   └── mobile-app/             # React Native - app parents/enseignants
├── config-repo/                # Configurations centralisees (Spring Cloud Config)
├── infra/
│   ├── k8s/                    # Manifests Kubernetes (production)
│   ├── postgres/               # Script d'initialisation multi-bases
│   └── prometheus/             # Configuration monitoring
├── docs/                        # Document de conception + architecture
├── .github/workflows/           # Pipeline CI/CD
├── docker-compose.yml           # Orchestration des 15 micro-services (dev)
└── docker-compose.infra.yml     # Infrastructure partagee (dev)
```

## Stack technique

| Couche | Technologie |
|---|---|
| Client mobile | React Native (parents, enseignants) |
| Client web | React.js (tableau de bord admin/directeur) |
| Backend Java | Spring Boot (auth, registration, payment, admin, config, registry, gateway) |
| Backend Python | FastAPI (reportcard, pedagogic, schoolid, analytics) |
| Backend Node.js | Express (presence, notification, userstatus, whatsapp) |
| Base de donnees | PostgreSQL (transactionnel, 1 base par service) + Oracle (reporting) |
| Cache / verrous | Redis |
| Messagerie asynchrone | Kafka (dev : Confluent images via docker-compose) |
| Stockage objets | MinIO (S3-compatible) |
| Orchestration | Docker Compose (dev) / Kubernetes (prod) |
| Monitoring | Prometheus + Grafana |

## Demarrage rapide (dev)

Prerequis : Docker + Docker Compose, JDK 17, Node.js 20, Python 3.11.

```bash
# 1. Copier les variables d'environnement
cp .env.example .env

# 2. Demarrer l'infrastructure partagee (Postgres, Redis, Kafka, MinIO, Mongo, Prometheus, Grafana)
docker network create schoolmanage-net   # une seule fois
docker compose -f docker-compose.infra.yml up -d

# 3. Demarrer les micro-services (respecte automatiquement l'ordre config -> registry -> gateway -> metier)
docker compose up -d --build

# 4. Verifier que le socle est disponible
curl http://localhost:8761        # Eureka - dashboard des services enregistres
curl http://localhost:8888/actuator/health   # Gateway
```

Chaque service expose son port dedie (voir `docs/ARCHITECTURE.md`). Exemple : `auth-service` sur `http://localhost:8081`.

Pour travailler sur un seul service sans tout reconstruire :

```bash
docker compose up -d --build auth-service
```

## Travailler sur un micro-service

Chaque dossier `services/{nom}` est autonome et contient son propre `README.md` avec :
- ses **responsabilites** (issues du document de conception, section 5.2)
- ses **endpoints REST** (methode, route, roles autorises)
- ses **communications inter-services** (Kafka/REST)
- les **cas d'utilisation associes** (UC1, UC2, ...)

Avant de coder une fonctionnalite, consultez le README du service concerne puis la section correspondante du document de conception.

## Convention Git / workflow d'equipe

Suggestion pour le travail de groupe sur GitHub :

- `main` : toujours deployable (proteger la branche, review obligatoire).
- Une branche par fonctionnalite : `feature/{service}-{description}` (ex. `feature/auth-service-login`).
- Un service = une equipe/binome recommande, pour limiter les conflits (chaque service a son propre build).
- Pull Request obligatoire vers `main`, avec au moins une revue avant merge.
- Le pipeline CI (`.github/workflows/ci-cd.yml`) ne construit que les services modifies dans le PR (detection de changements par dossier).

## CI/CD

Le pipeline GitHub Actions reproduit les 7 etapes du document de conception (section 9.4) :

1. **Build** - compilation/packaging (Maven / npm / pip)
2. **Test** - tests unitaires et d'integration (JUnit / Jest / PyTest)
3. **Scan** - analyse de vulnerabilites (Trivy)
4. **Push** - publication de l'image sur GitHub Container Registry
5. **Deploy staging** - `kubectl apply` sur le namespace de test
6. **Smoke test** - verification des endpoints critiques
7. **Prod** - deploiement final avec validation manuelle (GitHub Environment "production")

## Deploiement Kubernetes

Les manifests de production sont dans `infra/k8s/`. Voir `infra/k8s/README.md` pour le detail (namespace, Deployments/Services par micro-service, Ingress, HorizontalPodAutoscaler sur `payment-service` et `presence-service`).

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/services/ -n schoolmanage-prod
kubectl apply -f infra/k8s/ingress.yaml -n schoolmanage-prod
kubectl apply -f infra/k8s/hpa-payment-service.yaml -n schoolmanage-prod
kubectl apply -f infra/k8s/hpa-presence-service.yaml -n schoolmanage-prod
```

## Licence / cadre

Projet realise dans un cadre academique (Licence 3, semestre 2).
