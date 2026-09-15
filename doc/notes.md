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
- `robots.txt` (nouveau, `Disallow: /`) + `<meta name="robots" content="noindex, nofollow">`
  dans `index.html` — le site est censé rester privé, autant l'exclure
  explicitement de toute indexation en plus du mot de passe. `robots.txt`
  reste servi sans authentification dans `worker/index.js` (sinon un crawler
  qui ne se connecte pas ne verrait jamais le `Disallow`).

**Reste à faire (actions manuelles hors repo)** :

1. Committer/pousser ces fichiers sur `main`.
2. Dans le dashboard Cloudflare (Workers & Pages → `ludilang` → Settings) :
   - Build command : `mkdir -p dist && cp -r index.html manifest.webmanifest sw.js robots.txt css js icons packs import dist/`
     (à vérifier/régler si pas déjà en place — le déploiement précédent
     tournait peut-être sans étape de build du tout).
   - Ajouter le secret `SITE_PASSWORD` pour ce **Worker** (Settings →
     Variables and Secrets — écran différent de l'ancien réglage « Pages »
     Production/Preview).
3. Vérifier après redéploiement : `curl -I https://ludilang.com/_login` doit
   renvoyer le formulaire de connexion (200), pas un 404 ; `/` sans cookie
   doit rediriger (302) vers `/_login`.

---

## 2026-09-14 — Correction : `/` resservait une version en cache, sans repasser par le Worker

**Contexte** : après déploiement du commit `f42df60` (« ludilang sécurisé »),
`/_login` et `/login` fonctionnaient (redirection, formulaire), mais
`ludilang.com/` restait accessible sans mot de passe. `curl -I` montrait
`CF-Cache-Status: HIT` avec exactement les mêmes en-têtes que ceux observés
_avant_ le déploiement du gate.

**Cause réelle** : le CDN Cloudflare avait mis en cache la réponse de `/`
depuis avant l'existence du Worker, et continuait à la resservir directement
depuis l'edge sans jamais ré-invoquer `worker/index.js` — un nouveau
déploiement de Worker ne purge pas automatiquement ce cache CDN.

