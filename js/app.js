// AloLangues — point d'entrée : navigation, accueil, HUD, fin de partie.

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

import {
  loadAllPacks,
  getPlayer,
  getProgress,
  saveProgress,
  getCurrentPackId,
  setCurrentPackId,
  deleteImportedPack,
} from "./store.js";
import { niveauActuel, enregistrerPartie, BADGES } from "./gamification.js";
import { motsMaitrises } from "./srs.js";
import { esc } from "./utils.js";
import { ecranImport } from "./import.js";

const JEUX = [
  flashcards,
  quiz,
  memory,
  pendu,
  ordre,
  trous,
  dictee,
  perroquet,
  intrus,
  course,
  dialogue,
  detective,
  conjugaison,
  accord,
  syntaxe,
  preposition,
  irregular,
  marathon,
  oreille,
];
const DRAPEAUX = { en: "🇬🇧", de: "🇩🇪" };

const ecran = document.getElementById("ecran");
const hud = document.getElementById("hud");
const btnHome = document.getElementById("btn-home");

let packs = [];
let pack = null;

btnHome.onclick = () => accueil();

init();

async function init() {
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  packs = await loadAllPacks();
  const voulu = getCurrentPackId();
  pack = packs.find((p) => p.id === voulu) || packs[0] || null;
  accueil();
}

function majHud() {
  const player = getPlayer(pack?.language);
  const niveau = niveauActuel(player.xp);
  const versSuivant = niveau.suivant
    ? Math.round(
        ((player.xp - niveau.xp) / (niveau.suivant.xp - niveau.xp)) * 100,
      )
    : 100;
  hud.innerHTML = `
    <span class="hud-niveau" title="${esc(niveau.titre)}">${niveau.emoji} Niv. ${niveau.index}</span>
    <span class="hud-xp">
      <span class="hud-xp-barre"><span style="width:${versSuivant}%"></span></span>
      ${player.xp} XP
    </span>
    <span class="hud-streak" title="Jours de révision d'affilée">🔥 ${player.streak.count}</span>`;
}

// ---------------- Accueil ----------------

function accueil() {
  window.speechSynthesis?.cancel();
  majHud();
  const player = getPlayer(pack?.language);
  const niveau = niveauActuel(player.xp);

  if (!pack) {
    ecran.innerHTML = `<div class="centre"><p class="gros-emoji">📭</p>
      <h2>Aucun cours chargé</h2>
      <p>Importe un premier cours pour commencer.</p>
      <button class="btn btn-primary" id="aller-import">📥 Importer un cours</button></div>`;
    ecran.querySelector("#aller-import").onclick = () => importer();
    return;
  }

  const progress = getProgress(pack.id);
  const maitrises = motsMaitrises(progress);

  ecran.innerHTML = `
    <section class="accueil">
      <div class="titre-niveau">${niveau.emoji} <strong>${esc(niveau.titre)}</strong></div>

      <div class="selecteur-pack">
        <label for="choix-pack">Mon cours :</label>
        <select id="choix-pack">
          ${packs
            .map(
              (
                p,
              ) => `<option value="${esc(p.id)}" ${p.id === pack.id ? "selected" : ""}>
            ${DRAPEAUX[p.language] || "🌍"} ${esc(p.title)}</option>`,
            )
            .join("")}
        </select>
      </div>

      <div class="stats-ligne">
        <div class="stat"><strong>${maitrises}</strong><span>mots maîtrisés</span></div>
        <div class="stat"><strong>${pack.vocab.length}</strong><span>mots au total</span></div>
        <div class="stat"><strong>${player.badges.length}</strong><span>badges</span></div>
      </div>

      <div class="grille-jeux">
        ${JEUX.map(
          (j) => `
          <button class="carte-jeu" data-jeu="${j.meta.id}">
            <span class="jeu-emoji">${j.meta.emoji}</span>
            <span class="jeu-nom">${esc(j.meta.nom)}</span>
            <span class="jeu-desc">${esc(j.meta.desc)}</span>
          </button>`,
        ).join("")}
      </div>

      <div class="carte-boutons pied-accueil">
        <button class="btn btn-ghost" id="voir-badges">🏅 Mes badges</button>
        <button class="btn btn-ghost" id="aller-import">📥 Importer un cours</button>
      </div>
    </section>`;

  ecran.querySelector("#choix-pack").onchange = (e) => {
    pack = packs.find((p) => p.id === e.target.value);
    setCurrentPackId(pack.id);
    accueil();
  };
  ecran.querySelectorAll(".carte-jeu").forEach((b) => {
    b.onclick = () => lancerJeu(JEUX.find((j) => j.meta.id === b.dataset.jeu));
  });
  ecran.querySelector("#voir-badges").onclick = ecranBadges;
  ecran.querySelector("#aller-import").onclick = importer;
}

