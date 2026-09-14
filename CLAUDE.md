# AloLangues — instructions pour Claude Code

## Journal des changements (`doc/notes.md`)

À chaque tâche qui modifie le fonctionnement du site, l'outillage ou le
déploiement (nouvelle fonctionnalité, refonte, correction de bug non
triviale, changement de configuration d'hébergement, etc.), ajouter une
entrée en bas de `doc/notes.md` — ne jamais réécrire ou supprimer les entrées
précédentes.

Chaque entrée suit ce format :

```
## AAAA-MM-JJ — Titre court de ce qui a changé

**Contexte** : pourquoi ce changement (la demande, le problème rencontré).

**Décisions** : les choix faits et pourquoi, surtout s'il y avait plusieurs
options possibles.

**Fichiers créés/modifiés** : liste des fichiers touchés avec une phrase sur
ce que chacun fait.

**Reste à faire** (si applicable) : étapes manuelles ou suite du travail non
encore faites.
```

Ne pas créer d'entrée pour des tâches purement exploratoires (lecture de
code, questions sans changement) ou des corrections triviales (typo, format).
L'objectif est qu'une future session (humaine ou Claude) puisse comprendre
l'historique du projet sans avoir à relire tout `git log`.
