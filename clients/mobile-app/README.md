# mobile-app

> React Native (Expo) - Application mobile pour Parents / Enseignants (section 1.4)

Client mobile iOS/Android destine aux parents et enseignants : consultation de la scolarite,
paiement Mobile Money, check-in de presence par QR code, bulletins, notifications
(cf. cas d'utilisation "Parent" et "Enseignant", section 2.1 du document de conception).

## Demarrage

```bash
cd clients/mobile-app
cp .env.example .env
npm install
npm start             # ouvre Expo Dev Tools - scanner le QR avec l'app Expo Go
```

## Structure

```
App.tsx                          # navigation (React Navigation, stack)
src/
├── api/client.ts                # instance axios + injection du token JWT
└── screens/
    ├── LoginScreen.tsx           # UC2 - Se connecter
    ├── HomeScreen.tsx            # menu principal
    ├── PresenceScanScreen.tsx    # UC13 - Scanner QR (check-in/out)
    ├── PaymentScreen.tsx         # UC9 - Payer les frais de scolarite (Mobile Money)
    ├── ReportCardScreen.tsx      # UC18 - Consulter le bulletin
    └── NotificationsScreen.tsx   # UC21 - Recevoir une notification
```

Toutes les requetes passent par `sm-gateway-service` (voir `src/api/client.ts`), jamais
directement vers un micro-service.

## A completer

- Persister le token JWT (ex. `expo-secure-store`) au lieu de le garder uniquement en memoire.
- Ajouter un ecran d'inscription (UC1) et de gestion de profil (UC5).
- Chaque ecran appelle un endpoint reel du Gateway ; tant que le backend correspondant n'est pas
  implemente, un message de repli s'affiche (comportement normal en debut de projet).

## Note sur le scaffold

Ce squelette utilise Expo (structure minimale, sans les dossiers natifs `android/`/`ios/`
generes automatiquement par `expo prebuild` ou `react-native init`). Lancer `npx expo prebuild`
si l'equipe a besoin de code natif personnalise.
