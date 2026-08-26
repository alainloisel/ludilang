// Jeu : Le Château des Conjugaisons (Verb Castle)
// Conjuguer les verbes selon le pronom et le temps imposés pour grimper dans la tour.

import { sample, esc } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "conjugaison",
  nom: "Château des Conjugaisons",
  emoji: "🏰",
  desc: "Conjugue les verbes correctement pour monter les étages du château !",
};

const BASE_VERBES = {
  en: [
    {
      infinitif: "to be",
      conjugaisons: {
        "Present (I)": "am",
        "Present (He/She/It)": "is",
        "Present (We/They)": "are",
        "Past (I/He/She/It)": "was",
        "Past (You/We/They)": "were",
      },
    },
    {
      infinitif: "to have",
      conjugaisons: {
        "Present (I/You/We/They)": "have",
        "Present (He/She/It)": "has",
        "Past (all pronouns)": "had",
      },
    },
    {
      infinitif: "to go",
      conjugaisons: {
        "Present (I/You/We/They)": "go",
        "Present (He/She/It)": "goes",
        "Past (all pronouns)": "went",
      },
    },
    {
      infinitif: "to play",
      conjugaisons: {
        "Present (I/You/We/They)": "play",
        "Present (He/She/It)": "plays",
        "Past (all pronouns)": "played",
      },
    },
    {
      infinitif: "to watch",
      conjugaisons: {
        "Present (I/You/We/They)": "watch",
        "Present (He/She/It)": "watches",
        "Past (all pronouns)": "watched",
      },
    },
    {
      infinitif: "to see",
      conjugaisons: {
        "Present (I/You/We/They)": "see",
        "Present (He/She/It)": "sees",
        "Past (all pronouns)": "saw",
      },
    },
    {
      infinitif: "to write",
      conjugaisons: {
        "Present (I/You/We/They)": "write",
        "Present (He/She/It)": "writes",
        "Past (all pronouns)": "wrote",
      },
    },
    {
      infinitif: "to make",
      conjugaisons: {
        "Present (I/You/We/They)": "make",
        "Present (He/She/It)": "makes",
        "Past (all pronouns)": "made",
      },
    },
    {
      infinitif: "to speak",
      conjugaisons: {
        "Present (I/You/We/They)": "speak",
        "Present (He/She/It)": "speaks",
        "Past (all pronouns)": "spoke",
      },
    },
  ],
  de: [
    {
      infinitif: "sein",
      conjugaisons: {
        "Präsens (ich)": "bin",
        "Präsens (du)": "bist",
        "Präsens (er/sie/es)": "ist",
        "Präsens (wir)": "sind",
        "Präsens (ihr)": "seid",
        "Präteritum (ich/er/sie)": "war",
        "Präteritum (du)": "warst",
      },
    },
    {
      infinitif: "haben",
      conjugaisons: {
        "Präsens (ich)": "habe",
        "Präsens (du)": "hast",
        "Präsens (er/sie/es)": "hat",
        "Präsens (wir)": "haben",
        "Präsens (ihr)": "habt",
        "Präteritum (ich/er/sie)": "hatte",
        "Präteritum (du)": "hattest",
      },
    },
    {
      infinitif: "spielen",
      conjugaisons: {
        "Präsens (ich)": "spiele",
        "Präsens (du)": "spielst",
        "Präsens (er/sie/es)": "spielt",
        "Präsens (wir)": "spielen",
        "Präsens (ihr)": "spielt",
      },
    },
    {
      infinitif: "wohnen",
      conjugaisons: {
        "Präsens (ich)": "wohne",
        "Präsens (du)": "wohnst",
        "Präsens (er/sie/es)": "wohnt",
        "Präsens (wir)": "wohnen",
      },
    },
    {
      infinitif: "machen",
      conjugaisons: {
        "Präsens (ich)": "mache",
        "Präsens (du)": "machst",
        "Präsens (er/sie/es)": "macht",
        "Präsens (wir)": "machen",
      },
    },
  ],
};

const NB_ETAGES = 5;

