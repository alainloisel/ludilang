// Jeu : La Course aux Étoiles (Speed Run)
// Traduire le mot affiché en sélectionnant ou prononçant la bonne option avant la fin du temps imparti.

import { sample, shuffle, esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "course",
  nom: "Course aux étoiles",
  emoji: "🚀",
  desc: "Réponds le plus vite possible pour collecter des étoiles ! Attention au chrono.",
};

const NB_QUESTIONS = 8;
const TEMPS_LIMITE = 8; // secondes par question pour que ce soit un speed run!

export function start(container, ctx) {
  const vocab = ctx.pack.vocab;
  let index = 0,
    bonnes = 0,
    xp = 0,
    timer = null;

  // Préparer les questions
  const questions = sample(vocab, Math.min(NB_QUESTIONS, vocab.length)).map(
    (v) => {
      const distracteurs = sample(
        vocab.filter((x) => x.id !== v.id),
        3,
      );
      return {
        cible: v,
        options: shuffle([v.mot, ...distracteurs.map((d) => d.mot)]),
      };
    },
  );

  function suivante() {
    if (index >= questions.length) {
      clearInterval(timer);
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: questions.length,
        message: `${bonnes} étoile${bonnes > 1 ? "s" : ""} collectée${bonnes > 1 ? "s" : ""} !`,
      });
      return;
    }

    const q = questions[index];
    let repondu = false;
    let tempsRestant = TEMPS_LIMITE;

    container.innerHTML = `
      <div class="jeu-entete">
        <div class="barre-prog"><div style="width:${(index / questions.length) * 100}%"></div></div>
        ${microDisponible() ? `<button class="btn-micro-small" id="micro-course" title="Prononcer la réponse" style="margin: 0 10px;">🎤</button>` : ""}
        <span class="compteur">Question ${index + 1} / ${questions.length}</span>
      </div>
      <div class="chrono" style="height: 10px; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden; margin-bottom: 20px;">
        <div id="chrono-barre" style="height: 100%; width: 100%; background: var(--rose); transition: width 0.1s linear;"></div>
      </div>

      <div class="centre" style="margin-bottom: 20px;">
        <p style="font-size: 1.1rem; color: var(--texte-2); margin-bottom: 4px;">Trouve la traduction de :</p>
        <h2 style="font-size: 2.1rem; font-weight: 800; color: var(--jaune);">${esc(q.cible.traduction)}</h2>
      </div>

      <div class="grille-course" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px;">
        ${q.options
          .map(
            (opt) => `
          <button class="btn option-course" data-val="${esc(opt)}" style="padding: 18px 12px; font-size: 1.1rem; font-weight: 700; text-align: center;">
            ${esc(opt)}
          </button>`,
          )
          .join("")}
      </div>
      <div id="feedback-micro" style="text-align: center; min-height: 24px;"></div>`;

    const barre = container.querySelector("#chrono-barre");
    timer = setInterval(() => {
      tempsRestant -= 0.1;
      barre.style.width =
        Math.max(0, (tempsRestant / TEMPS_LIMITE) * 100) + "%";
      if (tempsRestant <= 0) {
        clearInterval(timer);
        valider(null);
      }
    }, 100);

    container.querySelectorAll(".option-course").forEach((b) => {
      b.onclick = () => valider(b.dataset.val);
    });

    const btnMic = container.querySelector("#micro-course");
    if (btnMic) {
      btnMic.onclick = async () => {
        if (repondu) return;
        btnMic.classList.add("actif");
        try {
          const alts = await ecouter(ctx.pack.language);
          let bestOpt = null;
          let bestSim = 0;
          for (const opt of q.options) {
            for (const alt of alts) {
              const sim = similarity(opt.toLowerCase(), alt.toLowerCase());
              if (sim > bestSim) {
                bestSim = sim;
                bestOpt = opt;
              }
            }
          }
          if (bestOpt && bestSim >= 0.75) {
            valider(bestOpt);
          } else {
            const fb = container.querySelector("#feedback-micro");
            fb.innerHTML = `<p class="feedback ko" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9em;">J'ai entendu : « ${esc(alts[0] || "")} ». Réessaie !</p>`;
          }
        } catch (err) {
          console.error(err);
        } finally {
          btnMic.classList.remove("actif");
        }
      };
    }

    function valider(reponse) {
      if (repondu) return;
      repondu = true;
      clearInterval(timer);

      const correct = reponse === q.cible.mot;
      const tpsUtilise = TEMPS_LIMITE - tempsRestant;
      // Bonus vitesse : plus on répond vite, plus on gagne d'XP (jusqu'à +4 XP de bonus)
      const bonusVitesse = correct
        ? Math.max(0, Math.round((TEMPS_LIMITE - tpsUtilise) / 2))
        : 0;
      const gain = correct ? 5 + bonusVitesse : 1;

      container.querySelectorAll(".option-course").forEach((b) => {
        if (b.dataset.val === q.cible.mot) {
          b.style.background = "rgba(52, 211, 153, 0.25)";
          b.style.borderColor = "var(--vert)";
        } else if (b.dataset.val === reponse) {
          b.style.background = "rgba(248, 113, 113, 0.25)";
          b.style.borderColor = "var(--rouge)";
        }
        b.disabled = true;
      });

      if (correct) {
        bonnes++;
        xp += gain;
        parler(q.cible.mot, ctx.pack.language);
        const bonusMsg =
          bonusVitesse > 0 ? ` (+${bonusVitesse} XP vitesse ⚡)` : "";
        const fb = container.querySelector("#feedback-micro");
        fb.innerHTML = `<p class="feedback ok" style="padding: 10px 14px;">🌟 Correct ! +${gain} XP${bonusMsg}</p>`;
      } else {
        parler(q.cible.mot, ctx.pack.language);
        const fb = container.querySelector("#feedback-micro");
        fb.innerHTML = `<p class="feedback ko" style="padding: 10px 14px;">❌ Oups ! C'était : <strong>${esc(q.cible.mot)}</strong></p>`;
      }

      index++;
      setTimeout(suivante, correct ? 1400 : 2500);
    }
  }

  suivante();
}
