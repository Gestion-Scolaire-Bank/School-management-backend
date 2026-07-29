# sm-config-service (S1)

> Stack technique : Spring Cloud Config Server - Port 8080 - GitHub (`schoolmanage-cloud-config`)

Referentiel central de configuration de toute la plateforme SchoolManage. Implemente le patron
*Externalized Configuration* : au lieu d'embarquer les parametres de connexion (bases de donnees,
Redis, Kafka, ports) dans chaque service, tous ces parametres sont stockes dans un depot dedie et
distribues dynamiquement a chaque service au demarrage. En cas d'indisponibilite du config-service,
chaque service bascule sur ses valeurs locales par defaut (degradation gracieuse).

## Responsabilites

- Distribuer la configuration centralisee (ports, bases, Redis, Kafka) a tous les services
- Lire les fichiers de configuration depuis le depot Git dedie (ou le dossier `config-repo/` en DEV)
- Supporter plusieurs profils d'environnement (dev, test, prod)
- Permettre la mise a jour dynamique de la configuration sans redemarrage
- Fournir un endpoint de sante `/actuator/health`

## Ordre de demarrage

**Ce service doit demarrer en premier**, avant `sm-registry-service` et `sm-gateway-service`
(cf. document de conception, section 5.1) :

```
sm-config-service (8080) -> sm-registry-service (8761) -> sm-gateway-service (8888) -> services metier
```

## Configuration

- En **DEV**, le profil `native` est utilise : les fichiers YAML sont lus depuis `config-repo/`
  (monte en volume dans `docker-compose.yml`).
- En **PROD**, remplacer par le profil `git` pointant vers le depot GitHub dedie
  `schoolmanage-cloud-config` (voir le bloc commente dans `application.yml`).

## Endpoints

- `GET /actuator/health` - sante du service
- `GET /{service-name}/{profile}` - configuration d'un service donne (ex : `/auth-service/default`)
- `POST /actuator/refresh` - recharger la configuration sans redemarrage
