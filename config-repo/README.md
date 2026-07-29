# config-repo

Depot de configuration centralisee, servi par `sm-config-service` (Spring Cloud Config Server,
section 5.1 du document de conception).

## Fonctionnement

- `application.yml` : configuration **partagee** par tous les services (roles RBAC, exposition
  actuator, URL du registry Eureka par defaut).
- `{nom-du-service}.yml` : configuration **specifique** a un service (port, base de donnees,
  Kafka, Redis). Surcharge les valeurs de `application.yml` en cas de conflit.

## DEV vs PROD

- **DEV** : `sm-config-service` tourne avec le profil `native` et lit directement ce dossier
  (monte en volume dans `docker-compose.yml` : `./config-repo:/config-repo:ro`).
- **PROD** : ce dossier doit etre migre vers un depot Git dedie (`schoolmanage-cloud-config`
  dans le document de conception) et `sm-config-service` bascule sur le profil `git`
  (cf. `services/sm-config-service/src/main/resources/application.yml`).

## Mise a jour a chaud

Apres modification d'un fichier ici, appeler `POST http://localhost:8080/actuator/refresh` sur
`sm-config-service`, puis `POST /actuator/refresh` sur le service concerne pour recharger sa
configuration sans redemarrage (necessite la dependance `spring-cloud-starter-bus` en PROD pour
une propagation automatique a tous les services - non incluse par defaut dans ce squelette).
