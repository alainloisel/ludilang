// XP, niveaux, badges et série quotidienne (streak).

import { getPlayer, savePlayer } from "./store.js";
import { today, daysBetween } from "./utils.js";

export const NIVEAUX = [
  { xp: 0, titre: "Débutant curieux", emoji: "🐣" },
  { xp: 100, titre: "Apprenti des mots", emoji: "📖" },
  { xp: 300, titre: "Explorateur des langues", emoji: "🧭" },
  { xp: 600, titre: "Aventurier bilingue", emoji: "🗺️" },
  { xp: 1000, titre: "Polyglotte en herbe", emoji: "🌱" },
  { xp: 1600, titre: "Champion des langues", emoji: "🏆" },
  { xp: 2500, titre: "Maître des mots", emoji: "🧙" },
  { xp: 4000, titre: "Légende du collège", emoji: "👑" },
];

export const BADGES = [
  {
    id: "premiere-partie",
    nom: "Premiers pas",
    emoji: "👟",
    desc: "Jouer sa première partie",
  },
  {
    id: "streak-3",
    nom: "3 jours d'affilée",
    emoji: "🔥",
    desc: "Réviser 3 jours de suite",
  },
  {
    id: "streak-7",
    nom: "Semaine en feu",
    emoji: "🚒",
    desc: "Réviser 7 jours de suite",
  },
  {
    id: "bonnes-50",
    nom: "50 bonnes réponses",
    emoji: "✅",
    desc: "Donner 50 bonnes réponses",
  },
  {
    id: "bonnes-200",
    nom: "200 bonnes réponses",
    emoji: "💯",
    desc: "Donner 200 bonnes réponses",
  },
  {
    id: "quiz-parfait",
    nom: "Quiz parfait",
    emoji: "🎯",
    desc: "Réussir un quiz sans aucune erreur",
  },
  {
    id: "perroquet-90",
    nom: "Accent en or",
    emoji: "🦜",
    desc: "Obtenir 90+ au Perroquet",
  },
  {
    id: "touche-a-tout",
    nom: "Touche-à-tout",
    emoji: "🎪",
    desc: "Essayer 8 jeux différents",
  },
  { id: "xp-500", nom: "500 XP", emoji: "⭐", desc: "Atteindre 500 XP" },
  { id: "xp-2000", nom: "2000 XP", emoji: "🌟", desc: "Atteindre 2000 XP" },
];

export function niveauActuel(xp) {
  let n = NIVEAUX[0],
    suivant = null;
  for (let i = 0; i < NIVEAUX.length; i++) {
    if (xp >= NIVEAUX[i].xp) {
      n = NIVEAUX[i];
      suivant = NIVEAUX[i + 1] || null;
    }
  }
  return { ...n, index: NIVEAUX.indexOf(n) + 1, suivant };
}

// Met à jour la série quotidienne (appelé au lancement d'une partie).
function majStreak(player) {
  const t = today();
  const s = player.streak;
  if (s.last === t) return;
  if (s.last && daysBetween(s.last, t) === 1) s.count += 1;
  else s.count = 1;
  s.last = t;
}

// Vérifie tous les badges ; renvoie ceux qui viennent d'être gagnés.
function verifierBadges(player, motsMaitrisesTotal = 0) {
  const gagnes = [];
  const a = (id) => player.badges.includes(id);
  const donne = (id) => {
    if (!a(id)) {
      player.badges.push(id);
      gagnes.push(BADGES.find((b) => b.id === id));
    }
  };
  const st = player.stats;
  if (st.parties >= 1) donne("premiere-partie");
  if (player.streak.count >= 3) donne("streak-3");
  if (player.streak.count >= 7) donne("streak-7");
  if (st.bonnes >= 50) donne("bonnes-50");
  if (st.bonnes >= 200) donne("bonnes-200");
  if (st.quizParfaits >= 1) donne("quiz-parfait");
  if (st.perroquetTop >= 90) donne("perroquet-90");
  if (Object.keys(st.jeux).length >= 8) donne("touche-a-tout");
  if (player.xp >= 500) donne("xp-500");
  if (player.xp >= 2000) donne("xp-2000");
  return gagnes;
}

// Enregistre le résultat d'une partie et renvoie ce qui a changé
// (XP gagnée, nouveaux badges, passage de niveau) pour l'affichage.
export function enregistrerPartie({
  langue,
  jeu,
  xp,
  bonnes = 0,
  reponses = 0,
  quizParfait = false,
  scorePerroquet = 0,
}) {
  const player = getPlayer(langue);
  const niveauAvant = niveauActuel(player.xp).index;
  majStreak(player);
  player.xp += xp;
  player.stats.parties += 1;
  player.stats.bonnes += bonnes;
  player.stats.reponses += reponses;
  player.stats.jeux[jeu] = (player.stats.jeux[jeu] || 0) + 1;
  if (quizParfait) player.stats.quizParfaits += 1;
  if (scorePerroquet > player.stats.perroquetTop)
    player.stats.perroquetTop = scorePerroquet;
  const nouveauxBadges = verifierBadges(player);
  const niveauApres = niveauActuel(player.xp).index;
  savePlayer(langue, player);
  return { player, nouveauxBadges, niveauMonte: niveauApres > niveauAvant };
}