export function start(container, ctx) {
  const lang = ctx.pack.language === "de" ? "de" : "en";
  const verbesDisponibles = BASE_VERBES[lang];
  let etage = 0,
    bonnes = 0,
    xp = 0;

  // Préparer les manches
  const manches = [];
  for (let step = 0; step < NB_ETAGES; step++) {
    const v = sample(verbesDisponibles, 1)[0];
    const tempsKeys = Object.keys(v.conjugaisons);
    const tempsChoisi = sample(tempsKeys, 1)[0];
    const reponseAttendue = v.conjugaisons[tempsChoisi];
    manches.push({
      verb: v.infinitif,
      consigne: tempsChoisi,
      reponse: reponseAttendue,
    });
  }

  function jouerEtage() {
    if (etage >= manches.length) {
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: manches.length,
        message: `Félicitations, tu as atteint le sommet du château ! 🏆 (+${xp} XP)`,
      });
      return;
    }

    const current = manches[etage];
    let repondu = false;

    container.innerHTML = `
      <div class="jeu-entete">
        <div class="barre-prog"><div style="width:${(etage / manches.length) * 100}%"></div></div>
        <span class="compteur">Étage ${etage + 1} / ${manches.length} 🏰</span>
      </div>

      <div class="tour-castle" style="display: flex; flex-direction: column; align-items: center; margin: 20px 0;">
        <div style="font-size: 3rem; margin-bottom: 8px;">👑</div>
        <div class="chateau-visu" style="width: 140px; height: 160px; border: 4px solid var(--texte-2); border-radius: 12px 12px 0 0; background: var(--carte-claire); display: flex; flex-direction: column; justify-content: flex-end; align-items: center; position: relative; overflow: hidden; box-shadow: var(--ombre);">
          <div class="barre-niveau-etage" style="width: 100%; height: ${((etage + 1) / manches.length) * 100}%; background: linear-gradient(0deg, var(--violet), var(--rose)); opacity: 0.85; transition: height 0.6s ease;"></div>
          <span style="position: absolute; top: 40%; font-size: 1.1rem; font-weight: 800; color: var(--texte);">Étage ${etage + 1}</span>
        </div>
      </div>

      <div class="centre" style="margin-bottom: 16px;">
        <p style="font-size: 1rem; color: var(--texte-2); margin-bottom: 4px;">Conjugue le verbe :</p>
        <h2 style="font-size: 1.9rem; font-weight: 800; color: var(--cyan);">${esc(current.verb)}</h2>
        <p style="font-size: 1.15rem; font-weight: 700; color: var(--jaune); margin-top: 6px;">👉 ${esc(current.consigne)}</p>
      </div>

      <div class="ligne-saisie" style="width: 100%; max-width: 400px; margin: 0 auto; display: flex; gap: 10px;">
        <input type="text" id="saisie-conjugaison" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ta réponse…" style="flex: 1;" />
        ${microDisponible() ? `<button class="btn-micro-small" id="micro-conjugaison" title="Dicter la conjugaison">🎤</button>` : ""}
        <button class="btn btn-primary" id="valider-conjugaison">OK</button>
      </div>
      <div id="feedback" style="margin-top: 14px;"></div>`;

    const input = container.querySelector("#saisie-conjugaison");
    input.focus();
    input.onkeydown = (e) => {
      if (e.key === "Enter") valider();
    };
    container.querySelector("#valider-conjugaison").onclick = valider;

    const btnMic = container.querySelector("#micro-conjugaison");
    if (btnMic) {
      btnMic.onclick = async () => {
        btnMic.classList.add("actif");
        try {
          const alts = await ecouter(ctx.pack.language);
          if (alts && alts.length) {
            let bestAlt = alts[0];
            for (const alt of alts) {
              if (alt.toLowerCase().trim() === current.reponse) {
                bestAlt = alt;
                break;
              }
            }
            input.value = bestAlt;
            valider();
          }
        } catch (err) {
          console.error(err);
        } finally {
          btnMic.classList.remove("actif");
        }
      };
    }

    function valider() {
      if (repondu) return;
      const correct = input.value.toLowerCase().trim() === current.reponse;
      repondu = true;

      container.querySelector("#saisie-conjugaison").disabled = true;
      container.querySelector("#valider-conjugaison").disabled = true;
      if (btnMic) btnMic.disabled = true;

      const fb = container.querySelector("#feedback");
      if (correct) {
        bonnes++;
        xp += 8;
        parler(current.reponse, ctx.pack.language);
        fb.innerHTML = `<p class="feedback ok">✅ Correct ! +8 XP<br><em>${esc(current.verb)} ➜ ${esc(current.reponse)}</em></p>`;
      } else {
        parler(current.reponse, ctx.pack.language);
        fb.innerHTML = `<p class="feedback ko">❌ Erreur ! La réponse correcte était : <strong>${esc(current.reponse)}</strong></p>`;
      }

      etage++;
      setTimeout(jouerEtage, correct ? 1600 : 2800);
    }
  }

  jouerEtage();
}
