# Rapport — génération du pack basque

Compte-rendu de la génération de `packs/basque-base.json` à partir de
`lexique/lexiquebasqueBase.txt`, et de l'outillage créé au passage.

---

## 1. À faire relire par un bascophone

Ces 11 traductions sont marquées `incertain: true` dans
`lexique/lexiquebasqueBase-entrees.json`. Le champ ne part pas dans le pack : il
sert uniquement de liste de relecture. C'est la partie du travail qu'aucun
contrôle automatique ne peut garantir.

| Mot       | Traduction retenue            | Remarque                            |
| --------- | ----------------------------- | ----------------------------------- |
| **Mitra** | la mitre (coiffe de l'évêque) | ⚠️ celle où je parierais contre moi |
| **Peto**  | exact, juste                  | ⚠️ idem                             |
| Apal      | modeste, humble               | ou « l'étagère » ?                  |
| Berina    | la vitre                      | forme labourdine                    |
| Hel egin  | appeler à l'aide              |                                     |
| Isurbide  | le conduit d'écoulement       |                                     |
| Ortzi     | le firmament (mot ancien)     |                                     |
| Pentze    | le pré                        | forme labourdine                    |
| Sen       | l'instinct, le bon sens       |                                     |
| Uhaitz    | le torrent                    | forme labourdine                    |
| Ximindegi | la cheminée                   | forme labourdine                    |

### Corrections d'orthographe appliquées

Deux fautes de frappe du lexique corrigées vers l'orthographe standard —
`import/PROMPT-PACK.md` l'autorise explicitement, et le champ `forme` de la liste
de travail garde la trace de l'original :

- `Garantzi` → **Garrantzi**
- `Minzatu` → **Mintzatu**

### Convention retenue pour les variantes dialectales

Plutôt que de fusionner les doublons ou de les jeter, ils sont **étiquetés** :

- `Txakur` « le chien », `Xakur` « le chien (forme labourdine) »,
  `Zakur` « le chien (gros chien) »
- même traitement pour katu/gatu, zoko/xoko, zuri/xuri, ongi/ontsa, ordu/oren,
  non/nun, etorri/jin.

C'est ce qui rend toutes les traductions uniques — une contrainte **bloquante** du
validateur, et pour une raison concrète : `quiz.js` compare les options par chaîne
et peint en vert _tous_ les boutons égaux à la bonne réponse. Deux entrées traduites
« le chien » donneraient deux boutons identiques, tous deux verts, et un clic juste
pourrait être compté faux.

---

## 2. Ce qui a été livré

| Fichier                                         | Rôle                                                                                                                                                                             |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `script/lexique2pack.py`                        | Outil générique : `prepare` / `build` / `verifier`. Le code de langue est un argument, rien n'est codé en dur pour le basque. `verifier` s'utilise seul sur n'importe quel pack. |
| `.claude/skills/generate-pack-lexique/SKILL.md` | Skill `/generate-pack-lexique`, pendant de `generate-pack` (qui, lui, part d'un PDF de cours) pour les listes de mots nues.                                                      |
| `lexique/lexiquebasqueBase-entrees.json`        | Liste de travail remplie — trace d'audit versionnée.                                                                                                                             |
| `lexique/lexiquebasqueBase-grammaire.json`      | Les 5 points de grammaire rédigés.                                                                                                                                               |
| `packs/basque-base.json`                        | Le pack : **316 mots**, **52 thèmes** de 4 à 10 mots.                                                                                                                            |
| `packs/index.json`                              | Une ligne ajoutée.                                                                                                                                                               |

Les 5 points de grammaire sont tirés du seul lexique : les nombres, les mots
interrogatifs, la marque **-k** (ergatif), la marque **-i** (datif), et la formation
des mots. La seule entrée écartée du vocabulaire,
`Hiz ... /ki /kuntza /keta ...`, est recyclée dans ce dernier point.

`phrases` est volontairement vide : composer des phrases basques correctes
(déclinaison, ergatif) dépasse ce que je peux garantir, et une phrase fausse
enseigne une faute.

---

## 3. Vérifications

- Les **11 jeux** testés se lancent sans erreur sur le pack.
- **0 doublon d'options** sur 200 tirages de quiz.
- `build` **refuse d'écrire** sur données fautives : testé avec un doublon de
  traduction et un thème manquant → sortie 1, aucun fichier créé, `index.json`
  intact.
- Le validateur passe sur 5 des 6 packs existants. Il signale un défaut
  **préexistant**, volontairement non corrigé :
  `anglais-5eme-may-june.json` v146 `was / were (to be)`.
- `pre-commit run --all-files` : tout vert (prettier, eslint, fins de ligne LF).

### Deux prédictions du plan étaient trop pessimistes

- « Phrases en désordre » n'est **pas** vide : les 2 exercices `ordre` de la leçon
  de nombres lui donnent 2 manches.
- « Détective » produit **4 enquêtes**, via son repli sur les mots seuls.

### Limites confirmées, conséquences du choix de ne pas modifier l'app

- Dictée affiche « Aucune voix **anglaise** n'est installée » (aucune voix basque
  n'existe sur la machine).
- Marathon affiche « Traduire en **anglais** ».
- Une Leçon rapide programme bien `dictee`, `conjugaison`, `oreille`… — donc **le
  Parcours se fige sur l'écran 🔇 quand Dictée sort**. Le garde-fou de
  `dictee.js:17-26` fait `innerHTML` puis `return` sans jamais appeler
  `ctx.finPartie`, et le moteur n'avance que sur cet appel
  (`parcours.js:124-134`). Seul « ← Quitter » permet d'en sortir.
- `validatePack` (`js/store.js:66`) n'accepte que `"en"`/`"de"` : le pack ne
  fonctionne que par `packs/index.json`, pas par l'écran d'import.

> Ces limites sont traitées dans le tour suivant (support du chinois), qui ajoute
> un filtrage des jeux selon la langue et l'écriture du cours.

---

## 4. État git au moment de ce rapport

Rien n'est commité. `lexique/` et `script/` sont non suivis, et
`lexiquebasqueBase.txt` / `motsUniques.py` / `motsUniques.txt` apparaissent
supprimés à la racine — ce sont des déplacements. Le commit doit porter sur
`lexique/`, `script/`, `.claude/skills/generate-pack-lexique/`,
`packs/basque-base.json` et `packs/index.json`, en laissant de côté la
modification de `start.bat`, qui est celle de l'utilisateur.
