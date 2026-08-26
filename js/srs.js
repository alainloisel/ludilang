// Répétition espacée : boîtes de Leitner.
// Chaque mot est dans une boîte 0..4 ; plus la boîte est haute, plus
// l'intervalle avant la prochaine révision est long.

import { today } from "./utils.js";

const INTERVALLES = [0, 1, 3, 7, 16]; // jours avant la prochaine révision
export const BOITE_MAX = 4;
export const BOITE_MAITRISE = 3; // à partir de là, le mot est « maîtrisé »

function addDays(iso, n) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Les cartes à réviser aujourd'hui : nouvelles d'abord limitées, puis
// celles dont la date de révision est atteinte.
export function cartesDues(vocab, progress, max = 12) {
  const t = today();
  const dues = [];
  const nouvelles = [];
  for (const v of vocab) {
    const s = progress.srs[v.id];
    if (!s) nouvelles.push(v);
    else if (s.due <= t) dues.push(v);
  }
  // Priorité aux révisions dues, complétées par des nouvelles cartes.
  return [...dues, ...nouvelles].slice(0, max);
}

// Enregistre une réponse : bonne → boîte suivante, mauvaise → boîte 0.
export function noter(progress, id, correcte) {
  const s = progress.srs[id] || { box: 0, due: today() };
  s.box = correcte ? Math.min(s.box + 1, BOITE_MAX) : 0;
  s.due = addDays(today(), INTERVALLES[s.box]);
  progress.srs[id] = s;
}

export function motsMaitrises(progress) {
  return Object.values(progress.srs).filter((s) => s.box >= BOITE_MAITRISE)
    .length;
}

// Répartition par boîte, pour l'écran de progression.
export function repartition(vocab, progress) {
  const rep = { nouveaux: 0, boites: [0, 0, 0, 0, 0] };
  for (const v of vocab) {
    const s = progress.srs[v.id];
    if (!s) rep.nouveaux++;
    else rep.boites[s.box]++;
  }
  return rep;
}
