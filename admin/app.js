/* =====================================================================
   Back-office Canada Motoneige
   Application autonome : aucune dependance, aucun serveur.
   Les donnees vivent dans le localStorage du navigateur (voir Parametres
   pour la sauvegarde, la restauration et les limites de ce choix).
   ===================================================================== */
(function () {
'use strict';

var KEY = 'cm_admin_v1', VERSION = '1.0';
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
  return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

/* ---------- formats ---------- */
function money(n, dev) {
  n = Number(n) || 0;
  var s = n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return dev === 'EUR' ? s + ' €' : s + ' $';
}
function dateFR(d) {
  if (!d) return '—';
  var p = String(d).split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d;
}
var today = function () { return new Date().toISOString().slice(0, 10); };
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }

/* ---------- donnees ---------- */
var FORFAITS = [
  ['La Mise en Bouche', 600, 1000, '2 jours · 1 nuit', 150, 'Hôtel', 'raid', 'raid-mise-en-bouche.html'],
  ['Mix Express', 750, 900, '2 jours · 1 nuit', 0, 'Motoneige', 'mix', 'forfait-mix-express.html'],
  ["L'Escapade", 1100, 1600, '3 jours · 2 nuits', 500, 'Pourvoiries', 'raid', 'raid-escapade.html'],
  ['Mix Découverte', 1150, 1500, '3 jours · 2 nuits', 0, 'Motoneige', 'mix', 'forfait-mix-decouverte.html'],
  ["L'Évasion en Nature", 1900, 2700, '5 jours · 4 nuits', 700, 'Chalets, auberges, pourvoiries', 'raid', 'raid-evasion-nature.html'],
  ['Mix Évasion', 2100, 2500, '5 jours · 4 nuits', 0, 'Motoneige', 'mix', 'forfait-mix-evasion.html'],
  ["L'Initiation Écono", 2300, 3000, '7 jours · 6 nuits', 700, 'Chalets, auberges, pourvoiries', 'raid', 'raid-initiation-econo.html'],
  ["L'Aventure Nordique", 2500, 3200, '7 jours · 6 nuits', 1000, 'Chalets, auberges, pourvoiries', 'raid', 'raid-aventure-nordique.html'],
  ['Mix Parfait', 2600, 3250, '7 jours · 6 nuits', 0, 'Motoneige', 'mix', 'forfait-mix-parfait.html'],
  ['Le Périple du Sportif', 2700, 3250, '7 jours · 6 nuits', 1200, 'Pourvoiries, auberges, hôtels', 'raid', 'raid-periple-sportif.html'],
  ["L'Aventure Ultime", 3000, 3750, '9 jours · 8 nuits', 1000, 'Chalets, auberges, pourvoiries', 'raid', 'raid-aventure-ultime.html'],
  ['Mix Ultime', 3250, 3900, '9 jours · 8 nuits', 0, 'Motoneige', 'mix', 'forfait-mix-ultime.html'],
  ['Défi Hors-Piste', 0, 3500, '7 jours · 6 nuits', 1200, 'Pourvoiries, auberges, hôtels', 'raid', 'raid-defi-hors-piste.html']
];
var EQUIPE = [
  ['Bruno Vaillant', 'Fondateur & dirigeant', 'permanent'],
  ['Erik B.', 'Guide de sentier', 'saisonnier'],
  ['Axel F.', 'Guide & ouvreur de sentier', 'saisonnier'],
  ['Aélyne', 'Guide · accueil', 'saisonnier'],
  ['Adrien', 'Responsable base de loisirs', 'permanent'],
  ['Daniel T.', 'Instructeur & guide quad/buggy', 'permanent'],
  ['Victor N.', 'Administration & comptabilité', 'permanent'],
  ['Guillaume', 'Guide de raid', 'saisonnier'],
  ['Bastien', 'Guide de raid', 'saisonnier'],
  ['Joé', 'Guide de raid', 'saisonnier'],
  ['Jonathan', 'Guide de raid', 'saisonnier'],
  ['Hugo', 'Guide de raid', 'saisonnier']
];
var PRODUITS = [
  ['T-shirt Canada Motoneige', 39], ['Pull Canada Motoneige', 79],
  ['Bonnet Canada Motoneige', 29], ['Chaussettes de laine', 24],
  ['Cache-cou Canada Motoneige', 22]
];

function seed() {
  var db = {
    meta: { version: VERSION, pin: '0000', tauxEUR: 1.47, tps: 5, tvq: 9.975, acompte: 50, soldeJours: 90, devisJours: 20 },
    clients: [], reservations: [], compta: [], formations: [], heures: [], commandes: [], machines: [],
    forfaits: FORFAITS.map(function (f) {
      return { id: uid(), nom: f[0], prix: f[1], prixSolo: f[2], devise: 'CAD', duree: f[3],
               km: f[4], hebergement: f[5], type: f[6], page: f[7], capacite: 12, actif: true };
    }),
    employes: EQUIPE.map(function (e) {
      return { id: uid(), nom: e[0], poste: e[1], contrat: e[2], tel: '', email: '', taux: 0, embauche: '', actif: true };
    }),
    stock: []
  };
  PRODUITS.forEach(function (p) {
    var tailles = /Bonnet|Cache-cou/.test(p[0]) ? ['Unique'] : (/Chaussettes/.test(p[0]) ? ['36-40', '41-45'] : ['S', 'M', 'L']);
    ['Noir', 'Blanc'].forEach(function (c) {
      tailles.forEach(function (t) {
        db.stock.push({ id: uid(), produit: p[0], prix: p[1], couleur: c, taille: t, quantite: 0, seuil: 3 });
      });
    });
  });
  return db;
}

var DB;
var ETAT = { source: '?', ecriture: null };
function load() {
  try { DB = JSON.parse(localStorage.getItem(KEY)); } catch (e) { DB = null; }
  if (!DB || !DB.meta) { DB = seed(); save(); }
  ['clients','reservations','compta','formations','heures','commandes','machines','forfaits','employes','stock']
    .forEach(function (k) { if (!DB[k]) DB[k] = []; });
  return DB;
}
function save() { localStorage.setItem(KEY, JSON.stringify(DB)); }

function toast(msg) {
  var t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2400);
}

/* ---------- synchronisation avec le site ---------- */
// data/forfaits.json est genere depuis les pages du site : c'est lui qui fait
// foi pour les tarifs. On l'aligne a chaque demarrage, en conservant les
// champs propres au back-office (capacite, notes...).
function chargerForfaits(cb) {
  fetch('../data/forfaits.json', { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.forfaits || !d.forfaits.length) throw new Error('vide');

      // l'identifiant devient la page : stable d'un chargement a l'autre,
      // donc les reservations ne perdent jamais leur forfait
      var parNom = {}, remap = {};
      DB.forfaits.forEach(function (f) {
        parNom[String(f.nom || '').trim().toLowerCase()] = f;
      });

      DB.forfaits = d.forfaits.map(function (src) {
        var anc = parNom[String(src.nom || '').trim().toLowerCase()] || {};
        if (anc.id && anc.id !== src.page) remap[anc.id] = src.page;
        return {
          id: src.page, page: src.page, nom: src.nom, duree: src.duree, type: src.type,
          devise: src.devise || 'CAD',
          prix: Number(src.prixDuo) || 0, prixSolo: Number(src.prixSolo) || 0,
          km: anc.km || 0, hebergement: anc.hebergement || '',
          capacite: anc.capacite || 12, actif: anc.actif !== false
        };
      });
      DB.reservations.forEach(function (r) {
        if (remap[r.forfaitId]) r.forfaitId = remap[r.forfaitId];
      });
      save();
      ETAT.source = 'fichier';
      cb(true);
    })
    .catch(function () { ETAT.source = 'local'; cb(false); });
}

function dedupeForfaits() {
  // on trie d'abord pour que l'exemplaire le mieux renseigne (celui qui a une
  // page et un prix solo) soit rencontre en premier et donc conserve
  var ordre = DB.forfaits.slice().sort(function (a, b) {
    return ((b.page ? 2 : 0) + (b.prixSolo ? 1 : 0)) - ((a.page ? 2 : 0) + (a.prixSolo ? 1 : 0));
  });
  var vus = {}, garder = [], remap = {};
  ordre.forEach(function (f) {
    var cle = String(f.nom || f.page || f.id).trim().toLowerCase();
    if (vus[cle]) { remap[f.id] = vus[cle]; return; }
    vus[cle] = f.id;
    garder.push(f);
  });
  var n = DB.forfaits.length - garder.length;
  if (!n) return 0;
  DB.forfaits = garder;
  DB.reservations.forEach(function (r) {
    if (remap[r.forfaitId]) r.forfaitId = remap[r.forfaitId];
  });
  save();
  return n;
}

/* ---------- ecriture directe dans le dossier du site ----------
   Avec l'API File System Access, le back-office peut ecrire lui-meme
   data/forfaits.json. Une autorisation est demandee une seule fois ;
   la reference du dossier est conservee dans IndexedDB. */
var dirHandle = null;

function idbStore(mode, cb) {
  var r = indexedDB.open('cm_admin_fs', 1);
  r.onupgradeneeded = function () { r.result.createObjectStore('h'); };
  r.onsuccess = function () {
    try { cb(r.result.transaction('h', mode).objectStore('h')); }
    catch (e) { cb(null); }
  };
  r.onerror = function () { cb(null); };
}
function memoriserDossier(h) { idbStore('readwrite', function (o) { if (o) o.put(h, 'dir'); }); }
function relireDossier(cb) {
  if (!window.indexedDB) return cb(null);
  idbStore('readonly', function (o) {
    if (!o) return cb(null);
    var q = o.get('dir');
    q.onsuccess = function () { cb(q.result || null); };
    q.onerror = function () { cb(null); };
  });
}

