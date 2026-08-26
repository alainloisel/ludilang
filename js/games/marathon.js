// Jeu : Marathon Vocab (Time Attack)
// Traduire le plus de mots possibles dans le temps imparti. Les bonnes réponses ajoutent du temps.

import { sample, esc, similarity, normalize } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "marathon",
  nom: "Marathon Vocab",
  emoji: "⏱️",
  desc: "Traduis un maximum de mots avant la fin du chronomètre ! Les bonnes réponses ajoutent du temps.",
};

const TEMPS_INITIAL = 45; // secondes

export function start(container, ctx) {
  const vocab = ctx.pack.vocab;
  let score = 0;
  let totalReponses = 0;
  let tempsRestant = TEMPS_INITIAL;
  let timer = null;
  let currentWord = null;
  let repondu = false;

  // Lancer le chrono global
  timer = setInterval(() => {
    tempsRestant--;
    majChrono();
    if (tempsRestant <= 0) {
      finPartie();
    }
  }, 1000);

  function nouvelleQuestion() {
    if (tempsRestant <= 0) return;
    repondu = false;
    currentWord = sample(vocab, 1)[0];

    container.innerHTML = `
      <div class="jeu-entete" style="justify-content: space-between;">
        <span class="compteur" style="font-size: 1.1rem; color: var(--jaune);">Score : <strong id="score-val">${score}</strong> 🔥</span>
        <span id="chrono-val" style="font-size: 1.25rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; background: rgba(255,255,255,0.08);">⏱️ ${tempsRestant}s</span>
      </div>

      <div class="centre" style="margin: 25px 0;">
        <p style="font-size: 1rem; color: var(--texte-2); margin-bottom: 6px;">Traduire en ${ctx.pack.language === "de" ? "allemand" : "anglais"} :</p>
        <h2 style="font-size: 2.1rem; font-weight: 800; color: var(--cyan);">${esc(currentWord.traduction)}</h2>
      </div>

      <div class="ligne-saisie" style="width: 100%; max-width: 400px; margin: 0 auto; display: flex; gap: 10px;">
        <input type="text" id="saisie-marathon" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Ta réponse…" style="flex: 1;" />
        ${microDisponible() ? `<button class="btn-micro-small" id="micro-marathon" title="Prononcer la réponse">🎤</button>` : ""}
        <button class="btn btn-primary" id="valider-marathon">OK</button>
      </div>

      <div class="carte-boutons" style="margin-top: 15px;">
        <button class="btn btn-ghost" id="passer-marathon">Passer ➔</button>
      </div>
      <div id="feedback-marathon" style="text-align: center; min-height: 24px; margin-top: 12px;"></div>`;

    const input = container.querySelector("#saisie-marathon");
    input.focus();
    input.onkeydown = (e) => {
      if (e.key === "Enter") valider(input.value);
    };

    container.querySelector("#valider-marathon").onclick = () =>
      valider(input.value);
    container.querySelector("#passer-marathon").onclick = () => passer();

    const btnMic = container.querySelector("#micro-marathon");
    if (btnMic) {
      btnMic.onclick = async () => {
        if (repondu) return;
        btnMic.classList.add("actif");
        try {
          const alts = await ecouter(ctx.pack.language);
          if (alts && alts.length) {
            let bestAlt = alts[0];
            for (const alt of alts) {
              if (normalize(alt) === normalize(currentWord.mot)) {
                bestAlt = alt;
                break;
              }
            }
            input.value = bestAlt;
            valider(bestAlt);
          }
        } catch (err) {
          console.error(err);
        } finally {
          btnMic.classList.remove("actif");
        }
      };
    }
  }

  function majChrono() {
    const el = container.querySelector("#chrono-val");
    if (el) {
      el.textContent = `⏱️ ${tempsRestant}s`;
      if (tempsRestant <= 10) {
        el.style.color = "var(--rouge)";
        el.style.background = "rgba(248, 113, 113, 0.15)";
      } else {
        el.style.color = "var(--texte)";
        el.style.background = "rgba(255,255,255,0.08)";
      }
    }
  }

  function valider(proposition) {
    if (repondu || tempsRestant <= 0) return;
    repondu = true;
    totalReponses++;

    const cleanProp = normalize(proposition);
    const cleanCible = normalize(currentWord.mot);
    const correct =
      cleanProp === cleanCible || similarity(cleanProp, cleanCible) >= 0.85;

    const fb = container.querySelector("#feedback-marathon");
    const scoreVal = container.querySelector("#score-val");

    if (correct) {
      score++;
      tempsRestant += 3; // Ajout de temps !
      if (scoreVal) scoreVal.textContent = score;
      majChrono();
      parler(currentWord.mot, ctx.pack.language);
      fb.innerHTML = `<p class="feedback ok" style="padding: 6px 12px; font-size: 0.9em; margin: 0;">✅ +3s ! C'était : <strong>${esc(currentWord.mot)}</strong></p>`;
      setTimeout(nouvelleQuestion, 800);
    } else {
      parler(currentWord.mot, ctx.pack.language);
      fb.innerHTML = `<p class="feedback ko" style="padding: 6px 12px; font-size: 0.9em; margin: 0;">❌ C'était : <strong>${esc(currentWord.mot)}</strong></p>`;
      setTimeout(nouvelleQuestion, 2000);
    }
  }

  function passer() {
    if (repondu || tempsRestant <= 0) return;
    repondu = true;
    totalReponses++;

    const fb = container.querySelector("#feedback-marathon");
    fb.innerHTML = `<p class="feedback ko" style="padding: 6px 12px; font-size: 0.9em; margin: 0; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); color: var(--texte-2);">La réponse était : <strong>${esc(currentWord.mot)}</strong></p>`;
    setTimeout(nouvelleQuestion, 1400);
  }

  function finPartie() {
    clearInterval(timer);
    const xpGagnee = score * 4; // 4 XP par mot traduit
    ctx.finPartie({
      jeu: meta.id,
      xp: xpGagnee,
      bonnes: score,
      reponses: totalReponses,
      message: `Temps écoulé ! Tu as traduit ${score} mot${score > 1 ? "s" : ""} (+${xpGagnee} XP) ⏱️`,
    });
  }

  nouvelleQuestion();
}
