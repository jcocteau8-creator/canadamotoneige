/* =====================================================================
   Compte client — couche partagee au-dessus de Supabase.
   Chargee sur toutes les pages (juste apres supabase-config.js et le
   script Supabase CDN). Expose window.CM_AUTH, utilise par compte.html,
   les pages de forfait (reservation) et la boutique (commande).
   ===================================================================== */
(function () {
  'use strict';

  var PLACEHOLDER_URL = 'https://VOTRE-PROJET.supabase.co';
  var configured = !!(window.SUPABASE_URL && window.SUPABASE_URL !== PLACEHOLDER_URL &&
                       window.SUPABASE_ANON_KEY && window.supabase && window.supabase.createClient);

  var client = configured
    ? window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
    : null;

  var listeners = [];
  var currentUser = null;
  var currentProfile = null;

  function avertir(msg) {
    console.warn('[compte client] ' + msg);
  }

  if (!configured) {
    avertir("Supabase n'est pas configure : ouvrez assets/js/supabase-config.js et suivez les 3 etapes en commentaire. " +
            "En attendant, la connexion et les reservations sont desactivees sans faire planter la page.");
  }

  function notifier() {
    listeners.forEach(function (fn) { fn(currentUser, currentProfile); });
  }

  function chargerProfil(userId) {
    if (!client || !userId) return Promise.resolve(null);
    return client.from('profiles').select('*').eq('id', userId).single()
      .then(function (r) { return r.data || null; })
      .catch(function () { return null; });
  }

  function rafraichir() {
    if (!client) { notifier(); return Promise.resolve(); }
    return client.auth.getUser().then(function (r) {
      currentUser = (r.data && r.data.user) || null;
      return chargerProfil(currentUser && currentUser.id);
    }).then(function (p) {
      currentProfile = p;
      notifier();
    });
  }

  if (client) {
    client.auth.onAuthStateChange(function () { rafraichir(); });
  }

  window.CM_AUTH = {
    isConfigured: configured,
    client: client,

    // s'abonner aux changements de connexion : cb(user, profile)
    onChange: function (cb) {
      listeners.push(cb);
      cb(currentUser, currentProfile);
    },

    getUser: function () { return currentUser; },
    getProfile: function () { return currentProfile; },

    inscrire: function (email, motDePasse, nom, prenom) {
      if (!client) return Promise.reject(new Error("Compte client non configure pour l'instant."));
      return client.auth.signUp({
        email: email, password: motDePasse,
        options: { data: { nom: nom || '', prenom: prenom || '' } }
      }).then(function (r) {
        if (r.error) throw r.error;
        return rafraichir().then(function () { return r.data; });
      });
    },

    connecter: function (email, motDePasse) {
      if (!client) return Promise.reject(new Error("Compte client non configure pour l'instant."));
      return client.auth.signInWithPassword({ email: email, password: motDePasse })
        .then(function (r) {
          if (r.error) throw r.error;
          return rafraichir().then(function () { return r.data; });
        });
    },

    deconnecter: function () {
      if (!client) return Promise.resolve();
      return client.auth.signOut().then(rafraichir);
    },

    // ----- reservations -----
    creerReservation: function (donnees) {
      if (!client) return Promise.reject(new Error("Compte client non configure pour l'instant."));
      if (!currentUser) return Promise.reject(new Error('Vous devez etre connecte.'));
      donnees.client_id = currentUser.id;
      return client.from('reservations').insert(donnees).select().single()
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    mesReservations: function () {
      if (!client || !currentUser) return Promise.resolve([]);
      return client.from('reservations').select('*').eq('client_id', currentUser.id)
        .order('created_at', { ascending: false })
        .then(function (r) { return r.data || []; });
    },

    // ----- commandes boutique -----
    creerCommande: function (donnees) {
      if (!client) return Promise.reject(new Error("Compte client non configure pour l'instant."));
      if (!currentUser) return Promise.reject(new Error('Vous devez etre connecte.'));
      donnees.client_id = currentUser.id;
      return client.from('commandes').insert(donnees).select().single()
        .then(function (r) { if (r.error) throw r.error; return r.data; });
    },
    mesCommandes: function () {
      if (!client || !currentUser) return Promise.resolve([]);
      return client.from('commandes').select('*').eq('client_id', currentUser.id)
        .order('created_at', { ascending: false })
        .then(function (r) { return r.data || []; });
    }
  };

  if (client) rafraichir();
})();
