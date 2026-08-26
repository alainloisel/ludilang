// Jeu : Le Défi des 3 Formes (Irregular Verbs)
// Réciter de vive voix les trois formes des verbes irréguliers (Base, Prétérit, Participe Passé)
// ex: "speak spoke spoken" ou "sprechen sprach gesprochen".

import { sample, esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "irregular",
  nom: "Défi des 3 Formes",
  emoji: "🗣️",
  desc: "Récite les 3 formes des verbes irréguliers à voix haute (ex: speak spoke spoken) !",
};

const VERBES = {
  en: [
    {
      base: "speak",
      preterit: "spoke",
      participe: "spoken",
      traduction: "parler",
    },
    { base: "go", preterit: "went", participe: "gone", traduction: "aller" },
    { base: "have", preterit: "had", participe: "had", traduction: "avoir" },
    { base: "be", preterit: "was", participe: "been", traduction: "être" },
    { base: "see", preterit: "saw", participe: "seen", traduction: "voir" },
    {
      base: "write",
      preterit: "wrote",
      participe: "written",
      traduction: "écrire",
    },
    { base: "make", preterit: "made", participe: "made", traduction: "faire" },
    { base: "do", preterit: "did", participe: "done", traduction: "faire" },
    {
      base: "take",
      preterit: "took",
      participe: "taken",
      traduction: "prendre",
    },
    { base: "come", preterit: "came", participe: "come", traduction: "venir" },
    {
      base: "give",
      preterit: "gave",
      participe: "given",
      traduction: "donner",
    },
    { base: "eat", preterit: "ate", participe: "eaten", traduction: "manger" },
    {
      base: "drink",
      preterit: "drank",
      participe: "drunk",
      traduction: "boire",
    },
    {
      base: "sing",
      preterit: "sang",
      participe: "sung",
      traduction: "chanter",
    },
    { base: "read", preterit: "read", participe: "read", traduction: "lire" },
    { base: "run", preterit: "ran", participe: "run", traduction: "courir" },
  ],
  de: [
    {
      base: "sprechen",
      preterit: "sprach",
      participe: "gesprochen",
      traduction: "parler",
    },
    {
      base: "gehen",
      preterit: "ging",
      participe: "gegangen",
      traduction: "aller",
    },
    {
      base: "haben",
      preterit: "hatte",
      participe: "gehabt",
      traduction: "avoir",
    },
    { base: "sein", preterit: "war", participe: "gewesen", traduction: "être" },
    {
      base: "sehen",
      preterit: "sah",
      participe: "gesehen",
      traduction: "voir",
    },
    {
      base: "schreiben",
      preterit: "schrieb",
      participe: "geschrieben",
      traduction: "écrire",
    },
    {
      base: "trinken",
      preterit: "trank",
      participe: "getrunken",
      traduction: "boire",
    },
    {
      base: "singen",
      preterit: "sang",
      participe: "gesungen",
      traduction: "chanter",
    },
    {
      base: "essen",
      preterit: "aß",
      participe: "gegessen",
      traduction: "manger",
    },
    {
      base: "kommen",
      preterit: "kam",
      participe: "gekommen",
      traduction: "venir",
    },
    {
      base: "geben",
      preterit: "gab",
      participe: "gegeben",
      traduction: "donner",
    },
    {
      base: "laufen",
      preterit: "lief",
      participe: "gelaufen",
      traduction: "courir",
    },
    {
      base: "lesen",
      preterit: "las",
      participe: "gelesen",
      traduction: "lire",
    },
    {
      base: "schlafen",
      preterit: "schlief",
      participe: "geschlafen",
      traduction: "dormir",
    },
  ],
};

const NB_VERBES = 5;