function dossierDisponible() { return !!window.showDirectoryPicker; }

function connecterDossier() {
  if (!dossierDisponible()) {
    alert("Votre navigateur ne permet pas l'ecriture directe dans un dossier.\n\n" +
          "Utilisez Chrome ou Edge, ou passez par le bouton Publier vers le site.");
    return;
  }
  window.showDirectoryPicker({ mode: 'readwrite' }).then(function (h) {
    dirHandle = h;
    memoriserDossier(h);
    ecrireForfaits(function (ok) {
      toast(ok ? 'Dossier connecte, tarifs publies' : 'Dossier connecte');
      render();
    });
  }).catch(function () { /* annule par l'utilisateur */ });
}

function donneesForfaits() {
  return {
    maj: today(),
    forfaits: DB.forfaits.filter(function (f) { return f.page; }).map(function (f) {
      return { page: f.page, nom: f.nom, duree: f.duree, type: f.type,
               devise: f.devise || 'CAD', prixDuo: Number(f.prix) || 0,
               prixSolo: Number(f.prixSolo) || 0 };
    })
  };
}

// Publie les tarifs. Trois voies, de la plus automatique a la plus manuelle :
//  1. le serveur accepte l'ecriture (serve.py) -> rien a faire
//  2. un dossier a ete connecte -> ecriture directe
//  3. sinon -> l'appelant propose le telechargement
function ecrireForfaits(cb) {
  var txt = JSON.stringify(donneesForfaits(), null, 1);
  fetch('../data/forfaits.json', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: txt
  }).then(function (r) {
    if (r.ok) { ETAT.ecriture = 'serveur'; cb(true, 'serveur'); return; }
    ecrireViaDossier(txt, cb);
  }).catch(function () { ecrireViaDossier(txt, cb); });
}

function ecrireViaDossier(txt, cb) {
  if (!dirHandle) return cb(false);
  dirHandle.requestPermission({ mode: 'readwrite' })
    .then(function (etat) {
      if (etat !== 'granted') throw new Error('refuse');
      return dirHandle.getDirectoryHandle('data', { create: true });
    })
    .then(function (d) { return d.getFileHandle('forfaits.json', { create: true }); })
    .then(function (f) { return f.createWritable(); })
    .then(function (w) { return w.write(txt).then(function () { return w.close(); }); })
    .then(function () { cb(true, 'dossier'); })
    .catch(function () { cb(false); });
}

function publierForfaits() {
  var d = {
    maj: today(),
    forfaits: DB.forfaits.filter(function (f) { return f.page; }).map(function (f) {
      return { page: f.page, nom: f.nom, duree: f.duree, type: f.type,
               devise: f.devise || 'CAD', prixDuo: Number(f.prix) || 0,
               prixSolo: Number(f.prixSolo) || 0 };
    })
  };
  dl('forfaits.json', JSON.stringify(d, null, 1), 'application/json');
}

/* ---------- schema des modules ---------- */
function refOptions(coll, labelFn) {
  var f = function () { return DB[coll].map(function (r) { return { v: r.id, l: labelFn(r) }; }); };
  // on attache la collection et le libelle : les deduire du code source de la
  // fonction, comme avant, ne pouvait pas fonctionner
  f.coll = coll;
  f.libelle = labelFn;
  return f;
}
var nomClient = function (c) { return c.nom + (c.prenom ? ' ' + c.prenom : ''); };

var GENRE = { reservations: 'f', clients: 'm', forfaits: 'm', compta: 'f', employes: 'm',
  formations: 'f', heures: 'f', stock: 'm', commandes: 'f', machines: 'f' };
function art(key, forme) {
  var f = GENRE[key] === 'f';
  if (forme === 'nouveau') return f ? 'Nouvelle ' : 'Nouveau ';
  if (forme === 'un') return f ? 'une ' : 'un ';
  return f ? 'cette ' : 'ce ';
}

