/* =====================================================================
   admin/clients.html — reservations et commandes REELLES (Supabase),
   separees du reste du back-office (qui reste en localStorage, code
   d'acces local, voir admin/app.js). Ici, vraie authentification :
   seul un compte marque role='admin' dans la table profiles peut entrer.
   ===================================================================== */
(function () {
  'use strict';
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dateFR(d) { if (!d) return '—'; var p = String(d).split('T')[0].split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : d; }

  var STATUTS_RESA = ['devis', 'confirmee', 'soldee', 'terminee', 'annulee'];
  var STATUTS_CMD = ['paiement_attente', 'payee', 'preparee', 'remise', 'expediee', 'annulee'];
  var TAG = { devis: 't-warn', confirmee: 't-blue', soldee: 't-ok', terminee: 't-gray', annulee: 't-bad',
              paiement_attente: 't-warn', payee: 't-ok', preparee: 't-blue', remise: 't-ok', expediee: 't-ok' };

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  function selectStatut(id, table, valeur, options) {
    return '<select data-id="' + id + '" data-table="' + table + '">' +
      options.map(function (o) {
        return '<option value="' + o + '"' + (o === valeur ? ' selected' : '') + '>' + o.replace('_', ' ') + '</option>';
      }).join('') + '</select>';
  }

  function afficherAcces(refuse) {
    $('#gate').hidden = false;
    $('#app').hidden = true;
    if (refuse) $('#gateErr').textContent = "Ce compte n'a pas les droits administrateur.";
  }

  function charger() {
    var db = window.CM_AUTH.client;

    Promise.all([
      db.from('reservations').select('*, profiles(nom, prenom, email)').order('created_at', { ascending: false }),
      db.from('commandes').select('*, profiles(nom, prenom, email)').order('created_at', { ascending: false })
    ]).then(function (r) {
      var resas = (r[0].data || []), cmds = (r[1].data || []);

      $('#kpis').innerHTML =
        '<div class="kpi"><div class="kpi-l">Devis en attente</div><div class="kpi-v">' +
          resas.filter(function (x) { return x.statut === 'devis'; }).length + '</div></div>' +
        '<div class="kpi"><div class="kpi-l">Réservations totales</div><div class="kpi-v">' + resas.length + '</div></div>' +
        '<div class="kpi warn"><div class="kpi-l">Paiement à organiser</div><div class="kpi-v">' +
          cmds.filter(function (x) { return x.statut === 'paiement_attente'; }).length + '</div></div>' +
        '<div class="kpi"><div class="kpi-l">Commandes totales</div><div class="kpi-v">' + cmds.length + '</div></div>';

      $('#cntResa').textContent = resas.length;
      $('#corpsResa').innerHTML = resas.length ? resas.map(function (r) {
        var c = r.profiles || {};
        return '<tr><td>' + esc((c.prenom || '') + ' ' + (c.nom || '')) + '<br><span style="color:var(--gray-500);font-size:.78rem">' + esc(c.email || '') + '</span></td>' +
          '<td>' + esc(r.forfait_nom) + '</td><td>' + (r.formule === 'solo' ? 'Solo' : 'Duo') + '</td>' +
          '<td>' + dateFR(r.debut) + '</td><td class="num">' + r.pax + '</td>' +
          '<td style="max-width:220px;white-space:normal">' + esc(r.message || '—') + '</td>' +
          '<td>' + dateFR(r.created_at) + '</td>' +
          '<td>' + selectStatut(r.id, 'reservations', r.statut, STATUTS_RESA) + '</td></tr>';
      }).join('') : '<tr><td colspan="8" class="empty">Aucune demande pour le moment.</td></tr>';

      $('#cntCmd').textContent = cmds.length;
      $('#corpsCmd').innerHTML = cmds.length ? cmds.map(function (r) {
        var c = r.profiles || {};
        return '<tr><td>' + esc((c.prenom || '') + ' ' + (c.nom || '')) + '<br><span style="color:var(--gray-500);font-size:.78rem">' + esc(c.email || '') + '</span></td>' +
          '<td>' + esc(r.article) + '</td><td>' + esc(r.variante || '—') + '</td>' +
          '<td class="num">' + r.qte + '</td><td>' + dateFR(r.created_at) + '</td>' +
          '<td>' + selectStatut(r.id, 'commandes', r.statut, STATUTS_CMD) + '</td></tr>';
      }).join('') : '<tr><td colspan="6" class="empty">Aucune commande pour le moment.</td></tr>';

      Array.prototype.forEach.call(document.querySelectorAll('select[data-table]'), function (sel) {
        sel.addEventListener('change', function () {
          db.from(sel.dataset.table).update({ statut: sel.value }).eq('id', sel.dataset.id)
            .then(function (r) { toast(r.error ? "Erreur : impossible d'enregistrer" : 'Statut mis à jour'); });
        });
      });
    });
  }

  function verifierAcces(user, profile) {
    if (!user) return afficherAcces(false);
    if (!profile || profile.role !== 'admin') return afficherAcces(true);
    $('#gate').hidden = true;
    $('#app').hidden = false;
    charger();
  }

  $('#gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#gateErr').textContent = '';
    window.CM_AUTH.connecter($('#gateEmail').value, $('#gatePass').value)
      .catch(function (err) { $('#gateErr').textContent = (err && err.message) || 'Connexion impossible.'; });
  });
  $('#btnDeco').addEventListener('click', function () { window.CM_AUTH.deconnecter(); });

  if (!window.CM_AUTH || !window.CM_AUTH.isConfigured) {
    $('#gateSous').textContent = "Compte client non configure pour l'instant (voir assets/js/supabase-config.js).";
  } else {
    window.CM_AUTH.onChange(verifierAcces);
  }
})();
