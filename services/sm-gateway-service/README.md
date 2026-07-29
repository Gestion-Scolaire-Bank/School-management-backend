# sm-gateway-service (S3)

> Stack technique : Spring Cloud Gateway / Kong - Port 8888 - JWT / RBAC

Porte d'entree unique de toute la plateforme. Implemente le patron *API Gateway* : aucun client
(mobile, web) ne communique directement avec les services metier - toutes les requetes transitent
obligatoirement par ce service. Trois responsabilites fondamentales : (1) le routage des requetes
vers le bon service metier, (2) la validation du token JWT et le controle d'acces RBAC, et (3) le
load balancing entre les instances d'un meme service.

## Responsabilites

- Routage de toutes les requetes entrantes vers les services metier appropries
- Validation du token JWT et verification des droits RBAC sur chaque requete
- Isolation automatique des instances defaillantes (circuit breaking)
- Propagation des headers d'authentification en aval (`X-User-Id`, `X-User-Role`)
- Limitation de debit (rate limiting) et protection contre les attaques

## Ordre de demarrage

Doit demarrer **en dernier**, apres `sm-config-service` et `sm-registry-service` (section 5.1) :

```
sm-config-service (8080) -> sm-registry-service (8761) -> sm-gateway-service (8888) -> services metier
```

## Routes configurees

Chaque micro-service metier est expose derriere un prefixe de route dedie (voir
`src/main/resources/application.yml`) :

| Route | Service cible |
|---|---|
| `/api/auth/**` | auth-service |
| `/api/v1/registrations/**` | registration-service |
| `/api/v1/payments/**` | payment-service |
| `/api/v1/presence/**` | presence-service |
| `/api/v1/notifications/**` | notification-service |
| `/api/v1/reports/**` | reportcard-service |
| `/api/v1/status/**` | userstatus-service |
| `/api/v1/whatsapp/**` | whatsapp-service |
| `/api/v1/pedagogic/**` | pedagogic-service |
| `/api/v1/school-id/**` | schoolid-service |
| `/api/v1/analytics/**` | analytics-service |
| `/api/v1/admin/**` | admin-service |

## A completer

Le filtre `src/main/java/cm/schoolmanage/gateway/filter/JwtAuthenticationFilter.java` contient un
squelette de filtre global (laisse-passer inconditionnel pour l'instant). L'equipe doit y
implementer : validation de la signature JWT, verification de la blacklist Redis, controle RBAC
par route/role, et propagation des en-tetes `X-User-Id` / `X-User-Role`.