var SCHEMA = {
  reservations: {
    label: 'Réservations', groupe: 'Exploitation', icon: 'M8 2v4M16 2v4M3 10h18M5 6h14v15H5z',
    singulier: 'réservation', tri: 'debut', sens: -1,
    champs: [
      { k: 'ref', l: 'Référence', t: 'text', list: 1, def: function () { return 'R-' + new Date().getFullYear() + '-' + String(DB.reservations.length + 1).padStart(3, '0'); } },
      { k: 'clientId', l: 'Client', t: 'ref', req: 1, list: 1, opts: refOptions('clients', nomClient) },
      { k: 'forfaitId', l: 'Forfait', t: 'ref', req: 1, list: 1, opts: refOptions('forfaits', function (f) { return f.nom; }) },
      { k: 'debut', l: 'Départ', t: 'date', req: 1, list: 1, hint: 'Le retour se calcule tout seul à partir de la durée du forfait.' },
      { k: 'fin', l: 'Retour', t: 'date', list: 1, auto: 1 },
      { k: 'pax', l: 'Participants', t: 'number', req: 1, list: 1, def: 2 },
      { k: 'formule', l: 'Formule', t: 'select', list: 1, filtre: 1, def: 'duo',
        opts: [{ v: 'duo', l: 'Motoneige en duo' }, { v: 'solo', l: 'Motoneige en solo' }] },
      { k: 'total', l: 'Montant total', t: 'money', req: 1, list: 1 },
      { k: 'devise', l: 'Devise', t: 'select', opts: [{ v: 'CAD', l: 'Dollar canadien ($)' }, { v: 'EUR', l: 'Euro (€)' }], def: 'CAD' },
      { k: 'verse', l: 'Déjà versé', t: 'money', list: 1, def: 0 },
      { k: 'statut', l: 'Statut', t: 'select', list: 1, filtre: 1, def: 'devis',
        opts: [{ v: 'devis', l: 'Devis envoyé' }, { v: 'confirmee', l: 'Confirmée' }, { v: 'soldee', l: 'Soldée' }, { v: 'terminee', l: 'Terminée' }, { v: 'annulee', l: 'Annulée' }] },
      { k: 'guideId', l: 'Guide assigné', t: 'ref', list: 1, opts: refOptions('employes', function (e) { return e.nom; }) },
      { k: 'notes', l: 'Notes', t: 'textarea', full: 1 }
    ]
  },
  clients: {
    detail: 'renderClient',
    label: 'Clients', groupe: 'Exploitation', icon: 'M16 20v-2a4 4 0 00-8 0v2M12 12a4 4 0 100-8 4 4 0 000 8',
    singulier: 'client', tri: 'nom',
    champs: [
      { k: 'nom', l: 'Nom', t: 'text', req: 1, list: 1 },
      { k: 'prenom', l: 'Prénom', t: 'text', list: 1 },
      { k: 'email', l: 'Courriel', t: 'email', list: 1 },
      { k: 'tel', l: 'Téléphone', t: 'tel', list: 1 },
      { k: 'ville', l: 'Ville', t: 'text', list: 1 },
      { k: 'pays', l: 'Pays', t: 'select', filtre: 1, def: 'France',
        opts: [{ v: 'France', l: 'France' }, { v: 'Canada', l: 'Canada' }, { v: 'Belgique', l: 'Belgique' }, { v: 'Suisse', l: 'Suisse' }, { v: 'Autre', l: 'Autre' }] },
      { k: 'origine', l: 'Provenance', t: 'select', filtre: 1, def: 'site',
        opts: [{ v: 'site', l: 'Site web' }, { v: 'google', l: 'Google' }, { v: 'bouche', l: 'Bouche-à-oreille' }, { v: 'facebook', l: 'Facebook' }, { v: 'instagram', l: 'Instagram' }, { v: 'agence', l: 'Agence' }, { v: 'autre', l: 'Autre' }] },
      { k: 'notes', l: 'Notes', t: 'textarea', full: 1 }
    ]
  },
  forfaits: {
    label: 'Forfaits', groupe: 'Exploitation', icon: 'M9 3v14l-6 3V6zM9 3l6 3M15 6v14l6-3V3z',
    singulier: 'forfait', tri: 'prix',
    champs: [
      { k: 'nom', l: 'Nom', t: 'text', req: 1, list: 1 },
      { k: 'type', l: 'Type', t: 'select', list: 1, filtre: 1, def: 'raid', opts: [{ v: 'raid', l: 'Raid motoneige' }, { v: 'mix', l: 'Multi-activités' }] },
      { k: 'duree', l: 'Durée', t: 'text', list: 1 },
      { k: 'km', l: 'Kilomètres', t: 'number', list: 1 },
      { k: 'prix', l: 'Prix en duo (par pers.)', t: 'money', req: 1, list: 1, hint: '0 si la formule duo n\'est pas proposée' },
      { k: 'prixSolo', l: 'Prix en solo (par pers.)', t: 'money', list: 1 },
      { k: 'devise', l: 'Devise', t: 'select', def: 'CAD', opts: [{ v: 'CAD', l: 'Dollar canadien ($)' }, { v: 'EUR', l: 'Euro (€)' }] },
      { k: 'capacite', l: 'Capacité max', t: 'number', def: 12 },
      { k: 'hebergement', l: 'Hébergement', t: 'text', full: 1 },
      { k: 'page', l: 'Page du site', t: 'text', full: 1, hint: 'Fichier correspondant, ex. raid-escapade.html' },
      { k: 'actif', l: 'Proposé à la vente', t: 'check', list: 1, def: true }
    ]
  },
  compta: {
    label: 'Comptabilité', groupe: 'Gestion', icon: 'M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6',
    singulier: 'écriture', tri: 'date', sens: -1,
    champs: [
      { k: 'date', l: 'Date', t: 'date', req: 1, list: 1, def: today },
      { k: 'type', l: 'Type', t: 'select', req: 1, list: 1, filtre: 1, def: 'revenu', opts: [{ v: 'revenu', l: 'Revenu' }, { v: 'depense', l: 'Dépense' }] },
      { k: 'categorie', l: 'Catégorie', t: 'select', list: 1, filtre: 1, def: 'sejour',
        opts: [{ v: 'sejour', l: 'Séjour / forfait' }, { v: 'boutique', l: 'Boutique' }, { v: 'carburant', l: 'Carburant' }, { v: 'entretien', l: 'Entretien machines' }, { v: 'hebergement', l: 'Hébergement' }, { v: 'repas', l: 'Repas' }, { v: 'salaires', l: 'Salaires' }, { v: 'assurance', l: 'Assurances' }, { v: 'materiel', l: 'Matériel' }, { v: 'marketing', l: 'Marketing' }, { v: 'autre', l: 'Autre' }] },
      { k: 'libelle', l: 'Libellé', t: 'text', req: 1, list: 1, full: 1 },
      { k: 'montantHT', l: 'Montant hors taxes', t: 'money', req: 1, list: 1 },
      { k: 'taxes', l: 'Taxes applicables', t: 'check', def: true, hint: 'Ajoute TPS et TVQ au calcul' },
      { k: 'devise', l: 'Devise', t: 'select', def: 'CAD', opts: [{ v: 'CAD', l: 'Dollar canadien ($)' }, { v: 'EUR', l: 'Euro (€)' }] },
      { k: 'moyen', l: 'Moyen de paiement', t: 'select', def: 'virement',
        opts: [{ v: 'virement', l: 'Virement' }, { v: 'carte', l: 'Carte' }, { v: 'especes', l: 'Espèces' }, { v: 'cheque', l: 'Chèque' }, { v: 'autre', l: 'Autre' }] },
      { k: 'piece', l: 'N° de pièce', t: 'text' }
    ]
  },
  employes: {
    label: 'Personnel', groupe: 'Ressources humaines', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87',
    singulier: 'employé', tri: 'nom',
    champs: [
      { k: 'nom', l: 'Nom', t: 'text', req: 1, list: 1 },
      { k: 'poste', l: 'Poste', t: 'text', list: 1 },
      { k: 'contrat', l: 'Contrat', t: 'select', list: 1, filtre: 1, def: 'saisonnier', opts: [{ v: 'permanent', l: 'Permanent' }, { v: 'saisonnier', l: 'Saisonnier' }, { v: 'occasionnel', l: 'Occasionnel' }] },
      { k: 'tel', l: 'Téléphone', t: 'tel' },
      { k: 'email', l: 'Courriel', t: 'email', list: 1 },
      { k: 'taux', l: 'Taux horaire', t: 'money', list: 1 },
      { k: 'embauche', l: "Date d'embauche", t: 'date' },
      { k: 'actif', l: 'En poste', t: 'check', list: 1, def: true },
      { k: 'notes', l: 'Notes', t: 'textarea', full: 1 }
    ]
  },
  formations: {
    label: 'Formations', groupe: 'Ressources humaines', icon: 'M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 3 9 3 12 0v-5',
    singulier: 'formation', tri: 'expire',
    champs: [
      { k: 'employeId', l: 'Employé', t: 'ref', req: 1, list: 1, opts: refOptions('employes', function (e) { return e.nom; }) },
      { k: 'intitule', l: 'Formation', t: 'select', req: 1, list: 1, filtre: 1, def: 'secourisme',
        opts: [{ v: 'secourisme', l: 'Premiers secours & RCR' }, { v: 'glace', l: 'Lecture de la glace' }, { v: 'mecanique', l: 'Mécanique de dépannage' }, { v: 'urgence', l: 'Communication & urgence' }, { v: 'vhr', l: 'Réglementation VHR' }, { v: 'sentiers', l: 'Reconnaissance des sentiers' }, { v: 'scie', l: 'Scie à chaîne / abattage' }, { v: 'autre', l: 'Autre' }] },
      { k: 'organisme', l: 'Organisme', t: 'text', list: 1 },
      { k: 'obtenue', l: "Date d'obtention", t: 'date', req: 1, list: 1 },
      { k: 'expire', l: "Date d'expiration", t: 'date', list: 1, hint: 'Laisser vide si sans limite' },
      { k: 'notes', l: 'Notes', t: 'textarea', full: 1 }
    ]
  },
  heures: {
    label: 'Heures travaillées', groupe: 'Ressources humaines', icon: 'M12 6v6l4 2M21 12a9 9 0 11-18 0 9 9 0 0118 0',
    singulier: 'saisie', tri: 'date', sens: -1,
    champs: [
      { k: 'date', l: 'Date', t: 'date', req: 1, list: 1, def: today },
      { k: 'employeId', l: 'Employé', t: 'ref', req: 1, list: 1, opts: refOptions('employes', function (e) { return e.nom; }) },
      { k: 'heures', l: 'Heures', t: 'number', req: 1, list: 1, step: '0.25' },
      { k: 'activite', l: 'Activité', t: 'select', list: 1, filtre: 1, def: 'guidage',
        opts: [{ v: 'guidage', l: 'Guidage' }, { v: 'base', l: 'Base / préparation' }, { v: 'entretien', l: 'Entretien machines' }, { v: 'sentier', l: 'Ouverture de sentier' }, { v: 'admin', l: 'Administratif' }, { v: 'formation', l: 'Formation' }, { v: 'autre', l: 'Autre' }] },
      { k: 'note', l: 'Note', t: 'text', full: 1 }
    ]
  },
  stock: {
    label: 'Stock boutique', groupe: 'Boutique', icon: 'M20 7l-8-4-8 4m16 0v10l-8 4m8-14l-8 4m0 10L4 17V7m8 10V11M4 7l8 4',
    singulier: 'article', tri: 'produit',
    champs: [
      { k: 'produit', l: 'Produit', t: 'text', req: 1, list: 1, filtre: 1 },
      { k: 'couleur', l: 'Couleur', t: 'select', list: 1, filtre: 1, def: 'Noir', opts: [{ v: 'Noir', l: 'Noir' }, { v: 'Blanc', l: 'Blanc' }] },
      { k: 'taille', l: 'Taille', t: 'text', list: 1 },
      { k: 'prix', l: 'Prix de vente', t: 'money', list: 1 },
      { k: 'quantite', l: 'Quantité en stock', t: 'number', req: 1, list: 1, def: 0 },
      { k: 'seuil', l: "Seuil d'alerte", t: 'number', def: 3 }
    ]
  },
  commandes: {
    label: 'Commandes', groupe: 'Boutique', icon: 'M6 2L3 6v14h18V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
    singulier: 'commande', tri: 'date', sens: -1,
    champs: [
      { k: 'date', l: 'Date', t: 'date', req: 1, list: 1, def: today },
      { k: 'clientId', l: 'Client', t: 'ref', list: 1, opts: refOptions('clients', nomClient) },
      { k: 'article', l: 'Article', t: 'text', req: 1, list: 1 },
      { k: 'variante', l: 'Couleur / taille', t: 'text', list: 1 },
      { k: 'qte', l: 'Quantité', t: 'number', req: 1, list: 1, def: 1 },
      { k: 'total', l: 'Total', t: 'money', req: 1, list: 1 },
      { k: 'statut', l: 'Statut', t: 'select', list: 1, filtre: 1, def: 'nouvelle',
        opts: [{ v: 'nouvelle', l: 'Nouvelle' }, { v: 'preparee', l: 'Préparée' }, { v: 'remise', l: 'Remise sur place' }, { v: 'expediee', l: 'Expédiée' }, { v: 'annulee', l: 'Annulée' }] },
      { k: 'notes', l: 'Notes', t: 'textarea', full: 1 }
    ]
  },
  machines: {
    label: 'Parc de machines', groupe: 'Boutique', icon: 'M3 17h4l2-4h8l2 4h2M5 17a2 2 0 104 0M15 17a2 2 0 104 0M7 13V7h6l3 6',
    singulier: 'machine', tri: 'numero',
    champs: [
      { k: 'numero', l: 'N° / immatriculation', t: 'text', req: 1, list: 1 },
      { k: 'modele', l: 'Modèle', t: 'text', req: 1, list: 1 },
      { k: 'annee', l: 'Année', t: 'number', list: 1 },
      { k: 'heures', l: 'Heures moteur', t: 'number', list: 1, def: 0 },
      { k: 'dernier', l: 'Dernier entretien', t: 'date', list: 1 },
      { k: 'prochain', l: 'Prochain entretien', t: 'date', list: 1 },
      { k: 'statut', l: 'État', t: 'select', list: 1, filtre: 1, def: 'service',
        opts: [{ v: 'service', l: 'En service' }, { v: 'atelier', l: 'À l\'atelier' }, { v: 'immobilisee', l: 'Immobilisée' }, { v: 'vendue', l: 'Vendue' }] },
      { k: 'notes', l: 'Notes', t: 'textarea', full: 1 }
    ]
  }
};

/* ---------- valeurs et rendu de champs ---------- */
function defVal(c) { return typeof c.def === 'function' ? c.def() : (c.def !== undefined ? c.def : (c.t === 'check' ? false : '')); }
function optsOf(c) { return typeof c.opts === 'function' ? c.opts() : (c.opts || []); }
function labelOpt(c, v) { var o = optsOf(c).filter(function (x) { return x.v === v; })[0]; return o ? o.l : (v || '—'); }

