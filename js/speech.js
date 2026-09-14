// Synthèse vocale (écouter) et reconnaissance vocale (parler),
// via les API natives du navigateur — gratuit et sans serveur.

import { similarity } from "./utils.js";

const LANGUES = { en: "en-GB", de: "de-DE", zh: "zh-CN" };

let voix = [];
function chargerVoix() {
  if (window.speechSynthesis && (!voix || voix.length === 0)) {
    voix = speechSynthesis.getVoices() || [];
  }
}
if (window.speechSynthesis) {
  chargerVoix();
  speechSynthesis.onvoiceschanged = () => {
    voix = speechSynthesis.getVoices() || [];
  };
}

// Sans `langue`, vérifie juste que l'API existe. Avec `langue`, vérifie en
// plus qu'une voix pour cette langue est bien installée sur l'appareil.
export function ttsDisponible(langue) {
  if (!window.speechSynthesis) return false;
  return langue ? voixDisponible(langue) : true;
}

function candidatsVoix(langCode) {
  chargerVoix();
  if (!voix || !voix.length) return [];
  const lc = langCode.toLowerCase().replace("_", "-");
  const langGroup = lc.slice(0, 2);
  const exacte = voix.filter(
    (v) => v.lang.toLowerCase().replace("_", "-") === lc,
  );
  if (exacte.length) return exacte;
  return voix.filter((v) =>
    v.lang.toLowerCase().replace("_", "-").startsWith(langGroup),
  );
}

function meilleureVoix(langCode) {
  const candidates = candidatsVoix(langCode);
  if (!candidates.length) return null;
  // Les voix « naturelles / en ligne » sonnent mieux quand elles existent.
  return (
    candidates.find((v) => /natural|online/i.test(v.name)) ||
    candidates.find((v) => !v.localService) ||
    candidates[0]
  );
}

// Une voix existe-t-elle pour cette langue sur cet appareil ?
export function voixDisponible(langue) {
  return candidatsVoix(LANGUES[langue] || langue).length > 0;
}

// Prononce un texte dans la langue du pack ("en" ou "de").
// Si aucune voix ne correspond à cette langue sur l'appareil, le navigateur
// substituerait silencieusement sa voix par défaut (souvent le français sur
// une machine sans voix allemande installée) : mieux vaut se taire que de
// prononcer un mot allemand avec un accent français trompeur pour l'élève.
export function parler(texte, langue, debit = 0.9) {
  if (!window.speechSynthesis) return;
  const code = LANGUES[langue] || langue;
  const v = meilleureVoix(code);
  if (!v) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(texte);
  u.lang = code;
  u.voice = v;
  u.rate = debit;
  speechSynthesis.speak(u);
}

const Reco = window.SpeechRecognition || window.webkitSpeechRecognition;

export function microDisponible() {
  return !!Reco;
}

// Écoute une phrase au micro et renvoie la transcription.
// Rejette avec un code d'erreur lisible si ça échoue.
export function ecouter(langue) {
  return new Promise((resolve, reject) => {
    if (!Reco) return reject(new Error("non-supporte"));
    const r = new Reco();
    r.lang = LANGUES[langue] || langue;
    r.interimResults = false;
    r.maxAlternatives = 3;
    let obtenu = false;
    r.onresult = (e) => {
      obtenu = true;
      const alternatives = Array.from(e.results[0]).map((a) => a.transcript);
      resolve(alternatives);
    };
    r.onerror = (e) => reject(new Error(e.error || "erreur"));
    r.onend = () => {
      if (!obtenu) reject(new Error("rien-entendu"));
    };
    try {
      r.start();
    } catch (e) {
      reject(e);
    }
  });
}

// Score de prononciation 0..100 : meilleure similarité entre la cible
// et les alternatives entendues.
export function scorePrononciation(cible, alternatives) {
  let best = 0;
  for (const alt of alternatives) best = Math.max(best, similarity(cible, alt));
  return Math.round(best * 100);
}
