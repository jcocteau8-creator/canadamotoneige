# -*- coding: utf-8 -*-
"""Serveur de developpement pour Canada Motoneige.

Sert le site comme un hebergeur classique, MAIS accepte en plus l'ecriture
de data/forfaits.json. C'est ce qui permet au back-office de publier les
tarifs sans aucune manipulation : « Enregistrer » suffit.

    python serve.py

AVERTISSEMENT : outil de developpement local uniquement.
Il n'ecoute que sur 127.0.0.1 (votre machine) et n'accepte l'ecriture que
sur les fichiers listes dans AUTORISES. Ne le mettez pas en ligne tel quel :
il n'a ni authentification ni protection contre les abus.
"""
import http.server
import io
import json
import os
import re
import socketserver
import sys

PORT = 8000
RACINE = os.path.dirname(os.path.abspath(__file__))
AUTORISES = {'/data/forfaits.json'}


def _montant(n, devise='CAD'):
    symbole = '\u20ac' if devise == 'EUR' else '$'
    return format(int(n), ',d').replace(',', ' ') + ' ' + symbole


def propager(donnees):
    """Reecrit les tarifs dans les pages de forfait et les cartes de liste.

    Retourne la liste des fichiers modifies.
    """
    modifies = []

    for f in donnees.get('forfaits', []):
        page = f.get('page')
        if not page:
            continue
        chemin = os.path.join(RACINE, page)
        if not os.path.isfile(chemin):
            continue
        texte = io.open(chemin, encoding='utf-8').read()
        avant = texte
        duo = int(f.get('prixDuo') or 0)
        solo = int(f.get('prixSolo') or 0)
        dev = f.get('devise') or 'CAD'

        if duo:
            texte = re.sub(
                r'(<div class="price-block" data-tarif="duo">\s*<strong>)[^<]*(</strong>)',
                lambda m: m.group(1) + _montant(duo * 2, dev) + m.group(2), texte)
            texte = re.sub(
                r'(data-tarif="duo">.*?<em class="price-sub">)[^<]*(</em>)',
                lambda m: m.group(1) + 'soit ' + _montant(duo, dev) + ' par personne' + m.group(2),
                texte, flags=re.S)
        if solo:
            texte = re.sub(
                r'(<div class="price-block" data-tarif="solo">\s*<strong>)[^<]*(</strong>)',
                lambda m: m.group(1) + _montant(solo, dev) + m.group(2), texte)

        if texte != avant:
            io.open(chemin, 'w', encoding='utf-8').write(texte)
            modifies.append(page)

    # cartes « a partir de » des pages de liste
    par_page = dict((f['page'], f) for f in donnees.get('forfaits', []) if f.get('page'))
    for liste in ('forfaits.html', 'index.html'):
        chemin = os.path.join(RACINE, liste)
        if not os.path.isfile(chemin):
            continue
        texte = io.open(chemin, encoding='utf-8').read()
        avant = texte

        def carte(m):
            f = par_page.get(m.group(1))
            if not f:
                return m.group(0)
            mini = int(f.get('prixDuo') or 0) or int(f.get('prixSolo') or 0)
            if not mini:
                return m.group(0)
            return re.sub(r'(<span class="price-value">)[^<]*',
                          lambda x: x.group(1) + format(mini, ',d').replace(',', ' ') + ' ',
                          m.group(0), count=1)

        texte = re.sub(r'<a href="([\w\-]+\.html)" class="package-card.*?</a>',
                       carte, texte, flags=re.S)
        if texte != avant:
            io.open(chemin, 'w', encoding='utf-8').write(texte)
            modifies.append(liste)

    return modifies


class Handler(http.server.SimpleHTTPRequestHandler):

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=RACINE, **kw)

    def _refus(self, code, message):
        corps = message.encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.send_header('Content-Length', str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_PUT(self):
        chemin = self.path.split('?')[0]
        if chemin not in AUTORISES:
            return self._refus(403, "Ecriture non autorisee sur ce chemin.")

        try:
            taille = int(self.headers.get('Content-Length') or 0)
        except ValueError:
            return self._refus(400, "Taille invalide.")
        if taille <= 0 or taille > 2_000_000:
            return self._refus(400, "Corps vide ou trop volumineux.")

        brut = self.rfile.read(taille)
        try:
            donnees = json.loads(brut.decode('utf-8'))
        except Exception:
            return self._refus(400, "Le corps n'est pas du JSON valide.")
        if not isinstance(donnees, dict) or not isinstance(donnees.get('forfaits'), list):
            return self._refus(400, "Structure inattendue : cle 'forfaits' absente.")
        # garde-fou : une liste vide effacerait tous les tarifs du site
        if len(donnees['forfaits']) == 0:
            return self._refus(400, "Refus : liste de forfaits vide.")

        cible = os.path.join(RACINE, *chemin.strip('/').split('/'))
        # ceinture et bretelles : la cible doit rester dans le dossier du site
        if not os.path.abspath(cible).startswith(RACINE + os.sep):
            return self._refus(403, "Chemin hors du dossier du site.")

        os.makedirs(os.path.dirname(cible), exist_ok=True)
        temporaire = cible + '.tmp'
        with open(temporaire, 'w', encoding='utf-8') as f:
            json.dump(donnees, f, ensure_ascii=False, indent=1)
        os.replace(temporaire, cible)  # ecriture atomique

        pages = propager(donnees)
        print('  -> %s mis a jour (%d forfaits)' % (chemin, len(donnees['forfaits'])))
        if pages:
            print('     pages reecrites : %s' % ', '.join(pages))
        self.send_response(204)
        self.send_header('Content-Length', '0')
        self.end_headers()

    def end_headers(self):
        # le back-office et les pages doivent toujours lire la derniere version
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '"PUT' in (fmt % args) or ' 4' in (fmt % args) or ' 5' in (fmt % args):
            sys.stderr.write("%s\n" % (fmt % args))


class Serveur(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    print('Site      : http://localhost:%d' % PORT)
    print('Back-office : http://localhost:%d/admin/' % PORT)
    print('Ecriture autorisee sur : %s' % ', '.join(sorted(AUTORISES)))
    print('Ctrl+C pour arreter.\n')
    with Serveur(('127.0.0.1', PORT), Handler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\nArrete.')
