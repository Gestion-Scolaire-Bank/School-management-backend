# sm-registry-service (S2)

> Stack technique : Spring Cloud Netflix Eureka - Port 8761

Registre de decouverte de services (*Service Registry*) de la plateforme. Chaque service metier
s'enregistre aupres de ce registre au demarrage. Le Gateway l'interroge pour connaitre les
instances disponibles d'un service cible, puis route la requete vers l'une d'elles (load
balancing cote client). En cas de panne d'une instance, le registry l'expulse automatiquement
apres expiration de son bail (90 secondes par defaut).

## Responsabilites

- Recevoir et stocker les enregistrements de tous les services (heartbeat 30s)
- Maintenir la liste des instances actives par service
- Expulser automatiquement les instances inactives (bail expire)
- Exposer la liste des instances au gateway pour le load balancing
- Fournir un tableau de bord visuel de supervision en temps reel

## Ordre de demarrage

Doit demarrer **apres** `sm-config-service` et **avant** `sm-gateway-service` (section 5.1) :

```
sm-config-service (8080) -> sm-registry-service (8761) -> sm-gateway-service (8888) -> services metier
```

## Tableau de bord

Interface web native Eureka disponible sur `http://localhost:8761` - liste en temps reel des
instances enregistrees, leur statut et leur derniere heartbeat.