export function start(container, ctx) {
  if (!microDisponible()) {
    container.innerHTML = `<div class="centre"><p class="gros-emoji">🎙️</p>
      <h2>Micro non disponible</h2>
      <p>Ce jeu nécessite la reconnaissance vocale pour écouter vos conjugaisons. Utilisez Chrome ou Edge.</p></div>`;
    return;
  }

  const lang = ctx.pack.language === "de" ? "de" : "en";
  const pool = VERBES[lang];
  const items = sample(pool, Math.min(NB_VERBES, pool.length));
  let index = 0,
    bonnes = 0,
    xp = 0;

  function suivante() {
    if (index >= items.length) {
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: items.length,
        message: `${bonnes} verbe${bonnes > 1 ? "s" : ""} correctement récité${bonnes > 1 ? "s" : ""} sur ${items.length} !`,
      });
      return;
    }

    const v = items[index];
    const cible = `${v.base} ${v.preterit} ${v.participe}`;
    let repondu = false;

    function rendu(etat = "", detail = "") {
      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(index / items.length) * 100}%"></div></div>
          <span class="compteur">Verbe ${index + 1} / ${items.length}</span>
        </div>

        <p class="indice" style="text-align: center; font-size: 1.05rem;">
          💡 Traduction : <strong style="color: var(--jaune);">${esc(v.traduction)}</strong>
        </p>

        <div class="carte-flash" style="cursor: default; margin: 15px 0; height: 180px;">
          <div class="carte-face" style="position: relative; background: linear-gradient(160deg, var(--carte-claire), var(--carte)); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 8px; padding: 20px;">
            <span class="theme-chip" style="font-size: 0.8rem; margin-bottom: 2px;">${lang === "de" ? "Infinitiv" : "Infinitive"}</span>
            <h2 style="font-size: 2.2rem; font-weight: 800; color: var(--cyan);">${esc(v.base)}</h2>
            <p style="font-size: 0.85rem; color: var(--texte-2);">Récite les 3 formes (ex : "${esc(v.base)} ... ...")</p>
          </div>
        </div>

        <div class="centre" style="margin-top: 10px;">
          <button class="btn-micro" id="micro-irregular" title="Parler maintenant" style="margin-bottom: 8px;">🎤</button>
          <p id="etat-micro" style="font-weight: 700; color: var(--texte-2); font-size: 0.95rem;">${etat || "Appuie sur le micro et récite les 3 formes"}</p>
          ${detail}
        </div>

        <div class="carte-boutons" style="margin-top: 15px;">
          <button class="btn" id="passer-irregular" style="min-width: 140px;">${repondu ? "Suivant →" : "Passer"}</button>
        </div>`;

      container.querySelector("#micro-irregular").onclick = ecouterVerbe;
      container.querySelector("#passer-irregular").onclick = () => {
        if (!repondu) {
          repondre(false, "");
        } else {
          index++;
          suivante();
        }
      };
    }

    async function ecouterVerbe() {
      if (repondu) return;
      const btn = container.querySelector("#micro-irregular");
      const etat = container.querySelector("#etat-micro");
      btn.classList.add("actif");
      etat.textContent = "🔴 Je t'écoute… parle maintenant !";

      try {
        const alts = await ecouter(ctx.pack.language);
        let match = false;
        let phraseEntendue = alts[0] || "";

        // Nettoyer et tester les alternatives
        for (const alt of alts) {
          const cleanAlt = alt
            .toLowerCase()
            .replace(/[,.-]/g, "")
            .replace(/\s+/g, " ")
            .trim();
          const cleanCible = cible
            .toLowerCase()
            .replace(/[,.-]/g, "")
            .replace(/\s+/g, " ")
            .trim();

          if (
            cleanAlt === cleanCible ||
            similarity(cleanAlt, cleanCible) >= 0.82
          ) {
            match = true;
            phraseEntendue = alt;
            break;
          }
        }

        repondre(match, phraseEntendue);
      } catch (err) {
        console.error(err);
        const raisons = {
          "not-allowed": "Autorise le micro dans ton navigateur 🎙️",
          "rien-entendu": "Je n'ai rien entendu… Parle bien distinctement !",
          "no-speech": "Je n'ai rien entendu… Parle bien distinctement !",
          network: "La reconnaissance vocale nécessite internet.",
        };
        rendu(
          "",
          `<p class="feedback ko" style="margin-top: 8px;">${raisons[err.message] || "Oups, erreur de micro. Réessaie !"}</p>`,
        );
      } finally {
        btn.classList.remove("actif");
      }
    }

    function repondre(correct, entendu) {
      repondu = true;
      const correctText = `${v.base} ➜ ${v.preterit} ➜ ${v.participe}`;

      if (correct) {
        bonnes++;
        xp += 10; // Récompense élevée pour réciter 3 formes
        parler(cible, ctx.pack.language);
        rendu(
          "",
          `<p class="feedback ok" style="margin-top: 8px;">✅ Excellent ! +10 XP<br><strong>${esc(correctText)}</strong></p>`,
        );
      } else {
        parler(cible, ctx.pack.language);
        const detailEntendu = entendu
          ? `<br><small>J'ai entendu : « ${esc(entendu)} »</small>`
          : "";
        rendu(
          "",
          `<p class="feedback ko" style="margin-top: 8px;">❌ Pas tout à fait ! La réponse était :<br><strong style="font-size:1.1rem;">${esc(correctText)}</strong>${detailEntendu}</p>`,
        );
      }

      container.querySelector("#micro-irregular").disabled = true;
      container.querySelector("#passer-irregular").textContent = "Suivant →";
    }

    rendu();
  }

  suivante();
}
