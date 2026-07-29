# infra/k8s

Manifests Kubernetes de production pour la plateforme SchoolManage App (section 9.2 du document
de conception). Un namespace dedie (`schoolmanage-prod`), un Deployment + Service par
micro-service (`services/`), un Ingress unique exposant `sm-gateway-service`, et deux
HorizontalPodAutoscaler sur les services a forte charge (`payment-service`, `presence-service`).

## Contenu

```
infra/k8s/
├── namespace.yaml                    # namespaces schoolmanage-prod / schoolmanage-test
├── configmap-shared.example.yaml     # variables non sensibles (a copier en configmap-shared.yaml)
├── secrets.example.yaml              # identifiants/cles (a copier en secrets.yaml, JAMAIS commit)
├── ingress.yaml                      # point d'entree public (sm-gateway-service uniquement)
├── hpa-payment-service.yaml          # auto-scaling CPU > 70%, 2-10 replicas
├── hpa-presence-service.yaml         # auto-scaling CPU > 70%, 2-10 replicas
└── services/                        # 1 Deployment + 1 Service par micro-service (x15)
```

## Deploiement (ordre recommande)

```bash
# 1. Namespaces
kubectl apply -f infra/k8s/namespace.yaml

# 2. Configuration (adapter les .example.yaml au prealable)
cp infra/k8s/configmap-shared.example.yaml infra/k8s/configmap-shared.yaml   # a adapter
cp infra/k8s/secrets.example.yaml infra/k8s/secrets.yaml                     # a adapter, ne pas committer
kubectl apply -f infra/k8s/configmap-shared.yaml
kubectl apply -f infra/k8s/secrets.yaml

# 3. Socle S1-S3 (config -> registry -> gateway), les initContainers respectent l'ordre
kubectl apply -f infra/k8s/services/sm-config-service.yaml
kubectl apply -f infra/k8s/services/sm-registry-service.yaml
kubectl apply -f infra/k8s/services/sm-gateway-service.yaml

# 4. Services metier (paralleles, les initContainers ne sont pas necessaires ici car le Gateway
#    gere la decouverte via Eureka independamment de l'ordre de deploiement)
kubectl apply -f infra/k8s/services/ -n schoolmanage-prod

# 5. Ingress + autoscaling
kubectl apply -f infra/k8s/ingress.yaml
kubectl apply -f infra/k8s/hpa-payment-service.yaml
kubectl apply -f infra/k8s/hpa-presence-service.yaml
```

## Notes

- Remplacer `ghcr.io/OWNER/schoolmanage-{service}:latest` par le namespace GitHub reel une fois le
  depot cree (`OWNER` = organisation/utilisateur GitHub de l'equipe).
- Le pipeline CI/CD (`.github/workflows/ci-cd.yml`) applique automatiquement ces manifests sur les
  namespaces `schoolmanage-test` (etape "Deploy staging") puis `schoolmanage-prod` (etape "Prod",
  apres validation manuelle).
- Strategie de deploiement par defaut : **Rolling Update** (mise a jour progressive sans
  interruption de service), avec rollback automatique si les health checks echouent
  (cf. section 9.2 du document de conception).