function cellHTML(mod, c, row) {
  var v = row[c.k];
  if (c.t === 'check') return v ? '<span class="tag t-ok">oui</span>' : '<span class="tag t-gray">non</span>';
  if (c.t === 'date') return dateFR(v);
  if (c.t === 'money') return money(v, row.devise || 'CAD');
  if (c.t === 'ref') { var r = (DB[refColl(c)] || []).filter(function (x) { return x.id === v; })[0];
    return r ? esc(refLabel(c, r)) : '<span style="color:var(--gray-500)">—</span>'; }
  if (c.t === 'select') {
    var cls = { confirmee: 't-blue', soldee: 't-ok', terminee: 't-gray', annulee: 't-bad', devis: 't-warn',
      revenu: 't-ok', depense: 't-bad', service: 't-ok', atelier: 't-warn', immobilisee: 't-bad',
      nouvelle: 't-warn', preparee: 't-blue', remise: 't-ok', expediee: 't-ok' }[v] || 't-gray';
    return '<span class="tag ' + cls + '">' + esc(labelOpt(c, v)) + '</span>';
  }
  return esc(v == null || v === '' ? '—' : v);
}
function refColl(c) { return (typeof c.opts === 'function' && c.opts.coll) || ''; }
function refLabel(c, r) {
  if (typeof c.opts === 'function' && c.opts.libelle) return c.opts.libelle(r);
  return r.nom ? (r.nom + (r.prenom ? ' ' + r.prenom : '')) : r.id;
}

