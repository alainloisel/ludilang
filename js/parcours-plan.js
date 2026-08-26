// Planification du mode Parcours : découpage en unités et construction des
// files d'étapes. Fonctions pures — pas de DOM, pas de localStorage.

import {
  CATALOGUE,
  jeuxDisponibles,
  parCategorie,
} from "./parcours-catalogue.js";
import { shuffle } from "./utils.js";

export const LONGUEUR_SESSION = 7;
export const TAILLE_UNITE = 10;

// Une étape : { gameId, requeued, vocabIds }
// `vocabIds` reste null à la planification ; le moteur l'épingle au rejeu.
function etape(gameId) {
  return { gameId, requeued: false, vocabIds: null };
}

// ---------------- Choix des jeux ----------------

// Tire une file d'étapes en alternant ludique/scolaire, sans remise :
// un même jeu n'apparaît jamais deux fois dans la session.
export function tirerFile(pack, longueur = LONGUEUR_SESSION) {
  const pools = parCategorie(jeuxDisponibles(pack));
  const restant = {
    ludique: shuffle(pools.ludique),
    scolaire: shuffle(pools.scolaire),
  };
  // On démarre par un jeu ludique : la première étape doit donner envie.
  let cat = restant.ludique.length ? "ludique" : "scolaire";
  const file = [];

  while (file.length < longueur) {
    const autre = cat === "ludique" ? "scolaire" : "ludique";
    const source = restant[cat].length ? cat : autre;
    if (!restant[source].length) break; // plus rien à proposer
    file.push(etape(restant[source].shift()));
    cat = source === "ludique" ? "scolaire" : "ludique";
  }
  return file;
}

// Un jeu de remplacement, hors de ceux déjà utilisés ou écartés.
export function choisirRemplacant(pack, exclure, categorie = null) {
  const candidats = jeuxDisponibles(pack).filter((id) => !exclure.has(id));
  if (!candidats.length) return null;
  const memeCat = candidats.filter((id) => CATALOGUE[id].cat === categorie);
  return shuffle(memeCat.length ? memeCat : candidats)[0];
}

// ---------------- Les trois structures ----------------

// (a) Leçon rapide : une file fixe sur tout le vocabulaire du cours.
export function planSession(pack, longueur = LONGUEUR_SESSION) {
  return tirerFile(pack, longueur);
}

// (b) Unité : même file, mais le moteur bornera le vocabulaire à l'unité.
export function planUnite(pack, longueur = LONGUEUR_SESSION) {
  return tirerFile(pack, longueur);
}

// (c) Entraînement libre : une étape à la fois, en évitant de répéter les
// derniers jeux joués et en continuant d'alterner les catégories.
export function etapeSuivante(pack, historique = []) {
  const dispo = jeuxDisponibles(pack);
  const recents = new Set(historique.slice(-4));
  const derniere = historique.length
    ? CATALOGUE[historique[historique.length - 1]].cat
    : null;

  let candidats = dispo.filter((id) => !recents.has(id));
  if (!candidats.length) candidats = dispo;

  const alternes = candidats.filter((id) => CATALOGUE[id].cat !== derniere);
  return etape(shuffle(alternes.length ? alternes : candidats)[0]);
}

// ---------------- Unités ----------------

// Regroupe le vocabulaire en unités d'environ `cible` mots, en suivant l'ordre
// du pack et en fusionnant les thèmes consécutifs trop petits.
export function computeUnites(pack, cible = TAILLE_UNITE) {
  const vocab = pack.vocab || [];
  if (!vocab.length) return [];

  if (vocab.every((v) => !v.theme)) {
    // Pas de thème du tout : paquets de taille fixe.
    const unites = [];
    for (let i = 0; i < vocab.length; i += cible) {
      unites.push({
        id: `bloc-${unites.length}`,
        titre: `Unité ${unites.length + 1}`,
        vocabIds: vocab.slice(i, i + cible).map((v) => v.id),
      });
    }
    return unites;
  }

  // Thèmes dans l'ordre d'apparition ; les mots sans thème sont mis de côté.
  const ordreThemes = [];
  const parTheme = new Map();
  const sansTheme = [];
  for (const v of vocab) {
    if (!v.theme) {
      sansTheme.push(v);
      continue;
    }
    if (!parTheme.has(v.theme)) {
      parTheme.set(v.theme, []);
      ordreThemes.push(v.theme);
    }
    parTheme.get(v.theme).push(v);
  }

  // Accumulation gloutonne jusqu'à ~cible mots.
  const unites = [];
  let titres = [];
  let mots = [];
  const clore = () => {
    if (!mots.length) return;
    unites.push({
      id: titres.join(" · "),
      titre: titres.join(" · "),
      vocabIds: mots.map((v) => v.id),
    });
    titres = [];
    mots = [];
  };
  const plafond = Math.round(cible * 1.3);
  for (const theme of ordreThemes) {
    const groupe = parTheme.get(theme);
    // On clôt avant d'ajouter si le thème ferait déborder : sinon un thème de 9
    // ajouté à une unité de 9 donnerait une unité de 18 pour une cible de 10.
    if (mots.length && mots.length + groupe.length > plafond) clore();
    titres.push(theme);
    mots.push(...groupe);
    if (mots.length >= cible) clore();
  }
  clore();

  if (sansTheme.length) {
    unites.push({
      id: "autres",
      titre: "Autres mots",
      vocabIds: sansTheme.map((v) => v.id),
    });
  }

  // Une dernière unité résiduelle (thème de fin, ou poignée de mots sans thème)
  // est repliée sur la précédente plutôt que de rester un moignon.
  const derniere = unites[unites.length - 1];
  if (unites.length > 1 && derniere.vocabIds.length < cible / 2) {
    const avant = unites[unites.length - 2];
    avant.vocabIds.push(...derniere.vocabIds);
    avant.titre += " · " + derniere.titre;
    unites.pop();
  }
  return unites;
}
