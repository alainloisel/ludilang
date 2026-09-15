---
name: generate-pack
description: Génère un pack de révision AloLangues (JSON) à partir d'un PDF de cours ou d'un dossier de photos du cahier (verbatim), selon import/PROMPT-PACK.md, et l'enregistre dans packs/ + packs/index.json.
argument-hint: "[sources/cours.pdf | photos/<nom>]"
---

# Générer un pack AloLangues à partir d'un PDF ou de photos de cours

Cette skill reproduit, de façon systématique, le workflow utilisé pour générer un pack
AloLangues à partir du verbatim d'un cahier de cours (scanné en PDF ou photographié) :
extraction du texte, génération du JSON du pack selon les règles
d'`import/PROMPT-PACK.md`, validation, enregistrement dans `packs/`, et mise à jour de
`packs/index.json`.

Ne modifie jamais le code de l'application (`js/`, `css/`, `index.html`) — cette skill ne
touche qu'aux fichiers `sources/*.md` et `packs/*.json`.

## Étape 1 — Identifier la source

Deux types de source possibles :

- **un PDF** : `sources/<nom>.pdf` ;
- **un dossier de photos** du cahier : `photos/<nom>/` (une page par photo, `.jpg` /
  `.png`).

Choix de la source :

- Si un argument est fourni (chemin vers un PDF ou vers un dossier de photos),
  l'utiliser directement.
- Sinon, lister les candidats : `sources/*.pdf` et les sous-dossiers de `photos/`
  qui n'ont pas encore de `sources/<nom>.md` correspondant. S'il y en a plusieurs,
  demander à l'utilisateur lequel traiter (AskUserQuestion). S'il n'y a qu'un
  candidat évident, l'utiliser sans demander.
- Si `sources/<nom>.md` existe déjà, passer directement à l'étape 3 en le réutilisant.

## Étape 2 — Extraire le verbatim en Markdown

Le verbatim est écrit dans `sources/<nom>.md`. Ce fichier est versionné dans git
(trace de ce qui a servi à générer le pack) ; les photos et les PDF, eux, restent
exclus par `.gitignore`.

### Cas A — dossier de photos : déléguer au sous-agent `transcripteur`

**Ne pas lire les photos dans la session principale.** Chaque photo pèse plusieurs
milliers de tokens, et une fois lue elle reste dans le contexte de toute la suite de
la session (génération du pack comprise).

- Lancer l'outil Agent avec `subagent_type: "transcripteur"` (défini dans
  `.claude/agents/transcripteur.md`, modèle Sonnet), avec un prompt du type :
  _« Transcris le dossier `photos/<nom>/` vers `sources/<nom>.md`. »_
- Si ce type d'agent n'est pas disponible (agent créé pendant la session en cours,
  pas encore chargé), lancer un agent `general-purpose` avec `model: "sonnet"` et lui
  demander de lire puis d'appliquer `.claude/agents/transcripteur.md`.
- Attendre la fin de l'agent, puis lire `sources/<nom>.md` avec Read.
- Reprendre dans le compte-rendu final (étape 8) les passages que l'agent a signalés
  illisibles. Ne rouvrir une photo dans la session principale que pour trancher un
  passage précis, et seulement si c'est indispensable.

### Cas B — PDF

- Lire l'intégralité du PDF avec l'outil Read (il retourne le texte de toutes les pages
  en un seul appel pour un PDF de cette taille).
- Écrire `sources/<nom-du-pdf>.md` avec ce format (voir `sources/anglais.md` comme
  référence de style déjà produite) :
  - Un titre `# <nom>.pdf — texte extrait (verbatim)`.
  - Une note précisant que les fautes d'orthographe/de frappe et incohérences du
    manuscrit original sont conservées telles quelles.
  - Une section `## Page N` par page, avec le texte dans un bloc de code.