**Décision** : forcer `Cache-Control: private, no-store` sur toute réponse
authentifiée renvoyée par le Worker (en plus des réponses du gate qui
l'avaient déjà), pour que Cloudflare ne mette plus jamais en cache une page
de ce site à l'edge — chaque requête doit systématiquement repasser par la
vérification du cookie. La perte de perf est négligeable (site
monoutilisateur) ; le mode hors-ligne de la PWA n'est pas affecté puisqu'il
repose sur le Cache Storage propre du service worker (`sw.js`), pas sur le
cache HTTP du navigateur/CDN.

**Fichiers modifiés** :

- `worker/index.js` — la réponse authentifiée (`env.ASSETS.fetch(request)`)
  est reconstruite avec `Cache-Control: private, no-store` au lieu de
  laisser passer l'en-tête par défaut (`public, max-age=0, must-revalidate`)
  posé automatiquement par Cloudflare pour les assets statiques.

**Reste à faire (action manuelle hors repo)** : un correctif de code ne peut
pas effacer une entrée déjà en cache côté Cloudflare — après avoir poussé ce
fix, purger le cache de la zone `ludilang.com` dans le dashboard Cloudflare
(**Caching → Configuration → Purge Everything**, ou une purge ciblée sur
`https://ludilang.com/`), puis revérifier avec `curl -I` que `/` répond bien
302 sans cookie et n'affiche plus `CF-Cache-Status: HIT`.

---

## 2026-09-14 — Correction : les fichiers statiques passaient avant le Worker (`run_worker_first`)

**Contexte** : après le commit `fe78fdd`, `/` restait accessible sans mot de
passe. Test décisif : `/?nocache=<valeur aléatoire>` renvoyait aussi
`CF-Cache-Status: HIT` — une URL unique ne peut pas sortir du cache CDN, donc
le diagnostic « cache » de l'entrée précédente était **faux**.

**Cause réelle** : avec Workers Static Assets, par défaut, une requête qui
correspond à un fichier existant dans `dist/` (`/` → `index.html`,
`/js/app.js`, etc.) est servie directement par la couche assets, **sans
exécuter le Worker**. Le Worker ne tourne que pour les URL sans fichier
(`/_login`, `/login`) — exactement ce qui était observé. L'en-tête
`CF-Cache-Status: HIT` vient de cette couche assets, pas du cache de zone.

**Décision** : ajouter `"run_worker_first": true` dans la section `assets` de
`wrangler.jsonc`, pour que **toutes** les requêtes passent d'abord par
`worker/index.js` (le gate), qui appelle ensuite `env.ASSETS.fetch()` si le
cookie est valide. Coût : une exécution de Worker par requête — négligeable
pour un site monoutilisateur (quota gratuit : 100 000 requêtes/jour).

**Fichiers modifiés** :

- `wrangler.jsonc` — `assets.run_worker_first: true`.
- La purge de cache demandée dans l'entrée précédente n'était pas la
  solution ; le `Cache-Control: private, no-store` ajouté dans
  `worker/index.js` reste en place (sans effet négatif).

**Reste à faire** : pousser, attendre le redéploiement, puis vérifier que
`curl -I https://ludilang.com/` renvoie `302` vers `/_login` sans cookie.

---

## 2026-09-15 — Transcription des photos du cahier par un sous-agent Sonnet

**Contexte** : la méthode pour passer des photos du cahier au verbatim du cours
n'était documentée nulle part. La skill `generate-pack` disait seulement
« extraire le texte via OCR », et les règles de lecture n'existaient que dans
l'en-tête de `sources/anglais2.md` (produit à la main depuis `photos/anglais2/`).
Question posée aussi : comment faire cette « OCR » à moindre coût.

**Décisions** :

- Pas d'OCR local (Tesseract, OCR Windows) : il reconnaît mal l'écriture
  manuscrite et ne sait pas recoller les mots des textes à trous
  (`b` + `alcony`). La lecture se fait par un modèle Claude.
- Transcription confiée à un sous-agent dédié en **Sonnet** plutôt que faite
  dans la session principale (Opus) : environ 2 à 3 fois moins cher par photo
  (16 photos 4000×3000 ≈ 77 000 tokens d'images), et surtout les images ne
  restent pas dans le contexte principal, où elles seraient relues à chaque
  échange pendant la génération du pack. Haiku écarté : trop fragile sur
  l'écriture d'un élève.
- Le sous-agent écrit `sources/<nom>.md` et ne renvoie qu'un compte-rendu court
  (pas la transcription), pour garder le contexte principal léger.
- Les conventions de `sources/anglais2.md` (sections `## Photo N — fichier`,
  marqueurs `[illisible]`, `[coupé]`, `[manuscrit]`…, fautes conservées, notes
  `> Note :`) sont figées dans la définition de l'agent pour que les prochaines
  transcriptions restent homogènes.
- Réduction de la taille des photos avant lecture non mise en place : à tester
  d'abord sur quelques photos (risque de perte de lisibilité).

**Fichiers créés/modifiés** :

- `.claude/agents/transcripteur.md` (nouveau) — sous-agent `transcripteur`
  (`model: sonnet`, outils Read/Write/Glob) : lit `photos/<nom>/` dans l'ordre des
  noms de fichiers et écrit le verbatim dans `sources/<nom>.md` selon les règles
  de transcription.
- `.claude/skills/generate-pack/SKILL.md` — accepte un dossier de photos en plus
  d'un PDF ; l'étape 2 délègue les photos à l'agent `transcripteur` (repli :
  agent `general-purpose` en `model: "sonnet"` si l'agent n'est pas encore
  chargé) et interdit de lire les photos dans la session principale.
- `README.md` — section « À partir de photos du cahier » : où déposer les
  photos, conseils de prise de vue, lancer `/generate-pack photos/<nom>`.
- `.gitignore` — les transcriptions `sources/*.md` sont désormais versionnées
  (trace de ce qui a servi à générer chaque pack) ; les photos (`photos/`), les
  PDF et les autres fichiers de `sources/` restent exclus.
- `sources/anglais.md`, `sources/anglais2.md` — premières transcriptions
  ajoutées au dépôt.

**Reste à faire** :

- Tester l'agent `transcripteur` sur le prochain dossier de photos.

---

## 2026-09-15 — Premier usage réel de l'agent `transcripteur` (photos/allemand1)

**Contexte** : premier test de l'agent sur un vrai dossier, `photos/allemand1/`
(14 photos), suivi de la génération du pack d'allemand de la rentrée.

**Résultat** : transcription complète en ~8 min, ~106 000 tokens côté
sous-agent (Sonnet), écrite dans `sources/allemand1.md` ; la session
principale n'a lu que ce fichier, jamais les images. Pack généré ensuite :
`packs/allemand-rentree-septembre.json` (94 mots, 5 points de grammaire,
15 phrases).

**Ce que le test a révélé (non prévu dans la conception)** :

- **Photos d'écran de tablette**, pas de cahier papier : l'élève prend ses
  notes dans une appli. L'agent a su écarter la barre d'outils et ne pas
  confondre le soulignement rouge du correcteur orthographique avec des
  annotations.
- **Photos hors cours dans le dossier** : 2 photos d'une notice d'alarme
  (photos 1-2) et 1 page de cours d'histoire (photo 6). L'agent a repéré la
  page d'histoire seul, mais les photos 1-2 surtout parce que le prompt de
  lancement les signalait. Elles ont été exclues du pack, et leur
  transcription remplacée après coup par une note d'une ligne dans
  `sources/allemand1.md` (≈ 250 lignes de bruit en moins dans le dépôt).
- **Photo inexploitable** (photo 3, floue) : marquée `[illisible]`.
- Réponses fausses de l'élève (sein à la place de haben) bien conservées dans
  la transcription et corrigées dans le pack : la séparation
  transcription fidèle / corrections dans le pack fonctionne.

**Décision prise suite au test** : une photo clairement hors cours n'est plus
transcrite ; sa section garde seulement une note
`> Hors cours — non transcrite : …`, et l'agent la liste dans son
compte-rendu. En cas de doute, il transcrit quand même.

**Fichiers créés/modifiés** :

- `sources/allemand1.md` — transcription des 14 photos (photos 1, 2 et 6
  réduites à la note « Hors cours »).
- `packs/allemand-rentree-septembre.json` (nouveau) et `packs/index.json` —
  le pack et son enregistrement.
- `.claude/agents/transcripteur.md` — nouvelle section « Photos hors cours » et
  ligne correspondante dans le compte-rendu.
- `.claude/skills/generate-pack/SKILL.md` — ne rien reprendre des photos
  « Hors cours » dans le pack.

**Reste à faire** : reprendre en photo la page floue (photo 3) si c'était une
page du cours.
