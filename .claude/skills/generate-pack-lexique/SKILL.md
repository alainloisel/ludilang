---
name: generate-pack-lexique
description: Génère un pack de révision AloLangues (JSON) à partir d'un lexique brut (fichier texte, un mot par ligne, sans traduction), via script/lexique2pack.py, et l'enregistre dans packs/ + packs/index.json.
argument-hint: "[lexique/mon-lexique.txt]"
---

# Générer un pack AloLangues à partir d'un lexique brut

La skill `generate-pack` part d'un **PDF de cours** : elle suppose un verbatim riche
(leçons, grammaire, phrases). Celle-ci part d'une **liste de mots nue** — un mot par
ligne, aucune traduction — comme `lexique/lexiquebasqueBase.txt`.

Le travail se répartit ainsi :

- `script/lexique2pack.py` fait tout le **mécanique** : nettoyage, ids, assemblage,
  contrôles. Il ne traduit rien.
- Cette skill fait tout le **jugement** : traduire, thématiser, rédiger la grammaire.
  Elle ne réimplémente aucun contrôle du script.

Ne modifie jamais le code de l'application (`js/`, `css/`, `index.html`) — cette skill
ne touche qu'aux fichiers de `lexique/` et de `packs/`.

## Étape 1 — Identifier la source

- Si un argument (chemin vers un `.txt`) est fourni, l'utiliser directement.
- Sinon, lister les `.txt` de `lexique/`. S'il y a plusieurs candidats sans
  `-entrees.json` correspondant, demander lequel traiter (AskUserQuestion). S'il n'y
  en a qu'un, l'utiliser sans demander.

## Étape 2 — Préparer la liste de travail

Deux formes de source, deux sous-commandes. Toutes deux écrivent
`lexique/<nom>-entrees.json` — la **trace d'audit**, versionnée, comme `sources/*.md`
l'est pour la skill PDF.

**Liste de mots nue**, un mot par ligne :

```bash
python script/lexique2pack.py prepare lexique/<nom>.txt
```

Retire les lignes d'une seule lettre (intertitres d'alphabet), sépare les formes
composées (`Aitzin/Aintzin` → `mot: "Aitzin"`, `variantes: ["Aintzin"]`), et lève
`suspect: true` sur ce qui n'est pas jouable tel quel. Les entrées `suspect`
demandent une décision à l'étape 4.

**Lexique déjà traduit**, en tableaux Markdown sous des titres `## Thème`, colonnes
`mot | transcription | traduction` :

```bash
python script/lexique2pack.py prepare-md lexique/<nom>.md
```

La liste de travail ressort **déjà remplie** (traduction, thème, et `pinyin` pour la
transcription). Il reste à faire trois choses, que le script signale lui-même :

- les **doublons de mot** sont marqués `exclure: true` — vérifier que ce sont bien des
  doublons d'édition et non deux sens distincts ;
- les **thèmes de plus de 8 mots** sont listés : il faut les redécouper (étape 4) ;
- relire un échantillon de traductions plutôt que de tout faire confiance.

## Étape 3 — Charger les règles communes

Lire `import/PROMPT-PACK.md` en entier : la règle d'or (ne rien introduire qui ne soit
pas dans la source) et le schéma exact du pack s'appliquent ici aussi.

Ce que le mode lexique change : **il n'y a pas de verbatim**. Les `exemple` et la
`grammar` doivent donc être construits avec les **seuls mots de la liste**, et rien
d'autre.

## Étape 4 — Remplir la liste de travail

Par lots d'environ 40 entrées. Pour chacune :

- **`traduction`** en français, **unique dans tout le pack**. C'est un contrôle
  bloquant, et pour une bonne raison : `quiz.js` compare les options par chaîne et
  peint en vert _tous_ les boutons égaux à la bonne réponse — deux mots traduits « le
  chien » donnent deux boutons identiques et un clic juste peut être compté faux.
  Face à des variantes dialectales du même sens, ne pas dupliquer : les distinguer par
  une étiquette (« le chien » / « le chien (forme labourdine) »), ou fusionner.
- **`theme`** obligatoire sur **toutes** les entrées, groupes de 3 à 8 mots. Un thème
  partiel est pire que pas de thème du tout : `intrus.js` groupe par thème, et le mode
  Parcours ne bascule sur des blocs fixes que si _aucun_ mot n'en a — sinon le reste
  tombe silencieusement dans « Autres mots ».
  **Un gros thème doit être redécoupé en sous-thèmes, ce n'est pas cosmétique** :
  `computeUnites` (`js/parcours-plan.js`) ne clôt une unité avant d'ajouter un thème
  que si elle contient déjà des mots — un thème de 72 mots donne donc une unité de
  Parcours de 72 mots. Donner à chaque sous-thème un nom qui a du sens tout seul :
  c'est lui que « L'Intrus » affiche comme indice.
