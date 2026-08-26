# 🎓 AloLangues

Application de révision d'**anglais** et d'**allemand** pour collégien, construite autour
d'une idée simple : on révise **uniquement le contenu de SON cours**, sous forme de jeux.

## Démarrer

Double-clique sur **`start.bat`** : le navigateur s'ouvre sur `http://localhost:8420/`.
(Il faut Python ou Node.js installé — la fenêtre noire doit rester ouverte pendant le jeu.)

Conseil : utiliser **Chrome** ou **Edge** pour profiter de l'audio et du micro.

Deux packs de démonstration (anglais 5e et allemand 5e) sont inclus pour essayer tout de suite.

## Les 8 jeux

| Jeu                    | Ce qu'on travaille                                                          |
| ---------------------- | --------------------------------------------------------------------------- |
| 🃏 Cartes flash        | le vocabulaire, avec répétition espacée (les mots reviennent au bon moment) |
| ⚡ Quiz éclair         | vocabulaire + grammaire, chrono et combos                                   |
| 🧠 Memory              | les paires mot ↔ traduction                                                 |
| 🪢 Le pendu            | l'orthographe des mots                                                      |
| 🧩 Phrases en désordre | l'ordre des mots, la syntaxe                                                |
| ✏️ Textes à trous      | les règles de grammaire du cours                                            |
| 🎧 Dictée audio        | la compréhension orale et l'orthographe                                     |
| 🦜 Le perroquet        | la prononciation, notée sur 100 (micro requis)                              |

XP, niveaux, badges et série quotidienne 🔥 pour garder la motivation. La progression est
enregistrée sur l'appareil (rien ne part sur internet, sauf si on utilise l'import par API).

## Importer le cours de l'ado (le vrai !)

### Méthode 1 — avec Claude Code (recommandé, gratuit à l'usage)

1. Ouvrir une session Claude Code dans ce dossier.
2. Demander : _« Génère un pack AloLangues à partir de ce verbatim en suivant
   `import/PROMPT-PACK.md`, enregistre-le dans `packs/` et ajoute-le à `packs/index.json` »_
   puis coller le verbatim du cours.
3. Recharger l'app : le nouveau cours apparaît dans le menu « Mon cours ».

### Méthode 2 — directement dans l'app (clé API)

Dans l'app : **📥 Importer un cours** → coller le verbatim → « Générer le pack ».
Nécessite une clé API Anthropic (payante à l'usage), stockée uniquement sur l'appareil.
On peut aussi y charger un fichier `.json` de pack généré ailleurs (pratique sur téléphone).

## Sur téléphone

Ouvrir l'app dans Chrome (Android) ou Safari (iPhone) puis « Ajouter à l'écran d'accueil » :
elle s'installe comme une vraie application et fonctionne hors ligne. Pour y accéder depuis
le téléphone, héberger le dossier sur n'importe quel hébergement statique (GitHub Pages,
Netlify…) ou utiliser l'ordinateur familial avec `start.bat`.

Note : la reconnaissance vocale du Perroquet fonctionne sur Chrome/Edge (ordinateur et
Android) ; sur iPhone elle peut être indisponible — la Dictée audio reste accessible partout.

## Structure

- `packs/` — les cours au format JSON (voir `import/PROMPT-PACK.md` pour le schéma)
- `js/games/` — un fichier par jeu ; ajouter un jeu = créer un module et le lister dans `js/app.js`
- Aucune dépendance : HTML/CSS/JS natif, API vocales du navigateur.
