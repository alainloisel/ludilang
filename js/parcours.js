// Mode Parcours : enchaîne automatiquement des étapes (un jeu = une étape) en
// alternant ludique et scolaire, avec le vocabulaire choisi par le SRS.
//
// Les 19 jeux sont réutilisés tels quels : on leur passe un « pack virtuel »
// dont le vocabulaire est réduit aux mots à réviser, et un finPartie qui fait
// avancer la séquence au lieu d'afficher l'écran de résultat du mode libre.

import { CATALOGUE } from "./parcours-catalogue.js";
import {
  planSession,
  planUnite,
  etapeSuivante,
  choisirRemplacant,
  LONGUEUR_SESSION,
} from "./parcours-plan.js";
import { cartesDues } from "./srs.js";
import { enregistrerPartie, niveauActuel } from "./gamification.js";
import { sample, esc } from "./utils.js";

// Plancher de vocabulaire : quiz.js échantillonne 8 mots et tire 3 distracteurs
// dans le reste. En dessous, les jeux à choix multiples s'appauvrissent.
const MIN_VOCAB = 8;
const TAILLE_LOT = 10;
const SEUIL_REJEU = 0.6;

let S = null; // état de la session en cours

export function lancerParcours(ecran, opts) {
  const { pack, mode, unite = null, reprise = null } = opts;
  S = {
    ecran,
    ...opts,
    unite,
    file:
      reprise?.file ||
      (mode === "libre"
        ? [etapeSuivante(pack, [])]
        : mode === "unite"
          ? planUnite(pack)
          : planSession(pack)),
    idx: reprise?.idx || 0,
    historique: reprise?.historique || [],
    ecartes: new Set(),
    xp: reprise?.xp || 0,
    bonnes: reprise?.bonnes || 0,
    reponses: reprise?.reponses || 0,
    badges: [],
    niveauMonte: false,
  };
  if (!S.file.length) {
    bilan(false);
    return;
  }
  lancerEtape();
}

// Instantané de la session, pour reprendre après un rechargement de page.
// Granularité : l'étape en cours redémarre à son début (les jeux gardent leur
// état interne dans des closures, sans point de sérialisation).
function sauver() {
  S.onSauver?.({
    mode: S.mode,
    uniteId: S.unite?.id || null,
    file: S.file,
    idx: S.idx,
    historique: S.historique,
    xp: S.xp,
    bonnes: S.bonnes,
    reponses: S.reponses,
  });
}

// ---------------- Vocabulaire d'une étape ----------------

// Sélection pilotée par le SRS, complétée si besoin pour tenir le plancher.
function sousEnsemble(vocabIds) {
  const { pack, progress } = S;
  const pool = vocabIds
    ? pack.vocab.filter((v) => vocabIds.includes(v.id))
    : pack.vocab;

  let sel = cartesDues(pool, progress, TAILLE_LOT);
  sel = completer(sel, pool);
  if (sel.length < MIN_VOCAB) sel = completer(sel, pack.vocab);
  return sel;
}

function completer(sel, source) {
  if (sel.length >= MIN_VOCAB) return sel;
  const dedans = new Set(sel.map((v) => v.id));
  const reste = source.filter((v) => !dedans.has(v.id));
  return sel.concat(sample(reste, MIN_VOCAB - sel.length));
}

// ---------------- Déroulement ----------------

function lancerEtape() {
  window.speechSynthesis?.cancel();
  const etape = S.file[S.idx];
  const entree = CATALOGUE[etape.gameId];
  const jeu = entree.mod;

  // Pack virtuel : même objet que le pack réel, mais vocabulaire ciblé.
  let packEtape = S.pack;
  if (entree.vocab) {
    const sel = sousEnsemble(etape.vocabIds || S.unite?.vocabIds);
    etape.vocabIdsJoues = sel.map((v) => v.id); // épinglé pour un éventuel rejeu
    packEtape = { ...S.pack, vocab: sel };
  }

  S.ecran.innerHTML = `
    <div class="entete-jeu">
      <button class="btn btn-ghost" id="quitter">← Quitter</button>
      <h1 class="titre-jeu">${jeu.meta.emoji} ${esc(jeu.meta.nom)}</h1>
    </div>
    ${frise()}
    <div id="zone-jeu"></div>`;
  sauver();
  S.ecran.querySelector("#quitter").onclick = () => {
    window.speechSynthesis?.cancel();
    S.reponses ? bilan(false) : (S.onSauver?.(null), S.retourAccueil());
  };

  let termine = false; // certains jeux ont des minuteurs : on garde le premier appel
  jeu.start(S.ecran.querySelector("#zone-jeu"), {
    pack: packEtape,
    progress: S.progress,
    saveProgress: () => S.saveProgress(), // toujours sur l'id du pack réel
    finPartie: (o) => {
      if (termine) return;
      termine = true;
      etapeTerminee(etape, o || {});
    },
  });
}

