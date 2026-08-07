// Topics concrets geres par mapEventToNotification ci-dessous. Utilise pour l'abonnement Kafka
// explicite (cf. src/index.js) plutot qu'une regex de pattern de domaine : avec une regex,
// kafkajs ne decouvre les topics crees APRES le demarrage du consumer qu'au prochain rafraichissement
// de metadonnees (delai variable, potentiellement plusieurs minutes) - un abonnement explicite,
// lui, cree le topic (vide) des la souscription si besoin, donc aucun evenement n'est manque.
const KNOWN_TOPICS = [
  'sm.payment.completed',
  'sm.payment.failed',
  'sm.auth.account.created',
  'sm.auth.password.reset.requested',
  'sm.reportcard.available',
  'sm.presence.absence.detected',
  'sm.userstatus.changed',
  'sm.schoolid.generated',
];

// "recipientKind" indique quel annuaire interroger pour resoudre recipientUserId en adresse
// reelle (cf. src/directory/directoryClient.js) :
//   - 'STUDENT' : recipientUserId est un identifiant de dossier d'inscription
//     (registration-service) -> on resout le contact du PARENT associe.
//   - 'USER'    : recipientUserId est un compte reel (auth-service) -> on resout son email.
// Absent quand recipientAddress est deja fourni directement par l'evenement (aucune resolution
// necessaire, ex. sm.auth.user.registered).

// Convertit un evenement Kafka entrant en une notification a creer, ou null si l'evenement
// n'est pas exploitable (topic inconnu, champs manquants pour construire un message).
//
// Seuls les topics ci-dessus ont un schema de payload connu avec certitude, car ce sont les
// services que nous avons nous-memes implementes (auth, presence, reportcard, userstatus,
// schoolid, payment).
function mapEventToNotification(topic, payload) {
  switch (topic) {
    case 'sm.payment.completed':
      if (!payload.userId) return null;
      return {
        recipientUserId: payload.userId,
        recipientKind: 'USER',
        channel: 'EMAIL',
        type: 'PAYMENT_COMPLETED',
        subject: 'Recu de paiement',
        body: `Votre paiement de ${payload.montant || ''} a ete confirme. Recu : ${payload.recu_url || ''}`,
      };

    case 'sm.payment.failed':
      if (!payload.userId) return null;
      return {
        recipientUserId: payload.userId,
        recipientKind: 'USER',
        channel: 'EMAIL',
        type: 'PAYMENT_FAILED',
        subject: 'Echec de paiement',
        body: `Votre paiement a echoue. Motif : ${payload.motif || 'non precise'}`,
      };

    // Compte nouvellement cree (parent/enseignant/directeur via Inscriptions, ou admin de
    // demarrage) : un seul email "bienvenue + definissez votre mot de passe", distinct du
    // texte "reinitialisation" ci-dessous qui ne s'applique qu'a un vrai oubli de mot de passe
    // ulterieur - avant cette fusion, la personne recevait un WELCOME sans lien PUIS un
    // "reinitialisation de votre mot de passe" pour un mot de passe qu'elle n'avait jamais eu.
    case 'sm.auth.account.created':
      if (!payload.email || !payload.setPasswordUrl) return null;
      return {
        recipientAddress: payload.email,
        channel: 'EMAIL',
        type: 'WELCOME',
        subject: 'Bienvenue sur SchoolManage - definissez votre mot de passe',
        body: `Bonjour ${payload.nom || ''}, votre compte a ete cree. Cliquez sur ce lien pour definir votre mot de passe (valable 1h) : ${payload.setPasswordUrl}`,
      };

    case 'sm.auth.password.reset.requested':
      if (!payload.email || !payload.resetUrl) return null;
      return {
        recipientAddress: payload.email,
        channel: 'EMAIL',
        type: 'PASSWORD_RESET',
        subject: 'Reinitialisation de votre mot de passe',
        body: `Bonjour ${payload.nom || ''}, cliquez sur ce lien pour choisir un nouveau mot de passe (valable 1h) : ${payload.resetUrl}`,
      };

    case 'sm.reportcard.available':
      if (!payload.studentId) return null;
      return {
        recipientUserId: payload.studentId,
        recipientKind: 'STUDENT',
        channel: 'EMAIL',
        type: 'REPORTCARD_AVAILABLE',
        subject: 'Bulletin disponible',
        body: `Le bulletin est disponible : ${payload.bulletin_url || ''}`,
      };

    case 'sm.presence.absence.detected':
      if (!payload.studentId) return null;
      return {
        recipientUserId: payload.studentId,
        recipientKind: 'STUDENT',
        channel: 'SMS',
        type: 'ABSENCE_ALERT',
        subject: null,
        body: `Absence non justifiee detectee le ${payload.date || ''}`,
      };

    case 'sm.userstatus.changed':
      if (!payload.userId) return null;
      // PUSH ecarte volontairement : aucun service ne suit de token push/appareil pour
      // l'instant, un tel canal ne pourrait jamais aboutir. EMAIL est reellement resolvable.
      return {
        recipientUserId: payload.userId,
        recipientKind: 'USER',
        channel: 'EMAIL',
        type: 'STATUS_CHANGED',
        subject: 'Changement de statut',
        body: `Statut mis a jour : ${payload.statusType || ''}`,
      };

    case 'sm.schoolid.generated':
      if (!payload.studentId) return null;
      return {
        recipientUserId: payload.studentId,
        recipientKind: 'STUDENT',
        channel: 'EMAIL',
        type: 'SCHOOLID_GENERATED',
        subject: "Carte d'identite scolaire generee",
        body: `Votre carte d'identite scolaire est disponible : ${payload.idCardUrl || ''}`,
      };

    default:
      return null;
  }
}

module.exports = { mapEventToNotification, KNOWN_TOPICS };
