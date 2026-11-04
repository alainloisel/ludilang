# Les 19 jeux : d'où vient leur contenu ?

État au 2026-11-04. Cette page classe les jeux de `js/games/` selon la façon dont
ils fabriquent leurs questions : contenu écrit à la main dans le code, contenu tiré
du pack du cours, mauvaises réponses ajustées ou tirées au hasard.

Légende :

- **À la main** : le contenu est écrit en dur dans le fichier du jeu, il ne dépend
  pas du cours choisi.
- **Pack** : le contenu vient du JSON du cours (`vocab`, `grammar`, `phrases`).
- **Hasard** : tirage aléatoire parmi les éléments disponibles.
- **Ajusté** : sélection guidée par une règle (thème, forme, etc.).

## Vue d'ensemble

| Jeu | Fichier | Source du contenu | Mauvaises réponses / difficulté | Par partie |
|---|---|---|---|---|
| Cartes flash | `flashcards.js` | Pack (vocab) | Sans objet. Cartes choisies par répétition espacée (`cartesDues`) | 12 cartes |
| Quiz éclair | `quiz.js` | Pack (vocab + exercices `choix`) | **Ajusté** (`distracteursPour`) pour le vocabulaire ; options du pack pour la grammaire | 10 questions : 8 vocab + 4 grammaire, mélangées, coupées à 10 |
| Course aux étoiles | `course.js` | Pack (vocab) | **Ajusté** (`distracteursPour`) | 8 questions, 8 s chacune |
| Memory | `memory.js` | Pack (vocab) | Sans objet (paires mot / traduction) | 8 paires |
| Pendu | `pendu.js` | Pack (vocab) | Sans objet | 3 mots, 7 vies |
| Phrases en désordre | `ordre.js` | Pack (`phrases` de 3 mots ou plus + exercices `ordre`) | Sans objet | 6 phrases |
| Trous | `trous.js` | Pack (exercices `trous`, un point de grammaire au choix) | Sans objet | tous les `trous` du point choisi |
| Dictée audio | `dictee.js` | Pack (phrases + vocab) | Sans objet (fautes soulignées lettre à lettre) | 6 items |
| Perroquet | `perroquet.js` | Pack (phrases + exemples du vocab, dont 2 du champ `phrases` garanties ; mots seuls en dernier recours). Étiquette d'origine | Sans objet (note de prononciation) | 5 phrases |
| Marathon | `marathon.js` | Pack (vocab) | Sans objet. **Hasard** simple, avec répétitions possibles | 45 s chrono |
| Intrus | `intrus.js` | Pack (vocab) | **Ajusté** par thème (3 mots du même thème + 1 d'un autre) ; **hasard** pur en dernier recours | 5 manches |
| Détective | `detective.js` | Pack (même réservoir que le Perroquet, tiré au hasard). Étiquette d'origine | **Généré** : une règle d'erreur (lettre doublée, h, th→d, ß→ss, inversion de lettres) altère un mot | 5 phrases |
| Dialogue | `dialogue.js` | **À la main** | Réponses fausses écrites à la main, mélangées | 1 scénario de 4 répliques |
| Conjugaison (château) | `conjugaison.js` | **À la main** | Saisie libre, pas de choix | 5 étages |
| Accord (vrai/faux) | `accord.js` | **À la main** | Vrai / faux écrit à la main, avec explication | 8 questions |
| Constructeur | `syntaxe.js` | Pack (exercices `ordre`, règle du point de grammaire en consigne) ; **à la main** en secours | Sans objet (mots à remettre en ordre) | 4 manches |
| Prépositions | `preposition.js` | **À la main** | 4 options écrites à la main | 5 questions |
| Défi des 3 formes | `irregular.js` | **À la main** | Sans objet (récitation au micro) | 5 verbes |
| L'Oreille Attentive | `oreille.js` | **À la main** | Paire de mots proches écrite à la main | 6 manches |

## 1. Jeux à contenu écrit à la main (6)

Ils ne lisent pas le pack (sauf le Constructeur, qui n'y a recours qu'en secours) et n'existent que pour l'anglais et l'allemand
(`langues: ["en", "de"]` dans `js/parcours-catalogue.js`). Sur un cours de chinois ou
de basque, ils ne sont pas proposés.

| Jeu | Anglais | Allemand | Détail |
|---|---|---|---|
| Accord (`accord.js`) | 31 | 30 | 15 phrases justes par langue, le reste fausses |
| Conjugaison (`conjugaison.js`) | 9 verbes (29 formes) | 5 verbes (27 formes) | 5 étages : verbe et temps tirés au hasard, **avec remise** (un même verbe peut revenir) |
| Dialogue (`dialogue.js`) | 6 scénarios (24 répliques) | 5 scénarios (20 répliques) | Un scénario tiré au hasard par partie (école, devoirs, maison, vacances, internat… / famille, matin, mode, magasin…) ; exclu des parcours automatiques (`enParcours: false`) |
| Défi des 3 formes (`irregular.js`) | 16 | 14 | Verbes irréguliers : base, prétérit, participe |
| Oreille (`oreille.js`) | 28 paires | 28 paires | Ex. ship / sheep, schon / schön, Hose / Hase ; pas d'homophones |
| Prépositions (`preposition.js`) | 27 | 28 | 4 options par question, une seule réponse possible |
| Constructeur (`syntaxe.js`) | 4 | 4 | Réserve de secours seulement : le jeu utilise d'abord les exercices `ordre` du pack (voir ci-dessous) |

Limites :

- Le **Dialogue** tire un scénario parmi 6 (anglais) ou 5 (allemand) ; les choix
  sont mélangés (avant le 2026-11-04, la bonne réponse était toujours le 1er bouton).
- Le **Constructeur** ne dépend plus de cette réserve depuis le 2026-10-07 : il tire
  4 exercices `ordre` du pack (consigne = `explication` du point de grammaire), et
  complète avec la réserve écrite à la main seulement pour l'anglais et l'allemand
  s'il en manque. Il est proposé sur tout cours qui a au moins un exercice `ordre`
  (chinois et basque compris), pas seulement en anglais / allemand.
- **Prépositions** (5 sur ~28), **Accord** (8 sur ~30) et **Oreille** (6 sur 28) ont
  maintenant un stock 3 à 5 fois plus grand que ce qu'une partie consomme.
- Ces contenus sont les mêmes quel que soit le cours : ils ne suivent pas le
  vocabulaire de la leçon en cours.

## 2. Jeux alimentés par le pack, au hasard (8)

Flashcards, Memory, Pendu, Phrases en désordre, Trous, Dictée, Perroquet, Marathon.
Leur difficulté dépend de la qualité du pack, pas du code. Ils tirent au hasard
(`sample`) parmi le vocabulaire ou les phrases du cours, sauf :

- **Cartes flash** : ne tire pas au hasard, elle prend les cartes « dues » selon la
  répétition espacée ; le hasard n'intervient que pour la « révision libre » quand
  tout est à jour.
- **Trous** : le joueur choisit le point de grammaire ; les exercices sont ceux
  écrits dans le pack (donc par Claude à la génération), joués dans un ordre aléatoire.
- **Phrases en désordre** : mélange les mots d'une phrase du pack ; ne sert que les
  phrases de 3 mots ou plus.
- **Marathon** : tire un mot à chaque question sans mémoire des précédents, donc
  un mot peut tomber deux fois de suite.

## 3. Mauvaises réponses ajustées (3 jeux)

- **Quiz éclair** et **Course aux étoiles** utilisent `distracteursPour()`
  (`js/utils.js`). Un candidat est noté ainsi :
  - même thème : +3 ;
  - même nombre de mots : +1,5 ;
  - même article ou « to » en tête : +1,5 ;
  - longueur proche : 0 à 1 ;
  - hasard : 0 à 1, pour varier d'une partie à l'autre.

  Les 3 mieux notés sont retenus, et les réponses identiques à la bonne sont écartées.
  Avant le 2026-10-07, ces deux jeux tiraient leurs distracteurs au hasard dans tout
  le pack (d'où « a pencil case » entouré de « busy » et « switch off »).
- **Intrus** : les 3 mots corrects viennent d'un même thème, l'intrus d'un autre thème.
  L'ordre de repli est : thèmes, puis longueur des mots (≤ 6 contre ≥ 9 lettres),
  puis hasard pur. Un pack sans thèmes retombe donc souvent sur le hasard.

## 4. Jeux qui génèrent leurs erreurs

- **Détective** : choisit au hasard un mot de plus de 3 lettres et l'abîme avec une
  règle (casse d'un nom allemand, lettre doublée supprimée, « h » retiré, « th »
  devenu « d », « ß » devenu « ss », sinon deux lettres inversées). Aucune
  liste d'erreurs n'est écrite à la main.

## 5. Ce qu'il resterait à améliorer

- Le **Marathon** pourrait éviter de reposer deux fois le même mot et privilégier les
  mots faibles (comme les cartes flash).
- Les jeux « à la main » pourraient être alimentés par le pack (ils ne suivent pas
  la leçon en cours). Conjugaison et Défi des 3 formes n'ont pas été enrichis.
- **Intrus** pourrait utiliser la forme du mot (comme `distracteursPour`) quand le
  pack n'a pas de thèmes.
- Les questions de grammaire du Quiz reprennent telles quelles les options du pack,
  dont la qualité dépend de la génération du pack.
