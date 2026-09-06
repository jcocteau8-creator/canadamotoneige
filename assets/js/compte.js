/* =====================================================================
   Logique de la page compte.html : bascule entre les 3 etats
   (non configure / deconnecte / connecte), formulaires de connexion,
   inscription, reservation, et affichage de l'historique.
   ===================================================================== */
(function () {
  'use strict';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function params() { return new URLSearchParams(location.search); }

  var STATUTS_RESA = {
    devis: 'Devis en préparation', confirmee: 'Confirmée', soldee: 'Soldée',
    terminee: 'Terminée', annulee: 'Annulée'
  };
  var STATUTS_CMD = {
    paiement_attente: 'Paiement à organiser', payee: 'Payée', preparee: 'Préparée',
    remise: 'Remise sur place', expediee: 'Expédiée', annulee: 'Annulée'
  };

  function afficherErreur(formId, texte) {
    var p = $('.compte-erreur[data-for="' + formId + '"]');
    if (p) { p.textContent = texte || ''; p.style.display = texte ? 'block' : 'none'; }
  }
  function afficherOk(formId, texte) {
    var p = $('.compte-ok[data-for="' + formId + '"]');
    if (p) { p.textContent = texte || ''; p.style.display = texte ? 'block' : 'none'; }
  }

  // ---------- bascule d'etat ----------
  // profile est fourni directement par onChange : pas besoin (et pas
  // fiable) de le redemander via un getter separe apres coup.
  function majEtat(user, profile) {
    var auth = window.CM_AUTH;
    $('#etatNonConfigure').hidden = auth.isConfigured;
    $('#etatDeconnecte').hidden = !auth.isConfigured || !!user;
    $('#etatConnecte').hidden = !auth.isConfigured || !user;
    if (user) {
      $('#compteBonjour').textContent = 'Bonjour ' + ((profile && profile.prenom) || user.email);
      chargerReservations();
      chargerCommandes();
      traiterCommandeEnAttente();
    }
  }

  // Si le client arrivait de la boutique sans etre connecte, sa commande a
  // ete mise de cote (sessionStorage) avant la redirection vers cette page.
  // Une fois connecte (ou tout juste inscrit), on l'enregistre pour de vrai.
  var commandeEnAttenteTraitee = false;
  function traiterCommandeEnAttente() {
    if (commandeEnAttenteTraitee) return;
    var brut;
    try { brut = sessionStorage.getItem('cm_commande_attente'); } catch (e) { brut = null; }
    if (!brut) return;
    commandeEnAttenteTraitee = true;
    var detail;
    try { detail = JSON.parse(brut); } catch (e) { detail = null; }
    try { sessionStorage.removeItem('cm_commande_attente'); } catch (e) {}
    if (!detail) return;
    window.CM_AUTH.creerCommande(detail).then(function () {
      afficherOk('formConnexion', '');
      var banniere = document.createElement('p');
      banniere.className = 'compte-ok';
      banniere.style.display = 'block';
      banniere.textContent = 'Votre commande (' + detail.article + ') a été enregistrée : nous vous contactons pour le paiement et la remise.';
      $('#etatConnecte .container').insertBefore(banniere, $('#etatConnecte .container').firstChild.nextSibling);
      chargerCommandes();
    }).catch(function () { /* silencieux : la commande reste tentable depuis la boutique */ });
  }

  // ---------- onglets connexion / inscription ----------
  $$('.compte-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $$('.compte-tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      $$('.compte-form').forEach(function (f) {
        var on = f.getAttribute('data-tab-panel') === tab.dataset.tab;
        f.hidden = !on; f.classList.toggle('active', on);
      });
    });
  });

  // ---------- connexion ----------
  var fc = $('#formConnexion');
  if (fc) fc.addEventListener('submit', function (e) {
    e.preventDefault();
    afficherErreur('formConnexion', '');
    var f = new FormData(fc);
    window.CM_AUTH.connecter(f.get('email'), f.get('password')).catch(function (err) {
      afficherErreur('formConnexion', traduireErreur(err));
    });
  });

  // ---------- inscription ----------
  var fi = $('#formInscription');
  if (fi) fi.addEventListener('submit', function (e) {
    e.preventDefault();
    afficherErreur('formInscription', '');
    var f = new FormData(fi);
    window.CM_AUTH.inscrire(f.get('email'), f.get('password'), f.get('nom'), f.get('prenom'))
      .catch(function (err) { afficherErreur('formInscription', traduireErreur(err)); });
  });

  function traduireErreur(err) {
    var m = (err && err.message) || '';
    if (/already registered|already exists/i.test(m)) return 'Un compte existe déjà avec ce courriel.';
    if (/invalid login credentials/i.test(m)) return 'Courriel ou mot de passe incorrect.';
    if (/password.*6/i.test(m)) return 'Le mot de passe doit faire au moins 6 caractères.';
    return m || "Une erreur est survenue, réessayez.";
  }

  // ---------- deconnexion ----------
  var bd = $('#btnDeconnexion');
  if (bd) bd.addEventListener('click', function () { window.CM_AUTH.deconnecter(); });

  // ---------- liste des forfaits pour le formulaire de reservation ----------
  var forfaitsCache = [];
  function chargerListeForfaits() {
    return fetch('data/forfaits.json', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { forfaits: [] }; })
      .then(function (d) {
        forfaitsCache = d.forfaits || [];
        var sel = $('#selectForfait');
        if (!sel) return;
        sel.innerHTML = forfaitsCache.map(function (f) {
          return '<option value="' + f.page + '">' + f.nom + '</option>';
        }).join('');
        var demande = params().get('forfait');
        if (demande && forfaitsCache.some(function (f) { return f.page === demande; })) {
          sel.value = demande;
        }
      })
      .catch(function () {});
  }

  // ---------- soumission d'une demande de reservation ----------
  var fr = $('#formReservation');
  if (fr) fr.addEventListener('submit', function (e) {
    e.preventDefault();
    afficherErreur('formReservation', ''); afficherOk('formReservation', '');
    var f = new FormData(fr);
    var page = f.get('forfait');
    var forfait = forfaitsCache.filter(function (x) { return x.page === page; })[0];
    window.CM_AUTH.creerReservation({
      forfait_page: page,
      forfait_nom: forfait ? forfait.nom : page,
      formule: f.get('formule'),
      debut: f.get('debut'),
      pax: parseInt(f.get('pax'), 10) || 1,
      message: f.get('message') || null
    }).then(function () {
      afficherOk('formReservation', 'Demande envoyée : nous revenons vers vous avec un devis sous peu.');
      fr.reset();
      chargerReservations();
    }).catch(function (err) {
      afficherErreur('formReservation', traduireErreur(err));
    });
  });

  // ---------- historiques ----------
  function chargerReservations() {
    window.CM_AUTH.mesReservations().then(function (rows) {
      var tb = $('#tableReservations tbody');
      $('#videReservations').hidden = rows.length > 0;
      $('#tableReservations').hidden = rows.length === 0;
      tb.innerHTML = rows.map(function (r) {
        return '<tr><td>' + esc(r.forfait_nom) + '</td><td>' + (r.formule === 'solo' ? 'Solo' : 'Duo') +
          '</td><td>' + dateFR(r.debut) + '</td><td class="num">' + r.pax + '</td>' +
          '<td><span class="compte-tag compte-tag-' + r.statut + '">' + (STATUTS_RESA[r.statut] || r.statut) + '</span></td></tr>';
      }).join('');
    });
  }
  function chargerCommandes() {
    window.CM_AUTH.mesCommandes().then(function (rows) {
      var tb = $('#tableCommandes tbody');
      $('#videCommandes').hidden = rows.length > 0;
      $('#tableCommandes').hidden = rows.length === 0;
      tb.innerHTML = rows.map(function (r) {
        return '<tr><td>' + esc(r.article) + '</td><td>' + esc(r.variante || '—') + '</td>' +
          '<td class="num">' + r.qte + '</td>' +
          '<td><span class="compte-tag compte-tag-' + r.statut + '">' + (STATUTS_CMD[r.statut] || r.statut) + '</span></td></tr>';
      }).join('');
    });
  }

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dateFR(d) { if (!d) return '—'; var p = String(d).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d; }

  // ---------- demarrage ----------
  chargerListeForfaits();
  if (window.CM_AUTH) {
    window.CM_AUTH.onChange(majEtat);
  } else {
    $('#etatNonConfigure').hidden = false;
  }
})();
