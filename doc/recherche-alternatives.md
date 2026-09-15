# Brief de recherche approfondie — Alternatives à AloLangues

> Document à coller tel quel dans un outil de recherche approfondie (Claude Research,
> ChatGPT Deep Research, Perplexity, Gemini Deep Research…). Il décrit notre système
> pour servir de point de comparaison, puis précise ce qu'on cherche et le format du
> rapport attendu.

---

## 1. Mission

Dresse un **panorama complet et à jour (2026)** des solutions, **commerciales ou open
source**, qui permettent de **réviser ou réapprendre une langue vivante par le jeu**,
et compare-les à notre application, AloLangues, décrite ci-dessous.

Le but est de répondre à trois questions :

1. **Existe-t-il déjà un produit qui fait ce que fait AloLangues** (surtout : réviser
   *son propre cours* sous forme de jeux) ? Si oui, lequel, à quel prix, avec quelles
   limites ?
2. **Qu'est-ce que les meilleures solutions font mieux que nous**, et dont on pourrait
   s'inspirer ?
3. **Quels besoins restent mal couverts** par le marché, où AloLangues a un intérêt réel ?

## 2. Notre système (référence de comparaison)

**AloLangues** est une application web (PWA installable, fonctionne hors ligne),
sans dépendance, développée pour un usage familial.

**Idée centrale** : on ne révise **que le contenu de SON cours**. Le cours de l'élève
(photos du cahier, PDF, texte) est transformé par une IA (Claude) en un « pack » de
révision : vocabulaire classé par thèmes avec exemples, points de grammaire avec
explications et exercices, phrases clés. Les jeux puisent ensuite dans ce pack.

**Chaîne d'import du cours** :

- photos du cahier ou de la tablette → transcription fidèle par un modèle d'IA
  (fautes de l'élève conservées, corrigées seulement dans le pack) ;
- verbatim → génération du pack JSON par IA, avec une règle stricte : **aucun mot
  hors du cours** ;
- aussi possible directement dans l'app avec une clé API, ou à partir d'une simple
  liste de mots (lexique).

**Jeux (19)** :

- *Vocabulaire* : cartes flash avec répétition espacée, Memory, pendu, quiz chrono
  avec combos, marathon de traduction, course aux étoiles, trouver l'intrus.
- *Grammaire et syntaxe* : textes à trous, phrases en désordre, construction de
  phrases selon une consigne grammaticale, repérer et corriger la faute, juger un
  accord, prépositions, conjugaison, verbes irréguliers.
- *Oral* : dictée audio (synthèse vocale), « perroquet » (répéter une phrase, note de
  prononciation sur 100 via reconnaissance vocale), discrimination de sons proches,
  jeu de rôle / dialogue avec un bot (réponse au choix ou à la voix).

**Autour des jeux** : mode « Parcours » (enchaînement automatique qui alterne jeux
ludiques et scolaires, découpé en unités), XP, niveaux, badges, série quotidienne.

**Langues actuelles** : anglais, allemand, basque, chinois (pinyin affiché).

**Public actuel** : collégien français (LV1 anglais, LV2 allemand).

**Vie privée** : progression stockée uniquement sur l'appareil, pas de compte, site
privé protégé par mot de passe. Seul l'import passe par une API d'IA.

**Coût** : quasi nul (hébergement statique gratuit + quelques centimes d'IA par cours
importé).

## 3. Publics à considérer

Évaluer chaque solution pour deux profils distincts :

- **A. Élève ou étudiant en langue vivante** (collège, lycée, université, en priorité
  en France) : doit réviser *le programme de sa classe* avant un contrôle ; motivation
  souvent faible ; parents parfois impliqués ; enjeux de protection des données de
  mineurs.
- **B. Adulte qui veut « se remettre dans le bain »** d'une langue apprise autrefois
  (faux débutant, niveau A2-B1 rouillé) : veut réactiver vite, avec plaisir, en
  quelques minutes par jour, sans repartir de zéro.

## 4. Catégories à explorer

Couvrir **au minimum** les familles suivantes. Les noms cités sont des pistes de
départ, pas une liste fermée : **vérifier qu'ils existent toujours, compléter, et
signaler les nouveaux acteurs 2024-2026**.

1. **Applications grand public gamifiées** (ex. Duolingo, Babbel, Busuu, Memrise,
   Mondly, Drops, Lingvist, Rosetta Stone…).
2. **Outils où l'on crée ses propres jeux / quiz à partir de son contenu** (ex. Quizlet,
   Wordwall, Kahoot, Blooket, Gimkit, LearningApps, H5P…).
