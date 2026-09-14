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
import { ttsDisponible, microDisponible } from "./speech.js";

// Écriture du cours. Doit rester d'accord avec la table ECRITURE de
// script/lexique2pack.py, qui s'en sert pour ses contrôles.
const ECRITURE = { zh: "han" }; // défaut : "latin"

function estLatin(pack) {
  return (ECRITURE[pack.language] || "latin") === "latin";
}

// cat        : "ludique" | "scolaire" — sert à alterner les étapes.
// vocab      : true si le jeu puise dans pack.vocab (on peut alors lui passer un
//              pack virtuel réduit aux mots à réviser).
// interlude  : jeu à contenu codé en dur (ignore pack.vocab) ; bon pour la
//              variété, mais ne fait pas progresser le vocabulaire d'une unité.
// enParcours : false pour exclure le jeu des séquences automatiques.
// langues    : liste blanche — le jeu a son contenu codé en dur pour ces langues
//              seulement, ailleurs il enseignerait la mauvaise langue.
// alphabet   : "latin" — le jeu affiche une grille de lettres A-Z.
// saisie     : "cible" — le jeu demande d'écrire dans la langue étudiée, ce qui
//              suppose un clavier capable de la taper.
// dispo      : prédicat optionnel ; sans lui le jeu est toujours proposable.
export const CATALOGUE = {
  flashcards: { mod: flashcards, cat: "scolaire", vocab: true },
  quiz: { mod: quiz, cat: "scolaire", vocab: true },
  memory: { mod: memory, cat: "ludique", vocab: true },
  course: { mod: course, cat: "ludique", vocab: true },
  intrus: { mod: intrus, cat: "ludique", vocab: true },

  // La grille de lettres de pendu.js:20 est un A-Z : hors alphabet latin, aucune
  // lettre n'est devinable et le mot est impossible à trouver.
  pendu: { mod: pendu, cat: "ludique", vocab: true, alphabet: "latin" },

  // Ces trois-là font écrire dans la langue étudiée : infaisable au clavier
  // français dès que l'écriture n'est pas latine.
  marathon: { mod: marathon, cat: "ludique", vocab: true, saisie: "cible" },
  detective: { mod: detective, cat: "scolaire", vocab: true, saisie: "cible" },

  // Dictée : saisie ET synthèse vocale. Son garde-fou interne rend un écran sans
  // jamais appeler finPartie (dictee.js:17-26), ce qui figerait une séquence de
  // parcours (parcours.js:124-134) — d'où le dispo(), qui l'écarte en amont.
  dictee: {
    mod: dictee,
    cat: "scolaire",
    vocab: true,
    saisie: "cible",
    dispo: (pack) => ttsDisponible(pack.language),
  },

  // Perroquet : même piège de garde-fou, côté micro.
  perroquet: {
    mod: perroquet,
    cat: "ludique",
    vocab: true,
    dispo: () => microDisponible(),
  },

  // Conversation ouverte : pas de score exploitable dans une séquence notée.
  dialogue: {
    mod: dialogue,
    cat: "ludique",
    vocab: true,
    enParcours: false,
    langues: ["en", "de"],
  },

  // Pas de dispo() ici : il faudrait recopier collecter() de ordre.js, qui
  // finirait par diverger. Avec un pool vide le module appelle aussitôt
  // finPartie({reponses: 0}) — le moteur remplace l'étape à la volée.
  ordre: { mod: ordre, cat: "scolaire", vocab: true },

  trous: {
    mod: trous,
    cat: "scolaire",
    vocab: false,
    saisie: "cible",
    dispo: (pack) =>
      (pack.grammar || []).some((g) =>
        (g.exercices || []).some((e) => e.type === "trous"),
      ),
  },

  // Contenu codé en dur dans le module (`pack.language === "de" ? "de" : "en"`) :
  // sur un cours d'une autre langue, ils enseigneraient de l'anglais.
  conjugaison: {
    mod: conjugaison,
    cat: "scolaire",
    vocab: false,
    interlude: true,
    langues: ["en", "de"],
  },
  accord: {
    mod: accord,
    cat: "scolaire",
    vocab: false,
    interlude: true,
    langues: ["en", "de"],
  },
  syntaxe: {
    mod: syntaxe,
    cat: "scolaire",
    vocab: false,
    interlude: true,
    langues: ["en", "de"],
  },
  preposition: {
    mod: preposition,
    cat: "scolaire",
    vocab: false,
    interlude: true,
    langues: ["en", "de"],
  },
  irregular: {
    mod: irregular,
    cat: "scolaire",
    vocab: false,
    interlude: true,
    langues: ["en", "de"],
  },
  oreille: {
    mod: oreille,
    cat: "ludique",
    vocab: false,
    interlude: true,
    langues: ["en", "de"],
  },
};

// Ids des jeux qui ont un sens avec la langue et l'écriture de ce cours.
// C'est ce que l'accueil propose en jeu libre : `dialogue` en fait partie,
// contrairement à jeuxDisponibles().
export function jeuxCompatibles(pack) {
  return Object.keys(CATALOGUE).filter((id) => {
    const e = CATALOGUE[id];
    if (e.langues && !e.langues.includes(pack.language)) return false;
    if (e.alphabet === "latin" && !estLatin(pack)) return false;
    if (e.saisie === "cible" && !estLatin(pack)) return false;
    return true;
  });
}

// Ids des jeux utilisables en parcours avec ce cours : les compatibles, moins
// ceux qu'on exclut des séquences et ceux dont le contenu manque.
export function jeuxDisponibles(pack) {
  return jeuxCompatibles(pack).filter((id) => {
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
