// Catalogue des jeux pour le mode Parcours : catégorie, dépendances au pack,
// et disponibilité selon le contenu du cours.
//
// Ces métadonnées vivent ici et non dans le `meta` de chaque jeu : c'est de la
// politique d'ordonnancement côté parcours, pas une propriété du jeu lui-même.
// Les 19 modules de js/games/ restent inchangés.

import * as flashcards from "./games/flashcards.js";
import * as quiz from "./games/quiz.js";
import * as memory from "./games/memory.js";
import * as pendu from "./games/pendu.js";
import * as ordre from "./games/ordre.js";
import * as trous from "./games/trous.js";
import * as dictee from "./games/dictee.js";
import * as perroquet from "./games/perroquet.js";
import * as intrus from "./games/intrus.js";
import * as course from "./games/course.js";
import * as dialogue from "./games/dialogue.js";
import * as detective from "./games/detective.js";
import * as conjugaison from "./games/conjugaison.js";
import * as accord from "./games/accord.js";
import * as syntaxe from "./games/syntaxe.js";
import * as preposition from "./games/preposition.js";
import * as irregular from "./games/irregular.js";
import * as marathon from "./games/marathon.js";
import * as oreille from "./games/oreille.js";

// cat        : "ludique" | "scolaire" — sert à alterner les étapes.
// vocab      : true si le jeu puise dans pack.vocab (on peut alors lui passer un
//              pack virtuel réduit aux mots à réviser).
// interlude  : jeu à contenu codé en dur (ignore pack.vocab) ; bon pour la
//              variété, mais ne fait pas progresser le vocabulaire d'une unité.
// enParcours : false pour exclure le jeu des séquences automatiques.
// dispo      : prédicat optionnel ; sans lui le jeu est toujours proposable.
export const CATALOGUE = {
  flashcards: { mod: flashcards, cat: "scolaire", vocab: true },
  quiz: { mod: quiz, cat: "scolaire", vocab: true },
  memory: { mod: memory, cat: "ludique", vocab: true },
  pendu: { mod: pendu, cat: "ludique", vocab: true },
  course: { mod: course, cat: "ludique", vocab: true },
  intrus: { mod: intrus, cat: "ludique", vocab: true },
  marathon: { mod: marathon, cat: "ludique", vocab: true },
  perroquet: { mod: perroquet, cat: "ludique", vocab: true },
  dictee: { mod: dictee, cat: "scolaire", vocab: true },
  detective: { mod: detective, cat: "scolaire", vocab: true },

  // Conversation ouverte : pas de score exploitable dans une séquence notée.
  dialogue: { mod: dialogue, cat: "ludique", vocab: true, enParcours: false },

  // Pas de dispo() ici : il faudrait recopier collecter() de ordre.js, qui
  // finirait par diverger. Avec un pool vide le module appelle aussitôt
  // finPartie({reponses: 0}) — le moteur remplace l'étape à la volée.
  ordre: { mod: ordre, cat: "scolaire", vocab: true },

  trous: {
    mod: trous,
    cat: "scolaire",
    vocab: false,
    dispo: (pack) =>
      (pack.grammar || []).some((g) =>
        (g.exercices || []).some((e) => e.type === "trous"),
      ),
  },

  // Contenu codé en dur dans le module : ne dépendent que de pack.language.
  conjugaison: {
    mod: conjugaison,
    cat: "scolaire",
    vocab: false,
    interlude: true,
  },
  accord: { mod: accord, cat: "scolaire", vocab: false, interlude: true },
  syntaxe: { mod: syntaxe, cat: "scolaire", vocab: false, interlude: true },
  preposition: {
    mod: preposition,
    cat: "scolaire",
    vocab: false,
    interlude: true,
  },
  irregular: { mod: irregular, cat: "scolaire", vocab: false, interlude: true },
  oreille: { mod: oreille, cat: "ludique", vocab: false, interlude: true },
};

// Ids des jeux utilisables en parcours avec ce cours.
export function jeuxDisponibles(pack) {
  return Object.keys(CATALOGUE).filter((id) => {
    const e = CATALOGUE[id];
    if (e.enParcours === false) return false;
    return e.dispo ? e.dispo(pack) : true;
  });
}

// Répartit une liste d'ids par catégorie.
export function parCategorie(ids) {
  const pools = { ludique: [], scolaire: [] };
  for (const id of ids) pools[CATALOGUE[id].cat].push(id);
  return pools;
}