// ---------------- Lancement d'un jeu ----------------

function lancerJeu(jeu) {
  window.speechSynthesis?.cancel();
  const progress = getProgress(pack.id);
  ecran.innerHTML = `
    <div class="entete-jeu">
      <button class="btn btn-ghost" id="retour">← Menu</button>
      <h1 class="titre-jeu">${jeu.meta.emoji} ${esc(jeu.meta.nom)}</h1>
    </div>
    <div id="zone-jeu"></div>`;
  ecran.querySelector("#retour").onclick = accueil;
  const zone = ecran.querySelector("#zone-jeu");

  const ctx = {
    pack,
    progress,
    saveProgress: () => saveProgress(pack.id, progress),
    finPartie: (opts) => finPartie(jeu, opts),
  };
  jeu.start(zone, ctx);
}

function finPartie(
  jeu,
  {
    xp = 0,
    bonnes = 0,
    reponses = 0,
    quizParfait = false,
    scorePerroquet = 0,
    message = "",
  },
) {
  const res = enregistrerPartie({
    langue: pack.language,
    jeu: jeu.meta.id,
    xp,
    bonnes,
    reponses,
    quizParfait,
    scorePerroquet,
  });
  majHud();
  const taux = reponses ? bonnes / reponses : 1;
  const emoji =
    taux >= 0.9 ? "🏆" : taux >= 0.6 ? "🎉" : taux >= 0.3 ? "💪" : "🌱";
  const encouragement =
    taux >= 0.9
      ? "Extraordinaire !"
      : taux >= 0.6
        ? "Bien joué !"
        : taux >= 0.3
          ? "Tu progresses !"
          : "Chaque essai te fait progresser !";

  ecran.innerHTML = `
    <div class="resultat centre">
      <p class="gros-emoji">${emoji}</p>
      <h2>${encouragement}</h2>
      <p class="resultat-message">${esc(message)}</p>
      <p class="resultat-xp">+${xp} XP</p>
      ${res.niveauMonte ? `<p class="feedback ok">🚀 NIVEAU SUPÉRIEUR ! Tu es maintenant « ${esc(niveauActuel(res.player.xp).titre)} »</p>` : ""}
      ${res.nouveauxBadges.map((b) => `<p class="toast-badge">${b.emoji} Nouveau badge : <strong>${esc(b.nom)}</strong></p>`).join("")}
      <div class="carte-boutons">
        <button class="btn btn-primary" id="rejouer">🔁 Rejouer</button>
        <button class="btn" id="menu">🏠 Menu</button>
      </div>
    </div>`;
  ecran.querySelector("#rejouer").onclick = () => lancerJeu(jeu);
  ecran.querySelector("#menu").onclick = accueil;
}

// ---------------- Badges ----------------

function ecranBadges() {
  const player = getPlayer(pack?.language);
  ecran.innerHTML = `
    <div class="entete-jeu">
      <button class="btn btn-ghost" id="retour">← Menu</button>
      <h1 class="titre-jeu">🏅 Mes badges</h1>
    </div>
    <div class="badge-grille">
      ${BADGES.map((b) => {
        const gagne = player.badges.includes(b.id);
        return `<div class="badge ${gagne ? "" : "verrouille"}">
          <span class="badge-emoji">${gagne ? b.emoji : "🔒"}</span>
          <strong>${esc(b.nom)}</strong>
          <span>${esc(b.desc)}</span>
        </div>`;
      }).join("")}
    </div>`;
  ecran.querySelector("#retour").onclick = accueil;
}

// ---------------- Import ----------------

function importer() {
  ecran.innerHTML = `
    <div class="entete-jeu">
      <button class="btn btn-ghost" id="retour">← Menu</button>
      <h1 class="titre-jeu">📥 Importer un cours</h1>
    </div>
    <div id="zone-import"></div>`;
  ecran.querySelector("#retour").onclick = accueil;
  ecranImport(ecran.querySelector("#zone-import"), {
    packsImportes: packs.filter((p) => !p._builtin),
    onNouveauPack: async (nouveau) => {
      packs = packs.filter((p) => p.id !== nouveau.id);
      packs.push(nouveau);
      pack = nouveau;
      setCurrentPackId(nouveau.id);
      accueil();
    },
    onSupprimer: async (id) => {
      await deleteImportedPack(id);
      packs = packs.filter((p) => p.id !== id);
      if (pack?.id === id) pack = packs[0] || null;
      importer();
    },
  });
}
