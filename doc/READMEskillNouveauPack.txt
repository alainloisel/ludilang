La skill est créée : `C:\Users\alain\afoAideAnglais\.claude\skills\generate-pack\SKILL.md`.

Elle encode tout le workflow suivi dans cette conversation (extraction verbatim → `.md`, lecture des règles `import/PROMPT-PACK.md`, génération exhaustive du vocabulaire/grammaire/phrases, validation JSON, écriture dans `packs/` + `packs/index.json`, compte-rendu final), avec la règle explicite d'exhaustivité du vocabulaire pour ne pas reproduire la sous-extraction initiale.

Elle est locale au projet (pas de dépendance gstack). Pour l'invoquer sur un nouveau PDF : `/generate-pack sources/allemand.pdf` (ou sans argument, elle demandera lequel traiter s'il y a plusieurs PDF non encore extraits dans `sources/`).
