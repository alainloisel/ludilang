// Jeu : L'Accordeur (Agreement Judge)
// Décider si l'accord grammatical proposé est correct ou incorrect.

import { sample, esc } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "accord",
  nom: "L'Accordeur",
  emoji: "⚖️",
  desc: "Juge si l'accord grammatical proposé est correct ou incorrect !",
};

const PROPOSITIONS = {
  en: [
    {
      text: "He plays football.",
      correct: true,
      explication:
        "À la 3e personne du singulier au présent, le verbe prend un '-s'.",
    },
    {
      text: "He play football.",
      correct: false,
      explication: "Oups ! Il manque le '-s' de la 3e personne du singulier.",
    },
    {
      text: "They listen to music.",
      correct: true,
      explication: "Au pluriel, le verbe reste à la base verbale sans '-s'.",
    },
    {
      text: "They listens to music.",
      correct: false,
      explication: "Non ! Pas de '-s' au pluriel en anglais.",
    },
    {
      text: "She has a dog.",
      correct: true,
      explication: "Le verbe 'have' devient 'has' avec he/she/it.",
    },
    {
      text: "She have a dog.",
      correct: false,
      explication: "Oups ! C'est 'she has' et non 'she have'.",
    },
    {
      text: "These books are good.",
      correct: true,
      explication: "'These' s'accorde avec le nom pluriel 'books'.",
    },
    {
      text: "This books are good.",
      correct: false,
      explication:
        "'This' est singulier, on doit dire 'these books' au pluriel.",
    },
    {
      text: "Those girls play football.",
      correct: true,
      explication: "'Those' s'accorde avec le pluriel 'girls'.",
    },
    {
      text: "That girls play football.",
      correct: false,
      explication: "'That' est singulier, il faut 'those' pour le pluriel.",
    },
  ],
  de: [
    {
      text: "Ich spiele am Wochenende.",
      correct: true,
      explication: "Avec 'ich', le verbe se termine par '-e'.",
    },
    {
      text: "Ich spielst am Wochenende.",
      correct: false,
      explication: "Faux ! La terminaison '-st' correspond à 'du'.",
    },
    {
      text: "Du gehst in die Schule.",
      correct: true,
      explication: "La terminaison régulière avec 'du' est '-st'.",
    },
    {
      text: "Du geht in die Schule.",
      correct: false,
      explication: "Oups ! La terminaison avec 'du' est '-st' (du gehst).",
    },
    {
      text: "Wir wohnen in Berlin.",
      correct: true,
      explication: "La terminaison régulière avec 'wir' est '-en'.",
    },
    {
      text: "Wir lernt Deutsch.",
      correct: false,
      explication: "Faux ! Avec 'wir', on dit 'wir lernen' (terminaison -en).",
    },
    {
      text: "Mit dem Vater.",
      correct: true,
      explication:
        "La préposition 'mit' est toujours suivie du datif (dem Vater).",
    },
    {
      text: "Mit den Vater.",
      correct: false,
      explication:
        "Erreur ! 'mit' exige le datif, donc 'mit dem Vater' au masculin singulier.",
    },
    {
      text: "Für den Bruder.",
      correct: true,
      explication: "La préposition 'für' exige l'accusatif (den Bruder).",
    },
    {
      text: "Für dem Bruder.",
      correct: false,
      explication: "Faux ! 'für' gouverne l'accusatif, donc 'für den Bruder'.",
    },
  ],
};

const NB_QUESTIONS = 8;

export function start(container, ctx) {
  const lang = ctx.pack.language === "de" ? "de" : "en";
  const pool = PROPOSITIONS[lang];
  const questions = sample(pool, Math.min(NB_QUESTIONS, pool.length));
  let index = 0,
    bonnes = 0,
    xp = 0;

  function suivante() {
    if (index >= questions.length) {
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: questions.length,
        message: `${bonnes} accord${bonnes > 1 ? "s" : ""} correcte${bonnes > 1 ? "s" : ""} jugé${bonnes > 1 ? "s" : ""} !`,
      });
      return;
    }

    const q = questions[index];
    let repondu = false;

    container.innerHTML = `
      <div class="jeu-entete">
        <div class="barre-prog"><div style="width:${(index / questions.length) * 100}%"></div></div>
        ${microDisponible() ? `<button class="btn-micro-small" id="micro-accord" title="Répondre par la voix" style="margin: 0 10px;">🎤</button>` : ""}
        <span class="compteur">Question ${index + 1} / ${questions.length}</span>
      </div>

      <div class="centre" style="margin: 25px 0;">
        <p style="font-size: 1rem; color: var(--texte-2); margin-bottom: 8px;">Cet accord grammatical est-il correct ?</p>
        <h2 style="font-size: 1.85rem; font-weight: 800; color: var(--texte); line-height: 1.4;">« ${esc(q.text)} »</h2>
      </div>

      <div class="carte-boutons" style="display: flex; gap: 16px; justify-content: center;">
        <button class="btn btn-ko" id="btn-incorrect" style="flex: 1; max-width: 160px; padding: 16px 0; font-size: 1.1rem;">❌ Incorrect</button>
        <button class="btn btn-ok" id="btn-correct" style="flex: 1; max-width: 160px; padding: 16px 0; font-size: 1.1rem;">✅ Correct</button>
      </div>
      <div id="feedback" style="margin-top: 20px;"></div>`;

    container.querySelector("#btn-correct").onclick = () => valider(true);
    container.querySelector("#btn-incorrect").onclick = () => valider(false);

    const btnMic = container.querySelector("#micro-accord");
    if (btnMic) {
      btnMic.onclick = async () => {
        btnMic.classList.add("actif");
        try {
          const alts = await ecouter("fr-FR");
          let userResponse = null;
          for (const alt of alts) {
            const text = alt.toLowerCase();
            if (
              text.includes("correct") ||
              text.includes("vrai") ||
              text.includes("oui") ||
              text.includes("bien") ||
              text.includes("bon") ||
              text.includes("ok") ||
              text.includes("yes")
            ) {
              userResponse = true;
              break;
            }
            if (
              text.includes("incorrect") ||
              text.includes("faux") ||
              text.includes("non") ||
              text.includes("mauvais") ||
              text.includes("no")
            ) {
              userResponse = false;
              break;
            }
          }
          if (userResponse !== null) {
            valider(userResponse);
          } else {
            const fb = container.querySelector("#feedback");
            fb.innerHTML = `<p class="feedback ko" style="font-size: 0.9em; margin-top:5px;">J'ai entendu : « ${esc(alts[0] || "")} ». Dis « correct » ou « incorrect ».</p>`;
          }
        } catch (err) {
          console.error(err);
        } finally {
          btnMic.classList.remove("actif");
        }
      };
    }

    function valider(userChoice) {
      if (repondu) return;
      repondu = true;
      const ok = userChoice === q.correct;

      container.querySelector("#btn-correct").disabled = true;
      container.querySelector("#btn-incorrect").disabled = true;
      if (btnMic) btnMic.disabled = true;

      const fb = container.querySelector("#feedback");
      if (ok) {
        bonnes++;
        xp += 5;
        parler(q.text, ctx.pack.language);
        fb.innerHTML = `<p class="feedback ok">✅ Bravo ! +5 XP<br><em>${esc(q.explication)}</em></p>`;
      } else {
        parler(q.text, ctx.pack.language);
        fb.innerHTML = `<p class="feedback ko">❌ Erreur !<br><em>${esc(q.explication)}</em></p>`;
      }

      index++;
      setTimeout(suivante, ok ? 1800 : 3400);
    }
  }

  suivante();
}