/* ---------- vue liste ---------- */
var state = {};
function renderList(key) {
  var mod = SCHEMA[key];
  var st = state[key] = state[key] || { q: '', tri: mod.tri, sens: mod.sens || 1, filtres: {} };
  var cols = mod.champs.filter(function (c) { return c.list; });
  var filtrables = mod.champs.filter(function (c) { return c.filtre; });

  $('#topActions').innerHTML =
    (key === 'forfaits' ? '<button class="btn btn-ghost btn-sm" id="btnPublier">Publier vers le site</button>' : '') +
    '<button class="btn btn-ghost btn-sm" data-csv="' + key + '">Exporter CSV</button>' +
    '<button class="btn btn-primary btn-sm" data-new="' + key + '">+ Ajouter</button>';

  var rows = DB[key].slice();
  if (st.q) {
    var q = st.q.toLowerCase();
    rows = rows.filter(function (r) {
      return cols.some(function (c) { return String(cellHTML(mod, c, r)).replace(/<[^>]+>/g, '').toLowerCase().indexOf(q) > -1; });
    });
  }
  Object.keys(st.filtres).forEach(function (k) {
    if (st.filtres[k]) rows = rows.filter(function (r) { return String(r[k]) === st.filtres[k]; });
  });
  rows.sort(function (a, b) {
    var x = a[st.tri], y = b[st.tri];
    if (typeof x === 'number' || typeof y === 'number') return (( x || 0) - (y || 0)) * st.sens;
    return String(x || '').localeCompare(String(y || ''), 'fr') * st.sens;
  });

  var h = '<div class="tools">' +
    '<input type="search" id="q" placeholder="Rechercher…" value="' + esc(st.q) + '">' +
    filtrables.map(function (c) {
      return '<select data-filtre="' + c.k + '"><option value="">' + esc(c.l) + ' : tous</option>' +
        optsOf(c).map(function (o) { return '<option value="' + esc(o.v) + '"' + (st.filtres[c.k] === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>';
    }).join('') +
    '<span class="spacer"></span><span class="count">' + rows.length + ' ' + mod.singulier + (rows.length > 1 ? 's' : '') + '</span></div>';

  if (key === 'forfaits') {
    if (ETAT.source !== 'fichier') {
      h += '<div class="alert a-bad" style="margin-bottom:16px"><div><b>Tarifs non relies au site.</b><br>' +
        'data/forfaits.json est introuvable ou illisible : les valeurs ci-dessous ne sont pas celles ' +
        'que voient vos visiteurs. Lancez le site avec <b>python serve.py</b> puis rechargez.</div></div>';
    } else if (ETAT.ecriture === 'aucune') {
      h += '<div class="alert a-bad" style="margin-bottom:16px"><div><b>Lecture seule.</b><br>' +
        'Les tarifs affiches sont bien ceux du site, mais vos modifications ne pourront pas etre publiees. ' +
        'Lancez le site avec <b>python serve.py</b>.</div></div>';
    }
    // quand la liaison fonctionne, aucun bandeau : seuls les problemes en meritent un
  }

  if (!rows.length) {
    h += '<div class="tw"><div class="empty">Aucun résultat.<br><br><button class="btn btn-primary btn-sm" data-new="' + key + '">Ajouter ' + art(key, 'un') + mod.singulier + '</button></div></div>';
  } else {
    h += '<div class="tw"><table><thead><tr>' +
      cols.map(function (c) {
        var num = (c.t === 'money' || c.t === 'number') ? ' class="num"' : '';
        var ar = st.tri === c.k ? '<span class="ar">' + (st.sens > 0 ? '▲' : '▼') + '</span>' : '';
        return '<th' + num + ' data-tri="' + c.k + '">' + esc(c.l) + ar + '</th>';
      }).join('') + '<th class="num">Actions</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr' + (mod.detail ? ' data-open="' + r.id + '" style="cursor:pointer"' : '') + '>' +
          cols.map(function (c) {
          var num = (c.t === 'money' || c.t === 'number') ? ' class="num"' : '';
          return '<td' + num + '>' + cellHTML(mod, c, r) + '</td>';
        }).join('') +
        '<td class="act"><button class="ico" data-edit="' + r.id + '" title="Modifier">✎</button>' +
        '<button class="ico del" data-del="' + r.id + '" title="Supprimer">🗑</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  $('#view').innerHTML = h;

  var bc = $('#btnConnecter');
  if (bc) bc.onclick = connecterDossier;

  var bp = $('#btnPublier');
  if (bp) bp.onclick = function () {
    publierForfaits();
    alert('Fichier forfaits.json telecharge.\n\n' +
          'Deposez-le dans le dossier data/ de votre site (en remplacant l ancien) ' +
          'pour que les nouveaux tarifs s affichent sur les pages.');
  };

  var qi = $('#q');
  if (qi) qi.oninput = function () { st.q = this.value; var p = this.selectionStart; renderList(key); var n = $('#q'); n.focus(); n.setSelectionRange(p, p); };
  $$('[data-filtre]').forEach(function (s) { s.onchange = function () { st.filtres[this.dataset.filtre] = this.value; renderList(key); }; });
  $$('[data-tri]').forEach(function (t) { t.onclick = function () {
    var k = this.dataset.tri; st.sens = (st.tri === k) ? -st.sens : 1; st.tri = k; renderList(key); }; });
  $$('[data-open]').forEach(function (tr) {
    tr.onclick = function (e) {
      if (e.target.closest('button')) return;  // les icones gardent leur role
      location.hash = '#/' + key + '/' + this.dataset.open;
    };
  });
  $$('[data-edit]').forEach(function (b) {
    b.onclick = function (e) { e.stopPropagation(); openForm(key, this.dataset.edit); };
  });
  $$('[data-del]').forEach(function (b) { b.onclick = function (e) {
    e.stopPropagation();
    var id = this.dataset.del;
    if (!confirm('Supprimer définitivement ' + art(key, 'ce') + mod.singulier + ' ?')) return;
    DB[key] = DB[key].filter(function (r) { return r.id !== id; });
    if (key === 'reservations') retirerRevenuLie(id);
    save(); toast(mod.singulier[0].toUpperCase() + mod.singulier.slice(1) + ' supprimé'); render();
  }; });
}

/* ---------- le verse d'une reservation devient un revenu ---------- */
// Sans ca, marquer une reservation "versee" ne changeait rien au chiffre
// d'affaires : il fallait ressaisir le meme montant a la main dans le
// module Comptabilite. Chaque reservation est reliee a au plus une
// ecriture de revenu (via resaId), maintenue a jour automatiquement.
function synchroniserRevenu(rec) {
  var montant = Number(rec.verse) || 0;
  var existant = DB.compta.filter(function (e) { return e.resaId === rec.id; })[0];

  if (montant <= 0) {
    if (existant) DB.compta = DB.compta.filter(function (e) { return e !== existant; });
    return;
  }

  var c = DB.clients.filter(function (x) { return x.id === rec.clientId; })[0];
  var f = DB.forfaits.filter(function (x) { return x.id === rec.forfaitId; })[0];
  var libelle = 'Versement — ' + (rec.ref || rec.id) +
    (c ? ' · ' + nomClient(c) : '') + (f ? ' · ' + f.nom : '');

  if (existant) {
    existant.montantHT = montant;
    existant.devise = rec.devise || 'CAD';
    existant.libelle = libelle;
    existant.piece = rec.ref || '';
  } else {
    DB.compta.push({
      id: uid(), resaId: rec.id, date: rec.debut || today(), type: 'revenu',
      categorie: 'sejour', libelle: libelle, montantHT: montant,
      taxes: false, devise: rec.devise || 'CAD', moyen: 'virement', piece: rec.ref || ''
    });
  }
}
function retirerRevenuLie(id) {
  DB.compta = DB.compta.filter(function (e) { return e.resaId !== id; });
}
// Rattrape les reservations enregistrees avant l'ajout de cette synchro :
// sans ca, un versement deja saisi restait invisible du chiffre d'affaires
// jusqu'a la prochaine modification manuelle de sa fiche.
function rattraperRevenus() {
  var n = 0;
  DB.reservations.forEach(function (rec) {
    var deja = DB.compta.some(function (e) { return e.resaId === rec.id; });
    if (!deja && Number(rec.verse) > 0) { synchroniserRevenu(rec); n++; }
  });
  if (n) save();
  return n;
}

/* ---------- calcul du retour d'apres la duree du forfait ---------- */
function calcFin(forfaitId, debut) {
  if (!debut) return '';
  var f = DB.forfaits.filter(function (x) { return x.id === forfaitId; })[0];
  var j = f ? parseInt(f.duree, 10) : 0;
  return (!j || isNaN(j)) ? debut : addDays(debut, j - 1);
}

/* ---------- formulaire ---------- */
var formCtx = null;
function openForm(key, id) {
  var mod = SCHEMA[key];
  var rec = id ? DB[key].filter(function (r) { return r.id === id; })[0] : null;
  formCtx = { key: key, id: id };
  $('#modalTitle').textContent = rec ? ('Modifier ' + art(key, 'ce') + mod.singulier) : (art(key, 'nouveau') + mod.singulier);
  $('#modalBody').innerHTML = mod.champs.filter(function (c) { return !c.auto; }).map(function (c) {
    var v = rec ? rec[c.k] : defVal(c);
    var full = c.full || c.t === 'textarea' ? ' full' : '';
    if (c.t === 'check') {
      return '<div class="f f-check' + full + '"><input type="checkbox" id="f_' + c.k + '"' + (v ? ' checked' : '') + '><label for="f_' + c.k + '">' + esc(c.l) + '</label></div>';
    }
    var inner;
    if (c.t === 'textarea') inner = '<textarea id="f_' + c.k + '">' + esc(v) + '</textarea>';
    else if (c.t === 'select' || c.t === 'ref') {
      inner = '<select id="f_' + c.k + '"' + (c.req ? ' required' : '') + '>' +
        (c.t === 'ref' ? '<option value="">— aucun —</option>' : '') +
        optsOf(c).map(function (o) { return '<option value="' + esc(o.v) + '"' + (String(v) === String(o.v) ? ' selected' : '') + '>' + esc(o.l) + '</option>'; }).join('') + '</select>';
    } else {
      var t = c.t === 'money' || c.t === 'number' ? 'number' : (c.t === 'date' ? 'date' : (c.t === 'email' ? 'email' : (c.t === 'tel' ? 'tel' : 'text')));
      var step = c.step || (c.t === 'money' ? '0.01' : '1');
      inner = '<input type="' + t + '" id="f_' + c.k + '" value="' + esc(v) + '"' +
        (t === 'number' ? ' step="' + step + '"' : '') + (c.req ? ' required' : '') + '>';
    }
    return '<div class="f' + full + '"><label for="f_' + c.k + '">' + esc(c.l) + (c.req ? ' *' : '') + '</label>' + inner +
      (c.hint ? '<span class="hint" id="hint_' + c.k + '">' + esc(c.hint) + '</span>' : '') + '</div>';
  }).join('');
  if (key === 'reservations') brancherReservation(rec);
  $('#modal').hidden = false;
  var first = $('#modalBody input,#modalBody select'); if (first) first.focus();
}
function closeForm() { $('#modal').hidden = true; formCtx = null; }

// Sur une reservation : le retour est deduit du forfait et le montant propose
// vaut prix x participants. Le montant cesse d'etre recalcule des que
// l'utilisateur le saisit lui-meme.
function brancherReservation(rec) {
  var fSel = $('#f_forfaitId'), dIn = $('#f_debut'), pIn = $('#f_pax'),
      tIn = $('#f_total'), devSel = $('#f_devise'), hint = $('#hint_debut'),
      foSel = $('#f_formule');
  if (!fSel || !dIn) return;
  var manuel = !!(rec && Number(rec.total));

  function maj() {
    var f = DB.forfaits.filter(function (x) { return x.id === fSel.value; })[0];
    var fin = calcFin(fSel.value, dIn.value);
    if (hint) {
      hint.textContent = (f && dIn.value)
        ? 'Forfait de ' + (parseInt(f.duree, 10) || '?') + ' jours \u2192 retour le ' + dateFR(fin)
        : 'Le retour se calcule tout seul \u00e0 partir de la dur\u00e9e du forfait.';
    }
    if (f && devSel) devSel.value = f.devise || 'CAD';
    if (f && tIn && !manuel) {
      var solo = foSel && foSel.value === 'solo';
      var pu = solo ? (Number(f.prixSolo) || 0) : (Number(f.prix) || 0);
      if (!pu) pu = Number(f.prixSolo) || Number(f.prix) || 0;  // formule non proposée
      tIn.value = pu * (parseInt(pIn && pIn.value, 10) || 0);
    }
  }
  [fSel, dIn, pIn, foSel].forEach(function (el) { if (el) el.addEventListener('change', maj); });
  if (pIn) pIn.addEventListener('input', maj);
  if (tIn) tIn.addEventListener('input', function () { manuel = true; });
  maj();
}

$('#modalForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if (!formCtx) return;
  var mod = SCHEMA[formCtx.key];
  var rec = formCtx.id ? DB[formCtx.key].filter(function (r) { return r.id === formCtx.id; })[0] : { id: uid(), cree: today() };
  mod.champs.forEach(function (c) {
    var el = $('#f_' + c.k); if (!el) return;
    if (c.t === 'check') rec[c.k] = el.checked;
    else if (c.t === 'money' || c.t === 'number') rec[c.k] = el.value === '' ? 0 : parseFloat(el.value);
    else rec[c.k] = el.value;
  });
  if (formCtx.key === 'reservations') {
    rec.fin = calcFin(rec.forfaitId, rec.debut);
    synchroniserRevenu(rec);
  }
  if (!formCtx.id) DB[formCtx.key].push(rec);
  // closeForm() remet formCtx a null : on retient la collection avant
  var cle = formCtx.key;
  save(); closeForm(); render();
  if (cle === 'forfaits') {
    ecrireForfaits(function (ok) {
      if (ok) { toast('Enregistré et publié sur le site'); render(); return; }
      ETAT.ecriture = 'aucune';
      render();
      alert("LA MODIFICATION N'EST PAS EN LIGNE\n\n" +
            "Elle est enregistree dans ce navigateur, mais le site n'a pas pu etre mis a jour.\n\n" +
            "Cause la plus frequente : le site n'est pas lance avec serve.py.\n" +
            "Dans un terminal, a la racine du site :\n\n    python serve.py\n\n" +
            "Puis rechargez cette page.");
    });
  } else {
    toast('Enregistré');
  }
});
$('#modalClose').onclick = closeForm;
$('#modalCancel').onclick = closeForm;
$('#modal').addEventListener('click', function (e) { if (e.target === this) closeForm(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('#modal').hidden) closeForm(); });

/* ---------- calculs metier ---------- */
function tauxCAD(m, dev) { return dev === 'EUR' ? m * (DB.meta.tauxEUR || 1) : m; }
function ttc(e) {
  var ht = Number(e.montantHT) || 0;
  if (!e.taxes) return ht;
  return ht * (1 + (DB.meta.tps + DB.meta.tvq) / 100);
}
function alertes() {
  var out = [], t = today();
  DB.formations.forEach(function (f) {
    if (!f.expire) return;
    var d = daysBetween(t, f.expire);
    var e = DB.employes.filter(function (x) { return x.id === f.employeId; })[0];
    var nom = e ? e.nom : 'Employé inconnu';
    var lib = labelOpt(SCHEMA.formations.champs[1], f.intitule);
    if (d < 0) out.push({ n: 'bad', t: 'Formation expirée', d: nom + ' — ' + lib + ' (depuis ' + Math.abs(d) + ' jours)' });
    else if (d <= 60) out.push({ n: 'warn', t: 'Formation à renouveler', d: nom + ' — ' + lib + ' dans ' + d + ' jours' });
  });
  DB.stock.forEach(function (s) {
    if (Number(s.quantite) <= Number(s.seuil)) out.push({ n: 'warn', t: 'Stock bas', d: s.produit + ' · ' + s.couleur + ' · ' + s.taille + ' — ' + s.quantite + ' en stock' });
  });
  DB.machines.forEach(function (m) {
    if (m.statut === 'vendue' || !m.prochain) return;
    var d = daysBetween(t, m.prochain);
    if (d < 0) out.push({ n: 'bad', t: 'Entretien en retard', d: m.numero + ' · ' + m.modele + ' (' + Math.abs(d) + ' jours)' });
    else if (d <= 21) out.push({ n: 'warn', t: 'Entretien à prévoir', d: m.numero + ' · ' + m.modele + ' dans ' + d + ' jours' });
  });
  DB.reservations.forEach(function (r) {
    if (r.statut !== 'confirmee' || !r.debut) return;
    var reste = (Number(r.total) || 0) - (Number(r.verse) || 0);
    if (reste <= 0) return;
    var limite = addDays(r.debut, -(DB.meta.soldeJours || 90));
    if (daysBetween(t, limite) < 0) {
      var c = DB.clients.filter(function (x) { return x.id === r.clientId; })[0];
      out.push({ n: 'bad', t: 'Solde en retard', d: (r.ref || '') + ' · ' + (c ? nomClient(c) : '?') + ' — ' + money(reste, r.devise) + ' dû depuis le ' + dateFR(limite) });
    }
  });
  return out;
}

/* ---------- fiche client ---------- */
window.renderClient = renderClient;
function renderClient(id) {
  var c = DB.clients.filter(function (x) { return x.id === id; })[0];
  if (!c) { location.hash = '#/clients'; return; }

  $('#pageTitle').textContent = nomClient(c);
  $('#topActions').innerHTML =
    '<button class="btn btn-ghost btn-sm" id="btnRetour">&larr; Tous les clients</button>' +
    '<button class="btn btn-primary btn-sm" id="btnModifier">Modifier la fiche</button>';

  var resas = DB.reservations.filter(function (r) { return r.clientId === id; })
    .sort(function (a, b) { return String(b.debut).localeCompare(String(a.debut)); });
  var cmds = DB.commandes.filter(function (o) { return o.clientId === id; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

  // Si toutes les reservations sont dans la meme devise, on l'affiche telle
  // quelle : convertir 5 000 EUR en 7 350 CAD sans le dire prete a confusion.
  var devises = {};
  resas.forEach(function (r) { if (r.statut !== 'annulee') devises[r.devise || 'CAD'] = 1; });
  var seule = Object.keys(devises).length === 1 ? Object.keys(devises)[0] : null;

  var facture = 0, du = 0, pax = 0;
  resas.forEach(function (r) {
    if (r.statut === 'annulee') return;
    var t = Number(r.total) || 0, v = Number(r.verse) || 0;
    if (seule) { facture += t; du += Math.max(0, t - v); }
    else {
      facture += tauxCAD(t, r.devise);
      du += tauxCAD(Math.max(0, t - v), r.devise);
    }
    pax += Number(r.pax) || 0;
  });
  var noteDevise = seule ? 'Hors réservations annulées'
    : 'Devises mêlées, converti en dollars (taux ' + DB.meta.tauxEUR + ')';
  var actives = resas.filter(function (r) { return r.statut !== 'annulee'; }).length;

  var champ = SCHEMA.clients.champs;
  function lib(k) { var f = champ.filter(function (x) { return x.k === k; })[0]; return f ? labelOpt(f, c[k]) : c[k]; }

  var h = '<div class="kpis">' +
    kpi('Séjours réservés', actives, pax + ' participant' + (pax > 1 ? 's' : '') + ' au total') +
    kpi('Total facturé', money(facture, seule || 'CAD'), noteDevise) +
    kpi('Reste à encaisser', money(du, seule || 'CAD'), du > 0 ? 'Solde en attente' : 'Tout est réglé', du > 0 ? 'warn' : 'ok') +
    kpi('Commandes boutique', cmds.length, cmds.length ? 'Voir plus bas' : 'Aucune à ce jour') +
    '</div>';

  h += '<div class="grid2"><div class="panel"><div class="panel-h"><h3>Coordonnées</h3></div><div class="panel-b">' +
    ligne('Nom', esc(c.nom || '—')) + ligne('Prénom', esc(c.prenom || '—')) +
    ligne('Courriel', c.email ? esc(c.email) : '—') +
    ligne('Téléphone', c.tel ? esc(c.tel) : '—') +
    ligne('Ville', esc(c.ville || '—')) + ligne('Pays', esc(lib('pays') || '—')) +
    ligne('Provenance', esc(lib('origine') || '—')) +
    ligne('Fiche créée le', dateFR(c.cree)) +
    '</div></div>';

  h += '<div class="panel"><div class="panel-h"><h3>Notes</h3></div><div class="panel-b">' +
    (c.notes ? '<p style="white-space:pre-wrap;font-size:.9rem">' + esc(c.notes) + '</p>'
             : '<p style="color:var(--gray-500);font-size:.88rem">Aucune note. Utilisez « Modifier la fiche » pour en ajouter.</p>') +
    '</div></div></div>';

  h += '<div class="panel"><div class="panel-h"><h3>Réservations</h3><span class="count">' + resas.length + '</span></div>';
  h += resas.length
    ? '<div class="tw"><table><thead><tr><th>Référence</th><th>Forfait</th><th>Départ</th><th>Retour</th>' +
      '<th class="num">Pers.</th><th class="num">Montant</th><th class="num">Versé</th><th>Statut</th></tr></thead><tbody>' +
      resas.map(function (r) {
        var f = DB.forfaits.filter(function (x) { return x.id === r.forfaitId; })[0];
        var st = SCHEMA.reservations.champs.filter(function (x) { return x.k === 'statut'; })[0];
        return '<tr><td>' + esc(r.ref || '—') + '</td><td>' + esc(f ? f.nom : '—') + '</td>' +
          '<td>' + dateFR(r.debut) + '</td><td>' + dateFR(r.fin) + '</td>' +
          '<td class="num">' + (r.pax || 0) + '</td>' +
          '<td class="num">' + money(r.total, r.devise) + '</td>' +
          '<td class="num">' + money(r.verse, r.devise) + '</td>' +
          '<td>' + cellHTML(SCHEMA.reservations, st, r) + '</td></tr>';
      }).join('') + '</tbody></table></div>'
    : '<div class="panel-b" style="color:var(--gray-500);font-size:.88rem">Aucune réservation pour ce client.</div>';
  h += '</div>';

  if (cmds.length) {
    h += '<div class="panel"><div class="panel-h"><h3>Commandes boutique</h3><span class="count">' + cmds.length + '</span></div>' +
      '<div class="tw"><table><thead><tr><th>Date</th><th>Article</th><th>Couleur / taille</th>' +
      '<th class="num">Qté</th><th class="num">Total</th><th>Statut</th></tr></thead><tbody>' +
      cmds.map(function (o) {
        var st = SCHEMA.commandes.champs.filter(function (x) { return x.k === 'statut'; })[0];
        return '<tr><td>' + dateFR(o.date) + '</td><td>' + esc(o.article || '—') + '</td>' +
          '<td>' + esc(o.variante || '—') + '</td><td class="num">' + (o.qte || 0) + '</td>' +
          '<td class="num">' + money(o.total) + '</td>' +
          '<td>' + cellHTML(SCHEMA.commandes, st, o) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  $('#view').innerHTML = h;
  $('#btnRetour').onclick = function () { location.hash = '#/clients'; };
  $('#btnModifier').onclick = function () { openForm('clients', id); };
}

function ligne(l, v) {
  return '<div class="split"><span style="color:var(--gray-500)">' + esc(l) + '</span><b>' + v + '</b></div>';
}

/* ---------- tableau de bord ---------- */
function renderDash() {
  $('#topActions').innerHTML = '';
  var t = today(), mois = t.slice(0, 7), an = t.slice(0, 4);
  var revMois = 0, depMois = 0, revAn = 0, depAn = 0;
  DB.compta.forEach(function (e) {
    var v = tauxCAD(ttc(e), e.devise);
    if (String(e.date).slice(0, 7) === mois) { if (e.type === 'revenu') revMois += v; else depMois += v; }
    if (String(e.date).slice(0, 4) === an) { if (e.type === 'revenu') revAn += v; else depAn += v; }
  });
  var aVenir = DB.reservations.filter(function (r) { return r.debut >= t && ['confirmee', 'soldee'].indexOf(r.statut) > -1; });
  var pax = aVenir.reduce(function (s, r) { return s + (Number(r.pax) || 0); }, 0);
  var encaisser = DB.reservations.filter(function (r) { return ['devis', 'annulee'].indexOf(r.statut) < 0; })
    .reduce(function (s, r) { return s + tauxCAD(Math.max(0, (Number(r.total) || 0) - (Number(r.verse) || 0)), r.devise); }, 0);
  var devis = DB.reservations.filter(function (r) { return r.statut === 'devis'; }).length;
  var al = alertes();

  var h = '<div class="kpis">' +
    kpi('Revenus du mois', money(revMois), 'Toutes taxes comprises, en dollars') +
    kpi('Dépenses du mois', money(depMois), 'Toutes taxes comprises') +
    kpi('Résultat du mois', money(revMois - depMois), 'Revenus moins dépenses', revMois - depMois >= 0 ? 'ok' : 'bad') +
    kpi('Reste à encaisser', money(encaisser), 'Non soldé, converti en dollars', encaisser > 0 ? 'warn' : 'ok') +
    kpi('Départs à venir', aVenir.length, pax + ' participant' + (pax > 1 ? 's' : '') + ' attendus') +
    kpi('Devis en attente', devis, 'Validité : ' + DB.meta.devisJours + ' jours', devis ? 'warn' : '') +
    '</div>';

  h += '<div class="grid2">';
  h += '<div class="panel"><div class="panel-h"><h3>Alertes</h3><span class="count">' + al.length + '</span></div><div class="panel-b">' +
    (al.length ? al.slice(0, 12).map(function (a) {
      return '<div class="alert a-' + a.n + '"><div><b>' + esc(a.t) + '</b><br>' + esc(a.d) + '</div></div>';
    }).join('') : '<div class="alert a-ok"><div><b>Rien à signaler.</b><br>Formations à jour, stocks au-dessus des seuils, entretiens et soldes en règle.</div></div>') +
    '</div></div>';

  var prochains = DB.reservations.filter(function (r) { return r.debut >= t && r.statut !== 'annulee'; })
    .sort(function (a, b) { return a.debut.localeCompare(b.debut); }).slice(0, 8);
  h += '<div class="panel"><div class="panel-h"><h3>Prochains départs</h3></div><div class="panel-b">' +
    (prochains.length ? prochains.map(function (r) {
      var c = DB.clients.filter(function (x) { return x.id === r.clientId; })[0];
      var f = DB.forfaits.filter(function (x) { return x.id === r.forfaitId; })[0];
      return '<div class="split"><span>' + dateFR(r.debut) + ' · ' + esc(c ? nomClient(c) : '—') +
        '<br><span style="color:var(--gray-500);font-size:.8rem">' + esc(f ? f.nom : '—') + ' · ' + (r.pax || 0) + ' pers.</span></span>' +
        '<b>' + money(r.total, r.devise) + '</b></div>';
    }).join('') : '<p style="color:var(--gray-500)">Aucun départ programmé.</p>') + '</div></div>';
  h += '</div>';

  h += '<div class="panel"><div class="panel-h"><h3>Année ' + an + '</h3></div><div class="panel-b">' +
    '<div class="split"><span>Revenus encaissés</span><b>' + money(revAn) + '</b></div>' +
    '<div class="split"><span>Dépenses</span><b>' + money(depAn) + '</b></div>' +
    '<div class="split total"><span>Résultat</span><b style="color:' + (revAn - depAn >= 0 ? 'var(--ok)' : 'var(--bad)') + '">' + money(revAn - depAn) + '</b></div>' +
    '</div></div>';

  $('#view').innerHTML = h;
}
function kpi(l, v, s, cls) {
  return '<div class="kpi ' + (cls || '') + '"><div class="kpi-l">' + esc(l) + '</div><div class="kpi-v">' + v + '</div><div class="kpi-s">' + esc(s) + '</div></div>';
}

/* ---------- bilan comptable ---------- */
function renderBilan() {
  $('#topActions').innerHTML = '<button class="btn btn-ghost btn-sm" data-csv="compta">Exporter CSV</button>';
  var an = (state.bilanAn || today().slice(0, 4));
  var cats = {}, revHT = 0, depHT = 0, tpsCol = 0, tvqCol = 0, tpsPay = 0, tvqPay = 0;
  DB.compta.forEach(function (e) {
    if (String(e.date).slice(0, 4) !== an) return;
    var ht = tauxCAD(Number(e.montantHT) || 0, e.devise);
    var tps = e.taxes ? ht * DB.meta.tps / 100 : 0;
    var tvq = e.taxes ? ht * DB.meta.tvq / 100 : 0;
    if (e.type === 'revenu') { revHT += ht; tpsCol += tps; tvqCol += tvq; }
    else { depHT += ht; tpsPay += tps; tvqPay += tvq; }
    var k = e.type + '|' + e.categorie;
    cats[k] = (cats[k] || 0) + ht;
  });
  var annees = {}; DB.compta.forEach(function (e) { annees[String(e.date).slice(0, 4)] = 1; });
  annees[today().slice(0, 4)] = 1;

  var h = '<div class="tools"><select id="bilanAn">' + Object.keys(annees).sort().reverse().map(function (a) {
    return '<option value="' + a + '"' + (a === an ? ' selected' : '') + '>Exercice ' + a + '</option>'; }).join('') + '</select></div>';

  h += '<div class="kpis">' +
    kpi('Revenus HT', money(revHT), 'Hors taxes', 'ok') +
    kpi('Dépenses HT', money(depHT), 'Hors taxes') +
    kpi('Résultat HT', money(revHT - depHT), 'Avant impôts', revHT - depHT >= 0 ? 'ok' : 'bad') +
    kpi('Taxes à remettre', money((tpsCol - tpsPay) + (tvqCol - tvqPay)), 'TPS + TVQ nettes', 'warn') +
    '</div>';

  h += '<div class="grid2"><div class="panel"><div class="panel-h"><h3>Déclaration de taxes</h3></div><div class="panel-b">' +
    '<div class="split"><span>TPS perçue (' + DB.meta.tps + ' %)</span><b>' + money(tpsCol) + '</b></div>' +
    '<div class="split"><span>TPS payée sur achats</span><b>− ' + money(tpsPay) + '</b></div>' +
    '<div class="split"><span><b>TPS nette à remettre</b></span><b>' + money(tpsCol - tpsPay) + '</b></div>' +
    '<div class="split" style="margin-top:14px"><span>TVQ perçue (' + DB.meta.tvq + ' %)</span><b>' + money(tvqCol) + '</b></div>' +
    '<div class="split"><span>TVQ payée sur achats</span><b>− ' + money(tvqPay) + '</b></div>' +
    '<div class="split"><span><b>TVQ nette à remettre</b></span><b>' + money(tvqCol - tvqPay) + '</b></div>' +
    '<div class="split total"><span>Total à remettre</span><b>' + money((tpsCol - tpsPay) + (tvqCol - tvqPay)) + '</b></div>' +
    '</div></div>';

  var lignes = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; });
  var maxi = Math.max.apply(null, lignes.map(function (k) { return Math.abs(cats[k]); }).concat([1]));
  h += '<div class="panel"><div class="panel-h"><h3>Par catégorie</h3></div><div class="panel-b">' +
    (lignes.length ? lignes.map(function (k) {
      var p = k.split('|'), c = SCHEMA.compta.champs.filter(function (x) { return x.k === 'categorie'; })[0];
      return '<div style="margin-bottom:12px"><div class="split" style="border:none;padding:0 0 2px">' +
        '<span>' + (p[0] === 'revenu' ? '↑ ' : '↓ ') + esc(labelOpt(c, p[1])) + '</span><b>' + money(cats[k]) + '</b></div>' +
        '<div class="bar"><span style="width:' + (Math.abs(cats[k]) / maxi * 100) + '%;background:' + (p[0] === 'revenu' ? 'var(--ok)' : 'var(--bad)') + '"></span></div></div>';
    }).join('') : '<p style="color:var(--gray-500)">Aucune écriture pour cet exercice.</p>') + '</div></div></div>';

  $('#view').innerHTML = h;
  $('#bilanAn').onchange = function () { state.bilanAn = this.value; renderBilan(); };
}

/* ---------- paie ---------- */
function renderPaie() {
  $('#topActions').innerHTML = '<button class="btn btn-ghost btn-sm" data-csv="heures">Exporter CSV</button>';
  var mois = state.paieMois || today().slice(0, 7);
  var par = {};
  DB.heures.forEach(function (h) {
    if (String(h.date).slice(0, 7) !== mois) return;
    par[h.employeId] = (par[h.employeId] || 0) + (Number(h.heures) || 0);
  });
  var moisSet = {}; DB.heures.forEach(function (h) { moisSet[String(h.date).slice(0, 7)] = 1; });
  moisSet[today().slice(0, 7)] = 1;

  var total = 0, totalH = 0;
  var lignes = Object.keys(par).map(function (id) {
    var e = DB.employes.filter(function (x) { return x.id === id; })[0] || { nom: 'Inconnu', taux: 0 };
    var brut = par[id] * (Number(e.taux) || 0);
    total += brut; totalH += par[id];
    return { nom: e.nom, poste: e.poste, h: par[id], taux: e.taux, brut: brut };
  }).sort(function (a, b) { return b.brut - a.brut; });

  var h = '<div class="tools"><select id="paieMois">' + Object.keys(moisSet).sort().reverse().map(function (m) {
    var d = m.split('-');
    var nm = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'][+d[1] - 1];
    return '<option value="' + m + '"' + (m === mois ? ' selected' : '') + '>' + nm + ' ' + d[0] + '</option>'; }).join('') + '</select></div>';

  h += '<div class="kpis">' + kpi('Heures du mois', totalH.toLocaleString('fr-CA'), 'Toutes activités confondues') +
    kpi('Masse salariale brute', money(total), 'Avant charges et retenues', 'warn') +
    kpi('Employés actifs', DB.employes.filter(function (e) { return e.actif; }).length, 'Sur ' + DB.employes.length + ' au total') + '</div>';

  h += '<div class="tw"><table><thead><tr><th>Employé</th><th>Poste</th><th class="num">Heures</th><th class="num">Taux</th><th class="num">Brut</th></tr></thead><tbody>' +
    (lignes.length ? lignes.map(function (l) {
      return '<tr><td>' + esc(l.nom) + '</td><td>' + esc(l.poste || '—') + '</td><td class="num">' + l.h + '</td><td class="num">' + money(l.taux) + '</td><td class="num"><b>' + money(l.brut) + '</b></td></tr>';
    }).join('') : '<tr><td colspan="5" class="empty">Aucune heure saisie sur ce mois.</td></tr>') +
    '</tbody></table></div>';

  h += '<div class="alert a-warn" style="margin-top:16px"><div><b>Montants bruts uniquement.</b><br>' +
    'Ce calcul ne tient compte ni des retenues à la source, ni des cotisations employeur (RRQ, RQAP, assurance-emploi, CNESST). Il sert au suivi interne, pas à la production de paie.</div></div>';

  $('#view').innerHTML = h;
  $('#paieMois').onchange = function () { state.paieMois = this.value; renderPaie(); };
}

/* ---------- parametres ---------- */
function renderParams() {
  $('#topActions').innerHTML = '';
  var m = DB.meta;
  var h = '<div class="grid2"><div class="panel"><div class="panel-h"><h3>Réglages</h3></div><div class="panel-b">' +
    '<div class="modal-body" style="padding:0;grid-template-columns:1fr 1fr">' +
    num('tauxEUR', 'Taux de change EUR → CAD', m.tauxEUR, '0.01') +
    num('tps', 'TPS (%)', m.tps, '0.001') +
    num('tvq', 'TVQ (%)', m.tvq, '0.001') +
    num('acompte', 'Acompte à la réservation (%)', m.acompte, '1') +
    num('soldeJours', 'Solde dû X jours avant le départ', m.soldeJours, '1') +
    num('devisJours', 'Validité d\'un devis (jours)', m.devisJours, '1') +
    '<div class="f full"><label for="f_pin">Code d\'accès</label><input type="text" id="f_pin" value="' + esc(m.pin) + '">' +
    '<span class="hint">Voir l\'avertissement de sécurité ci-contre.</span></div>' +
    '</div><button class="btn btn-primary" id="saveParams" style="margin-top:16px">Enregistrer les réglages</button>' +
    '</div></div>';

  h += '<div class="panel"><div class="panel-h"><h3>Sauvegarde</h3></div><div class="panel-b">' +
    '<p style="font-size:.86rem;margin-bottom:16px">Vos données sont enregistrées dans <b>ce navigateur, sur cet ordinateur</b>. Elles ne sont ni sur un serveur, ni partagées. Exportez régulièrement.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
    '<button class="btn btn-primary btn-sm" id="btnExport">Exporter la sauvegarde</button>' +
    '<button class="btn btn-ghost btn-sm" id="btnImport">Restaurer un fichier</button>' +
    '<input type="file" id="fileImport" accept="application/json" hidden></div>' +
    '<div class="alert a-bad" style="margin-top:18px"><div><b>Le code d\'accès n\'est pas une sécurité.</b><br>' +
    'Il est stocké en clair dans le navigateur et n\'importe qui sachant lire une page web peut le contourner. ' +
    'Il évite un regard par-dessus l\'épaule, rien de plus. N\'y mettez pas de données que la fuite rendrait grave.</div></div>' +
    '</div></div></div>';

  h += '<div class="panel"><div class="panel-h"><h3>Dossier du site</h3></div><div class="panel-b">' +
    (dirHandle
      ? '<div class="alert a-ok"><div><b>Connecté.</b><br>Les tarifs sont écrits directement dans data/forfaits.json à chaque enregistrement.</div></div>'
      : '<div class="alert a-warn"><div><b>Non connecté.</b><br>Sans ça, il faut publier puis déposer le fichier à la main.</div></div>') +
    '<button class="btn btn-primary btn-sm" id="btnConnecter2" style="margin-top:14px">' +
    (dirHandle ? 'Changer de dossier' : 'Connecter le dossier du site') + '</button>' +
    '<p style="font-size:.8rem;color:var(--gray-500);margin-top:12px">Choisissez le dossier qui contient index.html. ' +
    'L\'autorisation reste valable tant que vous ne la retirez pas dans le navigateur. Chrome ou Edge requis.</p>' +
    '</div></div>';

  h += '<div class="panel"><div class="panel-h"><h3>État des données</h3></div><div class="panel-b"><div class="kpis" style="margin:0">' +
    Object.keys(SCHEMA).map(function (k) { return kpi(SCHEMA[k].label, DB[k].length, 'enregistrement' + (DB[k].length > 1 ? 's' : '')); }).join('') +
    '</div></div></div>';

  h += '<div class="danger-zone"><h4>Réinitialisation</h4>' +
    '<p>Efface toutes les données et recharge le jeu de départ (13 forfaits, 12 membres d\'équipe, grille de stock). <b>Irréversible.</b> Exportez d\'abord.</p>' +
    '<button class="btn btn-bad btn-sm" id="btnReset">Tout réinitialiser</button></div>';

  $('#view').innerHTML = h;

  var bc2 = $('#btnConnecter2');
  if (bc2) bc2.onclick = connecterDossier;

  $('#saveParams').onclick = function () {
    ['tauxEUR', 'tps', 'tvq', 'acompte', 'soldeJours', 'devisJours'].forEach(function (k) {
      DB.meta[k] = parseFloat($('#f_' + k).value) || 0;
    });
    DB.meta.pin = $('#f_pin').value || '0000';
    save(); toast('Réglages enregistrés'); render();
  };
  $('#btnExport').onclick = function () {
    dl('canada-motoneige-sauvegarde-' + today() + '.json', JSON.stringify(DB, null, 2), 'application/json');
    toast('Sauvegarde téléchargée');
  };
  $('#btnImport').onclick = function () { $('#fileImport').click(); };
  $('#fileImport').onchange = function () {
    var f = this.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var d = JSON.parse(r.result);
        if (!d.meta) throw new Error('format');
        if (!confirm('Remplacer toutes les données actuelles par ce fichier ?')) return;
        DB = d; save(); toast('Sauvegarde restaurée'); render();
      } catch (e) { alert('Fichier illisible ou invalide.'); }
    };
    r.readAsText(f); this.value = '';
  };
  $('#btnReset').onclick = function () {
    if (!confirm('Effacer TOUTES les données ? Cette action est irréversible.')) return;
    if (!confirm('Dernière confirmation : tout sera perdu.')) return;
    DB = seed(); save(); toast('Données réinitialisées'); render();
  };
}
function num(k, l, v, step) {
  return '<div class="f"><label for="f_' + k + '">' + esc(l) + '</label><input type="number" step="' + step + '" id="f_' + k + '" value="' + esc(v) + '"></div>';
}

/* ---------- export ---------- */
function dl(name, content, type) {
  var b = new Blob(['﻿' + content], { type: type + ';charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(b); a.download = name; a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
}
function exportCSV(key) {
  var mod = SCHEMA[key];
  var cols = mod.champs;
  var head = cols.map(function (c) { return '"' + c.l + '"'; }).join(';');
  var rows = DB[key].map(function (r) {
    return cols.map(function (c) {
      var v = r[c.k];
      if (c.t === 'ref') { var x = (DB[refColl(c)] || []).filter(function (y) { return y.id === v; })[0]; v = x ? refLabel(c, x) : ''; }
      else if (c.t === 'select') v = labelOpt(c, v);
      else if (c.t === 'check') v = v ? 'oui' : 'non';
      return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    }).join(';');
  });
  dl(key + '-' + today() + '.csv', head + '\n' + rows.join('\n'), 'text/csv');
  toast('CSV exporté');
}

/* ---------- navigation ---------- */
var VUES = [
  { k: 'dashboard', l: 'Tableau de bord', g: '', icon: 'M3 12h4l3 8 4-16 3 8h4', fn: renderDash },
  { k: 'reservations' }, { k: 'clients' }, { k: 'forfaits' },
  { k: 'compta' },
  { k: 'bilan', l: 'Bilan & taxes', g: 'Gestion', icon: 'M3 3v18h18M7 15l4-4 3 3 5-6', fn: renderBilan },
  { k: 'employes' }, { k: 'formations' }, { k: 'heures' },
  { k: 'paie', l: 'Récapitulatif paie', g: 'Ressources humaines', icon: 'M2 7h20v12H2zM2 11h20M6 15h4', fn: renderPaie },
  { k: 'stock' }, { k: 'commandes' }, { k: 'machines' },
  { k: 'params', l: 'Paramètres', g: 'Système', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6M19 12a7 7 0 00-.1-1l2-1.6-2-3.4-2.4 1a7 7 0 00-1.7-1L14.5 3h-4l-.3 2.6a7 7 0 00-1.7 1l-2.4-1-2 3.4 2 1.6a7 7 0 000 2l-2 1.6 2 3.4 2.4-1a7 7 0 001.7 1l.3 2.6h4l.3-2.6a7 7 0 001.7-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1z', fn: renderParams }
];

function buildNav() {
  var g = '', h = '';
  VUES.forEach(function (v) {
    var mod = SCHEMA[v.k];
    var groupe = v.g !== undefined ? v.g : (mod ? mod.groupe : '');
    var label = v.l || (mod ? mod.label : v.k);
    var icon = v.icon || (mod ? mod.icon : '');
    if (groupe !== g) { g = groupe; if (g) h += '<div class="side-group">' + esc(g) + '</div>'; }
    var n = mod ? DB[v.k].length : 0;
    h += '<a href="#/' + v.k + '" data-v="' + v.k + '">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="' + icon + '"/></svg>' +
      esc(label) + (mod && n ? '<span class="side-badge">' + n + '</span>' : '') + '</a>';
  });
  $('#sideNav').innerHTML = h;
}

function current() {
  var k = (location.hash || '#/dashboard').replace('#/', '').split('/')[0];
  return VUES.filter(function (v) { return v.k === k; })[0] ? k : 'dashboard';
}
function currentId() {
  return (location.hash || '').replace('#/', '').split('/')[1] || null;
}
function render() {
  var k = current();
  buildNav();
  $$('#sideNav a').forEach(function (a) { a.classList.toggle('on', a.dataset.v === k); });
  var v = VUES.filter(function (x) { return x.k === k; })[0];
  var mod = SCHEMA[k];
  $('#pageTitle').textContent = v.l || (mod ? mod.label : '');
  var id = currentId();
  if (id && mod && mod.detail) window[mod.detail] ? window[mod.detail](id) : renderClient(id);
  else if (v.fn) v.fn();
  else renderList(k);
  $$('[data-new]').forEach(function (b) { b.onclick = function () { openForm(this.dataset.new); }; });
  $$('[data-csv]').forEach(function (b) { b.onclick = function () { exportCSV(this.dataset.csv); }; });
  $('.side').classList.remove('open');
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', render);

/* ---------- garde d'acces ---------- */
// Verifie que le serveur accepte l'ecriture, en reecrivant les tarifs
// a l'identique : aucune donnee n'est modifiee.
function testerEcriture(cb) {
  if (!DB.forfaits.length) { ETAT.ecriture = 'aucune'; return cb(false); }
  fetch('../data/forfaits.json', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(donneesForfaits(), null, 1) })
    .then(function (r) {
      ETAT.ecriture = r.ok ? 'serveur' : (dirHandle ? 'dossier' : 'aucune');
      cb(r.ok);
    })
    .catch(function () {
      ETAT.ecriture = dirHandle ? 'dossier' : 'aucune';
      cb(false);
    });
}

function unlock() {
  $('#gate').hidden = true;
  $('#app').hidden = false;
  $('#sideVer').textContent = 'v' + VERSION;
  relireDossier(function (h) { if (h) { dirHandle = h; } });
  render();
  chargerForfaits(function () {
    var n = rattraperRevenus();
    render();
    if (n) toast(n + ' versement' + (n > 1 ? 's' : '') + ' ajouté' + (n > 1 ? 's' : '') + ' à la comptabilité');
    testerEcriture(function () { render(); });
  });
}
$('#gateForm').addEventListener('submit', function (e) {
  e.preventDefault();
  if ($('#gatePin').value === DB.meta.pin) { sessionStorage.setItem('cm_ok', '1'); unlock(); }
  else {
    var b = $('.gate-box'); b.classList.add('shake');
    setTimeout(function () { b.classList.remove('shake'); }, 400);
    $('#gatePin').value = ''; $('#gatePin').focus();
  }
});
$('#btnLock').onclick = function () { sessionStorage.removeItem('cm_ok'); location.reload(); };
$('#burgerAdm').onclick = function () { $('.side').classList.toggle('open'); };

/* ---------- demarrage ---------- */
load();
if (DB.meta.pin !== '0000') $('#gateNote').hidden = true;
if (sessionStorage.getItem('cm_ok')) unlock();
else $('#gatePin').focus();

})();
