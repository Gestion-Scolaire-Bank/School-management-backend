# web-dashboard

> React.js (Vite) - Tableau de bord web pour l'Administrateur / Directeur (section 1.4)

Client web destine aux administrateurs d'etablissement et directeurs : supervision globale,
gestion des etablissements, suivi des paiements, diffusion d'annonces (cf. cas d'utilisation
"Administrateur / Directeur", section 2.1 du document de conception).

## Demarrage

```bash
cd clients/web-dashboard
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

Toutes les requetes passent par `sm-gateway-service` (voir `src/api/client.js`), jamais
directement vers un micro-service.

## Structure

```
src/
├── api/client.js          # instance axios + injection du token JWT
├── components/Layout.jsx  # navigation laterale
└── pages/
    ├── LoginPage.jsx           # UC2 - Se connecter
    ├── DashboardPage.jsx       # UC22 - Tableau de bord analytique
    ├── EstablishmentsPage.jsx  # UC23 - Configuration multi-etablissement
    ├── PaymentsPage.jsx        # UC12 - Rapport de recettes
    └── AnnouncementsPage.jsx   # UC19 - Diffuser une annonce
```

## A completer

- Ajouter un garde de route (route guard) verifiant la presence/validite du token JWT avant
  d'autoriser l'acces aux pages protegees.
- Chaque page appelle un endpoint reel du Gateway ; tant que le backend correspondant n'est pas
  implemente, un message de repli s'affiche (404/501 attendus - comportement normal en debut de
  projet).