function etapeTerminee(etape, { xp = 0, bonnes = 0, reponses = 0, ...reste }) {
  // Étape sans aucune question : le jeu n'avait pas de contenu exploitable
  // dans ce cours. On la remplace pour ne pas raccourcir la session.
  if (reponses === 0) {
    S.ecartes.add(etape.gameId);
    const remplacant = choisirRemplacant(
      S.pack,
      new Set([...S.ecartes, ...S.file.map((e) => e.gameId)]),
      CATALOGUE[etape.gameId].cat,
    );
    if (remplacant) {
      S.file.splice(S.idx + 1, 0, {
        gameId: remplacant,
        requeued: false,
        vocabIds: null,
      });
    }
    S.file.splice(S.idx, 1); // l'étape vide ne compte pas dans la frise
    if (S.idx >= S.file.length) return bilan(true);
    return lancerEtape();
  }

  const res = enregistrerPartie({
    langue: S.pack.language,
    jeu: etape.gameId,
    xp,
    bonnes,
    reponses,
    ...reste,
  });
  S.xp += xp;
  S.bonnes += bonnes;
  S.reponses += reponses;
  S.badges.push(...res.nouveauxBadges);
  if (res.niveauMonte) S.niveauMonte = true;
  S.historique.push(etape.gameId);
  S.majHud();

  const taux = bonnes / reponses;
  // Étape ratée : on la remet en fin de file, avec les mêmes mots.
  if (
    taux < SEUIL_REJEU &&
    !etape.requeued &&
    S.file.length < 2 * LONGUEUR_SESSION
  ) {
    S.file.push({
      gameId: etape.gameId,
      requeued: true,
      vocabIds: etape.vocabIdsJoues,
    });
  }
  transition(taux, xp);
}

function avancer() {
  S.idx++;
  if (S.mode === "libre") {
    S.file.push(etapeSuivante(S.pack, S.historique));
  }
  if (S.idx >= S.file.length) return bilan(true);
  lancerEtape();
}

// ---------------- Écrans ----------------

function frise() {
  if (S.mode === "libre") {
    return `<p class="parcours-compteur">Étape ${S.idx + 1}</p>`;
  }
  const pastilles = S.file
    .map((_, i) => {
      const etat = i < S.idx ? "faite" : i === S.idx ? "active" : "";
      return `<span class="pastille ${etat}"></span>`;
    })
    .join("");
  return `<div class="parcours-frise">
    ${pastilles}
    <span class="parcours-compteur">${S.idx + 1}/${S.file.length}</span>
  </div>`;
}

function transition(taux, xp) {
  const suivante = S.file[S.idx + 1];
  const dernier = !suivante && S.mode !== "libre";
  const emoji = taux >= 0.9 ? "🏆" : taux >= 0.6 ? "🎉" : "💪";
  const mot =
    taux >= 0.9 ? "Sans faute !" : taux >= 0.6 ? "Bien joué !" : "Continue !";

  S.ecran.innerHTML = `
    <div class="resultat centre">
      <p class="gros-emoji">${emoji}</p>
      <h2>${mot}</h2>
      <p class="resultat-xp">+${xp} XP</p>
      ${
        suivante
          ? `<p class="parcours-suivant">Ensuite : ${CATALOGUE[suivante.gameId].mod.meta.emoji}
             <strong>${esc(CATALOGUE[suivante.gameId].mod.meta.nom)}</strong></p>`
          : ""
      }
      ${frise()}
      <div class="carte-boutons">
        <button class="btn btn-primary" id="continuer">
          ${dernier ? "🏁 Voir le bilan" : "Continuer →"}
        </button>
        ${S.mode === "libre" ? `<button class="btn" id="arreter">⏹ Arrêter</button>` : ""}
      </div>
    </div>`;
  S.ecran.querySelector("#continuer").onclick = avancer;
  const stop = S.ecran.querySelector("#arreter");
  if (stop) stop.onclick = () => bilan(true);
}

// `complete` : la file a été jouée jusqu'au bout (et non interrompue par
// « Quitter »). Seule une unité menée à son terme débloque la suivante.
function bilan(complete) {
  window.speechSynthesis?.cancel();
  S.onSauver?.(null); // la session n'est plus en cours
  if (complete && S.mode === "unite" && S.unite)
    S.onUniteTerminee?.(S.unite.id);

  const taux = S.reponses ? S.bonnes / S.reponses : 0;
  const emoji =
    taux >= 0.9 ? "🏆" : taux >= 0.6 ? "🎉" : taux >= 0.3 ? "💪" : "🌱";
  const titre = S.unite ? esc(S.unite.titre) : "Session terminée";

  S.ecran.innerHTML = `
    <div class="resultat centre">
      <p class="gros-emoji">${emoji}</p>
      <h2>${titre}</h2>
      <p class="resultat-message">
        ${S.bonnes} bonne${S.bonnes > 1 ? "s" : ""} réponse${S.bonnes > 1 ? "s" : ""}
        sur ${S.reponses} · ${S.historique.length} exercice${S.historique.length > 1 ? "s" : ""}
      </p>
      <p class="resultat-xp">+${S.xp} XP</p>
      ${
        S.niveauMonte
          ? `<p class="feedback ok">🚀 NIVEAU SUPÉRIEUR ! Tu es maintenant
             « ${esc(niveauActuel(S.getPlayerXp()).titre)} »</p>`
          : ""
      }
      ${S.badges
        .map(
          (b) =>
            `<p class="toast-badge">${b.emoji} Nouveau badge :
             <strong>${esc(b.nom)}</strong></p>`,
        )
        .join("")}
      <div class="carte-boutons">
        <button class="btn btn-primary" id="encore">🔁 Une autre session</button>
        <button class="btn" id="menu">🏠 Menu</button>
      </div>
    </div>`;
  const relancer = {
    pack: S.pack,
    progress: S.progress,
    saveProgress: S.saveProgress,
    majHud: S.majHud,
    retourAccueil: S.retourAccueil,
    getPlayerXp: S.getPlayerXp,
    onUniteTerminee: S.onUniteTerminee,
    onSauver: S.onSauver,
    mode: S.mode,
    unite: S.unite,
  };
  S.ecran.querySelector("#encore").onclick = () =>
    lancerParcours(S.ecran, relancer);
  S.ecran.querySelector("#menu").onclick = S.retourAccueil;
}
