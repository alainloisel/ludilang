# Notes de projet — AloLangues

Journal des changements notables, dans l'ordre chronologique (le plus récent
en bas). Un ajout par entrée : ce qui a changé, pourquoi, et les fichiers
touchés.

---

## 2026-09-14 — Hébergement Cloudflare Pages + protection par mot de passe

**Contexte** : le site va être hébergé sur un nom de domaine acheté chez
Cloudflare Registrar, via Cloudflare Pages connecté au repo GitHub
(`alainloisel/ludilang`). Usage monoutilisateur (familial) → besoin d'un
verrou d'accès simple plutôt qu'un vrai système multi-comptes.

**Décisions** :

- Protection par un mot de passe unique (formulaire + cookie signé), pas de
  Cloudflare Access (email OTP) ni de HTTP Basic Auth — Basic Auth est peu
  fiable en PWA « ajoutée à l'écran d'accueil » (écran blanc possible sur
  iOS).
- Build Cloudflare Pages qui ne publie que le nécessaire au fonctionnement de
  l'app (`index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`,
  `icons/`, `packs/`, `import/`) dans un dossier `dist/` — les photos du
  cahier, PDF de cours, `lexique/`, `doc/`, `script/`, `.claude/` restent sur
  GitHub mais ne sont jamais servis en HTTP, même derrière le mot de passe.

**Fichiers créés/modifiés** :

- `functions/_middleware.js` (nouveau) — gate d'authentification Cloudflare
  Pages Functions. Compare le mot de passe soumis à la variable
  d'environnement `SITE_PASSWORD` (jamais commitée), pose un cookie
  `HttpOnly; Secure; SameSite=Lax` signé par HMAC-SHA256, redirige vers
  `/_login` si absent/invalide. Toutes les réponses du gate portent
  `Cache-Control: no-store`.
- `sw.js` — deux corrections pour que le service worker survive au gate :
  - `CACHE` monté en `alo-langues-v8` (purge l'ancien cache).
  - Le handler `fetch` ne met plus en cache que les réponses `rep.ok` (une
    401 du gate ne doit jamais être resservie hors-ligne).
  - Les requêtes de navigation redirigées (ex. vers `/_login`) sont
    reconstruites en 302 propre avant `respondWith` — sinon Chrome refuse une
    réponse « redirected » pour une requête `navigate` et l'app plante après
    expiration du cookie (30 jours).

**Reste à faire (actions manuelles hors repo)** — voir le plan complet dans
`C:\Users\alain\.claude\plans\linked-dancing-dream.md` :

1. Committer/pousser ces fichiers sur `main`.
2. Créer le projet Cloudflare Pages connecté au repo, avec :
   - Build command : `mkdir -p dist && cp -r index.html manifest.webmanifest sw.js css js icons packs import dist/`
   - Build output directory : `dist`
3. Ajouter la variable d'environnement `SITE_PASSWORD` (chiffrée) en
   **Production ET Preview**.
4. Rattacher le nom de domaine (déjà dans la zone DNS Cloudflare, un clic).
5. Vérifier : gate actif sur le domaine perso ET sur `*.pages.dev`, PWA
   « ajoutée à l'écran d'accueil » fonctionnelle, aucune réponse 401 en
   cache (DevTools → Application → Cache Storage).

**Point de vigilance non résolu** : `packs/index.json` référence localement
`basque-base.json` et `chinois-base.json`, qui ne sont pas encore commités.
Si `packs/index.json` est poussé sans ces deux fichiers, l'app pointera vers
des packs 404 en production.

---

## 2026-09-14 — Correction : le gate mot de passe ne s'exécutait pas (mauvais mode de déploiement)

**Contexte** : après le premier déploiement, `ludilang.com` était accessible
sans jamais demander le mot de passe. Diagnostic (`curl` sur `/_login`) : 404
sec en GET et en POST → aucune logique ne tournait pour cette route.

**Cause réelle** : le projet Cloudflare n'a pas été créé comme **Pages**
(malgré ce qui avait été supposé) mais comme **Worker avec assets
statiques**, déployé via Wrangler (log de build : `Uploaded ludilang`,
`workers.dev`, `Current Version ID`). Or `functions/_middleware.js` est une
convention **exclusive à Cloudflare Pages** — elle n'existe pas côté Workers,
donc le fichier était juste envoyé tel quel comme asset statique et servi en
clair sur `/functions/_middleware.js` (jamais exécuté).

**Décision** : réécrire le gate comme un vrai Worker (`export default {
fetch }` avec le binding `env.ASSETS`), déclaré explicitement via un
`wrangler.jsonc` commité dans le repo — pour que le prochain build
(Cloudflare Workers Builds, connecté au même repo GitHub) déploie ce Worker
au lieu de retomber sur un déploiement « assets seuls » par défaut.

**Fichiers créés/modifiés** :

- `wrangler.jsonc` (nouveau) — déclare le Worker `ludilang`, l'entrée
  `worker/index.js`, et le binding `ASSETS` pointant sur `./dist` (même
  dossier de build trimmé que prévu pour Pages).
- `worker/index.js` (nouveau) — même logique de gate que l'ancien
  `functions/_middleware.js` (formulaire + cookie signé HMAC-SHA256 sur
  `SITE_PASSWORD`), adaptée à l'API Workers : `env.ASSETS.fetch(request)` à
  la place de `next()` de Pages Functions.
- `functions/_middleware.js` (supprimé) — mort dans ce mode de déploiement.

**Reste à faire (actions manuelles hors repo)** :

1. Committer/pousser ces fichiers sur `main`.
2. Dans le dashboard Cloudflare (Workers & Pages → `ludilang` → Settings) :
   - Build command : `mkdir -p dist && cp -r index.html manifest.webmanifest sw.js css js icons packs import dist/`
     (à vérifier/régler si pas déjà en place — le déploiement précédent
     tournait peut-être sans étape de build du tout).
   - Ajouter le secret `SITE_PASSWORD` pour ce **Worker** (Settings →
     Variables and Secrets — écran différent de l'ancien réglage « Pages »
     Production/Preview).
3. Vérifier après redéploiement : `curl -I https://ludilang.com/_login` doit
   renvoyer le formulaire de connexion (200), pas un 404 ; `/` sans cookie
   doit rediriger (302) vers `/_login`.