3. **Outils de révision « à partir de ses notes » par IA** : import de photos, PDF ou
   cours → génération automatique de flashcards, quiz, jeux (ex. Quizlet IA, Knowt,
   Gizmo, StudyFetch, Revisely, et les fonctions équivalentes des assistants
   généralistes). **Catégorie la plus proche de nous : à creuser en priorité.**
4. **Répétition espacée** (ex. Anki et ses decks partagés, Mnemosyne, Clozemaster…).
5. **Conversation / prononciation assistées par IA** (ex. Speak, Praktika, Loora,
   modes vocaux des assistants IA, ELSA pour la prononciation…).
6. **Plateformes scolaires françaises** alignées sur les programmes (soutien scolaire
   en ligne, manuels numériques avec exercices interactifs, ressources publiques de
   l'Éducation nationale…).
7. **Open source et auto-hébergeable** (ex. LibreLingo, Anki, H5P, Oppia, et tout
   projet GitHub actif d'app de langue par le jeu).
8. **Langues moins courantes** : offres pour le **basque** et le **chinois** en
   particulier (applis dédiées, ressources régionales ou associatives).

## 5. Grille de comparaison

Pour chaque solution retenue, renseigner :

| Critère | À préciser |
|---|---|
| Type / modèle | commercial, freemium, gratuit, open source (licence), auto-hébergeable ? |
| Prix | tarifs réels constatés en 2026, ce que couvre la version gratuite |
| **Contenu personnel** | peut-on réviser **son propre cours** ? import texte / PDF / **photo** ? génération automatique par IA ? |
| Fidélité au cours | le contenu généré reste-t-il limité au cours importé, ou ajoute-t-il du vocabulaire hors programme ? |
| Variété des jeux | nombre et types (vocabulaire, grammaire, oral, écrit) |
| Grammaire | exercices contextualisés et explications, ou vocabulaire seulement ? |
| Oral | synthèse vocale, reconnaissance vocale, note de prononciation, dialogue |
| Répétition espacée | oui / non, algorithme si connu |
| Motivation | XP, séries, classements, multijoueur, parcours guidé |
| Langues | anglais, allemand, basque, chinois, et nombre total |
| Plateformes | web, iOS, Android, hors ligne |
| Public visé | enfants / ados / adultes ; usage prof-classe ou individuel |
| Vie privée | compte obligatoire, publicité, revente de données, conformité RGPD, âge minimum, stockage des données (UE ?) |
| Efficacité | études indépendantes, avis de profs, retours d'utilisateurs (distinguer marketing et preuves) |
| Adéquation profil A / profil B | note ou avis argumenté pour chacun |

## 6. Livrable attendu

Un rapport en **français**, structuré ainsi :

1. **Résumé** (10 lignes) : les réponses aux trois questions de la section 1.
2. **Tableau comparatif** des 15 à 25 solutions les plus pertinentes, selon la grille.
3. **Fiches courtes** pour les 5 à 8 solutions les plus proches d'AloLangues : ce
   qu'elles font, prix, forces, faiblesses, ce qu'on pourrait leur emprunter.
4. **Carte de positionnement** (texte ou tableau à deux axes) : « contenu générique ↔
   contenu de son propre cours » × « exercices scolaires ↔ vrais jeux ».
5. **Lacunes du marché** et ce qui différencie réellement AloLangues (ou pas).
6. **Recommandations concrètes** : fonctionnalités à ajouter, intégrations utiles
   (ex. export vers Anki, import de decks existants), projets open source à réutiliser
   plutôt que refaire.
7. **Sources** : liste des URLs consultées, avec leur date.

## 7. Exigences de méthode

- **Sources récentes** : privilégier 2025-2026 ; dater chaque information de prix ou
  de fonctionnalité. Le marché bouge vite (surtout les outils IA).
- **Vérifier plutôt que supposer** : ne pas inventer de fonctionnalités, de prix ou de
  chiffres. Si une info n'est pas trouvée, écrire « non trouvé ».
- **Séparer faits et opinions** : pages officielles pour les fonctionnalités, tests
  indépendants, forums (Reddit, avis des stores, communautés de profs) pour les
  retours d'usage.
- **Signaler les produits abandonnés** ou rachetés.
- Pour l'open source : dernier commit, activité, licence, facilité d'installation.

## 8. Hors périmètre

- Cours particuliers avec des humains (italki, Preply…), sauf s'ils ont une vraie
  brique de jeux ou de révision.
- Séjours linguistiques, cours en présentiel.
- Simples dictionnaires ou traducteurs.