- Ce fichier `.md` doit être fidèle au PDF, sans corrections ni interprétations
  (celles-ci se font à l'étape 4, dans le pack JSON lui-même).

## Étape 3 — Charger les règles de génération

- Lire `import/PROMPT-PACK.md` en entier. Il définit :
  - la règle d'or : n'utiliser QUE le vocabulaire et les structures présents dans le
    verbatim (les mots-outils très basiques déjà connus — articles, pronoms,
    être/avoir — sont tolérés dans les exemples construits) ;
  - le schéma JSON exact attendu (`id`, `language`, `title`, `description`, `vocab`,
    `grammar`, `phrases`).

## Étape 4 — Générer le pack JSON

**Règle d'exhaustivité (leçon tirée d'une génération précédente qui avait sous-extrait
le vocabulaire — 51 mots retenus sur 87 disponibles) : le vocabulaire doit être
exhaustif, pas un échantillon.** Concrètement :

- Parcourir systématiquement toutes les listes/tableaux de vocabulaire structurés du
  document (mind maps, tableaux de matières scolaires, listes de mots classés par
  catégorie, etc.) et les reprendre **intégralement**, item par item — pas seulement
  une sélection représentative.
- Relever aussi les mots isolés utilisés dans les phrases d'exercices, dictées, et
  exemples de grammaire disséminés dans le reste du cours.
- Ne mettre de côté que les passages réellement illisibles ou ambigus du manuscrit
  (mot manuscrit indéchiffrable, phrase tronquée sans sens clair) plutôt que de les
  inventer ou de les deviner — et les lister explicitement dans le compte-rendu final.

Construction du pack :

- **`vocab`** : regrouper par thèmes de ~5 à 8 mots (peut varier selon le contenu).
  Chaque entrée a un `exemple` qui n'utilise que du vocabulaire déjà présent dans le
  cours (ou construit à partir de structures du cours, comme love/like/hate + mot).
  Préférer les phrases du cours elles-mêmes (corrigées orthographiquement) quand elles
  existent.
- **`grammar`** : un point par notion de grammaire identifiée dans le cours (BE, there
  is/are, présent simple, quantifieurs, modaux, prétérit, etc. — selon ce que contient
  la source traitée). Pour chaque point, 6 à 8 exercices variés (`trous` / `choix` /
  `ordre`), construits en priorité à partir des phrases originales du cours.
- **`phrases`** : 8 à 15 phrases complètes, extraites verbatim (corrigées) du cours
  quand c'est possible, sinon construites avec son seul vocabulaire.
- Contrainte technique de l'application (voir `js/store.js:60-76`) : `vocab` doit
  contenir au moins 4 entrées, chacune avec `mot` et `traduction` obligatoires ;
  `grammar` et `phrases` sont optionnels côté app mais doivent être riches d'après la
  règle du prompt-pack.

## Étape 5 — Choisir l'id du pack

- kebab-case, sans espace, dérivé du contenu ou du nom du fichier source.
- Vérifier qu'il n'entre pas en collision avec un `id` déjà présent dans
  `packs/index.json`.

## Étape 6 — Valider le JSON

Avant d'annoncer que c'est terminé :

```bash
node -e "JSON.parse(require('fs').readFileSync('packs/<id>.json','utf8')); console.log('OK')"
```

(ou l'équivalent Python `python3 -c "import json; json.load(open('packs/<id>.json', encoding='utf-8')); print('OK')"` si Node n'est pas disponible).

## Étape 7 — Enregistrer

- Écrire `packs/<id>.json`.
- Ajouter `{ "fichier": "<id>.json", "id": "<id>" }` à la liste `packs` de
  `packs/index.json`, en préservant les entrées existantes (ne jamais en supprimer ou
  en réécrire une autre sans que l'utilisateur l'ait demandé).

## Étape 8 — Rendre compte

Résumer à l'utilisateur :

- le nombre de mots de vocabulaire, de points de grammaire, de phrases ;
- les thèmes de vocabulaire couverts ;
- les passages du manuscrit volontairement écartés (illisibles/ambigus) et pourquoi.