- **`exemple`** : phrase courte n'utilisant que du vocabulaire de la liste. **Laisser
  vide plutôt que de composer une phrase dont on n'est pas sûr** — dans une langue à
  déclinaison, une phrase fausse enseigne une faute.
- **`incertain: true`** sur toute traduction dont on n'est pas sûr, au lieu d'inventer.
  Le champ ne part pas dans le pack : il sert au compte-rendu de l'étape 7.
- **`exclure: true`** sur ce qui n'est pas un mot jouable (paradigme de cas, patron de
  suffixes du type `Hiz ... /ki /kuntza /keta ...`). Ces entrées sont **recyclées en
  grammaire** à l'étape 5, jamais jetées en silence.
- Les fautes de frappe du lexique peuvent être corrigées vers l'orthographe standard
  (`PROMPT-PACK.md` l'autorise explicitement) ; le champ `forme` garde la trace de
  l'original. Les **formes dialectales ne sont pas des fautes** : les garder telles
  quelles, avec une traduction étiquetée.

Écrire le remplissage avec un petit script jetable (une table `id → traduction, thème`
appliquée sur le JSON) plutôt qu'à la main : c'est plus sûr, et ça permet de faire
afficher la taille de chaque thème pour rééquilibrer.

## Étape 5 — Rédiger la grammaire

Dans `lexique/<nom>-grammaire.json`, un tableau d'objets `{id, titre, explication,
exemples, exercices}` — 3 à 5 points, 6 à 8 exercices chacun, comme le demande
`PROMPT-PACK.md`.

Ce qu'un lexique nu permet quand même : les nombres, les mots interrogatifs, les
marques de cas visibles dans les paires (`Ni-Nik`, `Nor-Nork`, `Nere-Niri`), la
formation des mots (les entrées `exclure` de l'étape 4).

Pour les exercices `trous` et `choix`, une **phrase porteuse en français** avec la
réponse dans la langue cible (« Pour demander « où », on dit \_\_\_ en basque. ») est plus
sûre qu'une phrase composée dans une langue qu'on maîtrise mal. Réserver `ordre` aux
séquences non ambiguës (une suite de nombres, par exemple).

`phrases` reste vide s'il n'y a pas de phrase sûre à écrire — le dire dans le
compte-rendu, avec ce que cela coûte (« Phrases en désordre » et « Détective » n'auront
presque rien à jouer).

## Étape 6 — Assembler

```bash
python script/lexique2pack.py build \
  --entrees lexique/<nom>-entrees.json \
  --grammaire lexique/<nom>-grammaire.json \
  --id <pack-id> --langue <code> --titre "…" --description "…"
```

L'id est en kebab-case et ne doit pas déjà exister dans `packs/index.json`. Le script
refuse d'écrire tant qu'un contrôle échoue : corriger la liste de travail et
relancer, ne jamais contourner. Il écrit `packs/<id>.json`, l'ajoute à
`packs/index.json`, et laisse les autres entrées intactes.

`verifier` s'utilise aussi seul sur n'importe quel pack :

```bash
python script/lexique2pack.py verifier packs/<id>.json
```

## Étape 7 — Rendre compte

Résumer à l'utilisateur :

- nombre de mots retenus et nombre de thèmes ;
- les entrées **exclues** et pourquoi, avec où elles ont été recyclées ;
- la **liste explicite des traductions marquées `incertain`**, à faire relire par un
  locuteur — c'est la partie du travail que la machine ne peut pas garantir ;
- **quels jeux restent jouables** avec cette langue :
  `jeuxCompatibles(pack)` de `js/parcours-catalogue.js` donne la réponse. Les jeux à
  contenu codé en dur (conjugaison, accord, syntaxe, préposition, verbes irréguliers,
  oreille, dialogue) sont réservés à `en`/`de` ; hors alphabet latin, Pendu et tous
  les jeux qui font écrire dans la langue étudiée (marathon, détective, textes à
  trous, dictée) sont masqués aussi.
- **une langue nouvelle demande trois ajouts** avant que le pack soit pleinement
  utilisable : son code dans `validatePack` (`js/store.js`), son drapeau dans
  `DRAPEAUX` (`js/app.js`), et son écriture dans la table `ECRITURE` de
  `js/parcours-catalogue.js` si elle n'est pas latine (avec la même table côté
  `script/lexique2pack.py`).
