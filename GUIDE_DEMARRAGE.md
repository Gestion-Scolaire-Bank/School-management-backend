# Guide de demarrage - SchoolManage App

Guide pratique pour lancer le projet en local et se connecter pour la premiere fois.
Pour la structure du depot, la stack technique et le deploiement Kubernetes, voir
[`README.md`](./README.md).

## Sommaire

- [Prerequis](#prerequis)
- [1. Configuration](#1-configuration)
- [2. Lancer l'infrastructure partagee](#2-lancer-linfrastructure-partagee)
- [3. Lancer les micro-services](#3-lancer-les-micro-services)
- [4. Lancer le tableau de bord web](#4-lancer-le-tableau-de-bord-web)
- [5. Premiere connexion](#5-premiere-connexion)
- [6. Creer ses propres donnees](#6-creer-ses-propres-donnees)
- [Sauvegarder / restaurer](#sauvegarder--restaurer)
- [Arreter le projet](#arreter-le-projet)
- [Tout reinitialiser (repartir de zero)](#tout-reinitialiser-repartir-de-zero)
- [Depannage](#depannage)
- [Ce qui n'est pas encore configure](#ce-qui-nest-pas-encore-configure)

## Prerequis

- Docker + Docker Compose
- Node.js 20+ (pour lancer le tableau de bord web en dev)

Pas besoin de JDK/Python/Node installes en local pour les micro-services eux-memes : ils
tournent tous dans des conteneurs Docker qui embarquent leur propre environnement.

## 1. Configuration

> **Si un fichier `.env` existe deja a la racine, ne PAS lancer la commande ci-dessous.**
> `cp` l'ecraserait silencieusement et remplacerait vos vrais mots de passe par les valeurs
> d'exemple generiques - or Postgres/Redis/MongoDB gardent en memoire les mots de passe reels
> avec lesquels ils ont ete inities la premiere fois. Un `.env` qui ne correspond plus a ces
> mots de passe casse la connexion aux bases pour tous les services (pas seulement la
> connexion au compte admin). Cette etape ne sert qu'au tout premier lancement du projet.

```bash
cp .env.example .env
```

Le fichier `.env.example` contient des valeurs par defaut fonctionnelles pour le developpement
local (mots de passe "changeme"/"schoolmanage_dev_pwd"). Trois familles de variables :

- **Mots de passe d'infrastructure** (Postgres, Redis, Mongo, MinIO, JWT) : a changer avant
  tout usage reel, meme en interne - ce sont ceux qui protegent les donnees.
- **Cles de services externes** (Mobile Money, SendGrid, Twilio, WhatsApp Cloud API) : a
  renseigner quand vous aurez les vrais acces aupres de ces fournisseurs (cf.
  [dernier paragraphe](#ce-qui-nest-pas-encore-configure)).
- **URLs internes** (config-server, registry, gateway) : ne pas toucher, elles pointent vers les
  noms de service Docker Compose.

## 2. Lancer l'infrastructure partagee

```bash
# Une seule fois : cree le reseau Docker partage par tous les conteneurs
docker network create schoolmanage-net

# Postgres, Redis, Kafka, MongoDB, MinIO, Prometheus, Grafana
docker compose -f docker-compose.infra.yml up -d
```

Attendez que tout soit sain avant de continuer :

```bash
docker compose -f docker-compose.infra.yml ps
```

## 3. Lancer les micro-services

```bash
docker compose up -d --build
```

L'ordre de demarrage (config -> registry -> gateway -> les 12 services metier) est gere
automatiquement par les `depends_on: condition: service_healthy` du fichier compose - inutile de
demarrer les services un par un.

Premier build : plusieurs minutes (compilation Java/Maven pour 6 services). Verifiez l'etat :

```bash
docker compose ps
```

Tout doit afficher `healthy`. Pour ne reconstruire qu'un seul service apres une modification :

```bash
docker compose up -d --build auth-service
```

## 4. Lancer le tableau de bord web

```bash
cd clients/web-dashboard
npm install
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173). Le frontend appelle exclusivement le
Gateway (`http://localhost:8888`) - aucun micro-service metier n'est joignable directement
depuis le navigateur (verifie par conception, section securite).

## 5. Premiere connexion

Une base neuve n'a **aucun compte**. `auth-service` cree automatiquement un compte
Administrateur de demarrage a son tout premier lancement (uniquement si la table des
utilisateurs est vide), avec un mot de passe temporaire genere aleatoirement et affiche **une
seule fois** dans ses logs :

```bash
docker logs auth-service | grep -A 5 "Aucun compte"
```

```
Email    : admin@schoolmanage.local
Mot de passe temporaire : <genere aleatoirement>
```

Connectez-vous avec ces identifiants, puis changez immediatement le mot de passe via
**"Mot de passe oublie ?"** sur la page de connexion (envoie un lien de reinitialisation par
email, valable 1h).

> **Attention** : apres 5 echecs de connexion sur un meme email, le compte est bloque 15 minutes
> - meme si vous saisissez ensuite le bon mot de passe. En cas de blocage pendant le
> developpement, on peut lever la protection manuellement :
> ```bash
> docker exec sm-redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning DEL "sm:auth:login-attempts:admin@schoolmanage.local"
> ```

## 6. Creer ses propres donnees

Avec le compte Administrateur, l'ordre logique de saisie (chaque etape depend de la precedente) :

1. **Etablissements** - au moins un, avant tout le reste.
2. **Classes & matieres** - classes et matieres rattachees a un etablissement, puis programme
   (matieres enseignees par classe) et affectations d'enseignants.
3. **Inscriptions** - eleves (rattaches a une classe) et personnel. Un compte utilisateur
   (Parent/Enseignant/Directeur) est cree automatiquement pour chaque personne inscrite, avec un
   email de definition de mot de passe.
4. **Paiements & recettes** - tarifs (frais de scolarite) par etablissement/classe/annee, avant
   que les parents ne puissent payer ou qu'un paiement en especes ne puisse etre enregistre.

Le reste (notes, presence, ressources, annonces, statuts) se remplit au fil de l'usage normal.

## Sauvegarder / restaurer

```bash
# Sauvegarde (Postgres, MongoDB, Redis, MinIO) vers ./backups/AAAAMMJJ-HHMMSS/
./infra/backup/backup.sh

# Restauration - ECRASE les donnees actuelles, demande confirmation
./infra/backup/restore.sh ./backups/20260115-020000
```

Details, planification automatique (cron) et politique de conservation :
[`infra/backup/README.md`](./infra/backup/README.md).

## Arreter le projet

```bash
docker compose down                          # micro-services (garde les donnees)
docker compose -f docker-compose.infra.yml down   # infrastructure (garde les donnees, volumes conserves)
```

## Tout reinitialiser (repartir de zero)

Pour vider integralement le contenu (etablissements, classes, eleves, notes, paiements, comptes,
fichiers uploades) sans reinstaller le projet :

```bash
# 1. Sauvegarder par securite (fortement recommande)
./infra/backup/backup.sh

# 2. Vider chaque base Postgres (a repeter pour les 11 bases sm_*_db)
docker exec sm-postgres psql -U schoolmanage -d sm_admin_db -c "
DO \$\$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END \$\$;"

# 3. Vider MongoDB (groupes/messages WhatsApp)
docker exec sm-mongo mongosh --quiet -u "$MONGO_ROOT_USER" -p "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin --eval '
    db.getSiblingDB("sm_whatsapp").groups.deleteMany({});
    db.getSiblingDB("sm_whatsapp").broadcasts.deleteMany({});'

# 4. Vider les fichiers uploades (MinIO) - via un conteneur mc temporaire
docker run --rm --network schoolmanage-net --entrypoint sh minio/mc:latest -c "
  mc alias set local http://minio:9000 \$MINIO_ROOT_USER \$MINIO_ROOT_PASSWORD
  mc rm --recursive --force local/sm-pedagogic-dev
  mc rm --recursive --force local/sm-reportcard-dev"

# 5. Vider Redis et redemarrer auth-service/admin-service pour recreer le compte de demarrage
#    et la configuration globale par defaut
docker exec sm-redis redis-cli -a "$REDIS_PASSWORD" --no-auth-warning FLUSHALL
docker compose restart auth-service admin-service
```

Reprenez ensuite a l'etape [Premiere connexion](#5-premiere-connexion).

## Depannage

**Un service reste `unhealthy` ou redemarre en boucle**
```bash
docker logs <nom-du-service> --tail 100
```
Cause frequente : l'infrastructure (`docker-compose.infra.yml`) n'est pas demarree ou pas encore
saine au moment ou le service applicatif tente de s'y connecter.

**`docker compose up` echoue avec une erreur de reseau**
Le reseau `schoolmanage-net` doit exister avant de lancer les deux fichiers compose - voir
[etape 2](#2-lancer-linfrastructure-partagee).

**Impossible de se connecter meme avec le bon mot de passe**
Voir l'avertissement sur la protection anti-brute-force dans
[Premiere connexion](#5-premiere-connexion).

**MongoDB refuse la connexion depuis whatsapp-service**
Verifiez que `SM_WHATSAPP_MONGO_URI` dans `.env` contient bien les identifiants
(`mongodb://<user>:<password>@mongo:27017/sm_whatsapp?authSource=admin`) et qu'ils correspondent
a `MONGO_ROOT_USER`/`MONGO_ROOT_PASSWORD`.

## Ce qui n'est pas encore configure

Le paiement Mobile Money (`SM_PAYMENT_MTN_API_KEY`/`SM_PAYMENT_ORANGE_API_KEY`) necessite de
vrais identifiants MTN MoMo / Orange Money (compte marchand aupres de l'operateur) - tant qu'ils
valent `changeme`, toute tentative de paiement Mobile Money echoue proprement (transaction
marquee `FAILED` avec le motif de l'erreur). Le paiement en especes (enregistre par un
Administrateur) fonctionne sans configuration supplementaire.
