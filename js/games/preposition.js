// Jeu : Le Chasseur de Prépositions (Preposition Hunter)
// Trouver la bonne préposition pour remplir le blanc dans la phrase.

import { sample, shuffle, esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "preposition",
  nom: "Le Chasseur",
  emoji: "🏹",
  desc: "Trouve la bonne préposition pour compléter la phrase !",
};

const EXERCICES = {
  en: [
    {
      sentence: "I am good ___ English.",
      answer: "at",
      options: ["at", "in", "on", "for"],
    },
    {
      sentence: "She is interested ___ science.",
      answer: "in",
      options: ["in", "at", "on", "with"],
    },
    {
      sentence: "They are waiting ___ the bus.",
      answer: "for",
      options: ["for", "to", "at", "on"],
    },
    {
      sentence: "I wake up ___ seven o'clock.",
      answer: "at",
      options: ["at", "on", "in", "to"],
    },
    {
      sentence: "My birthday is ___ July.",
      answer: "in",
      options: ["in", "on", "at", "for"],
    },
    {
      sentence: "We play football ___ Saturdays.",
      answer: "on",
      options: ["on", "in", "at", "under"],
    },
  ],
  de: [
    {
      sentence: "Ich fahre ___ Berlin.",
      answer: "nach",
      options: ["nach", "zu", "in", "bei"],
    },
    {
      sentence: "Ich spiele ___ Wochenende.",
      answer: "am",
      options: ["am", "im", "um", "auf"],
    },
    {
      sentence: "Die Schule beginnt ___ acht Uhr.",
      answer: "um",
      options: ["um", "am", "im", "zu"],
    },
    {
      sentence: "Ich wohne ___ Lyon.",
      answer: "in",
      options: ["in", "zu", "bei", "nach"],
    },
    {
      sentence: "Ich gehe ___ meinem Freund.",
      answer: "zu",
      options: ["zu", "nach", "in", "an"],
    },
    {
      sentence: "Er wartet ___ den Bus.",
      answer: "auf",
      options: ["auf", "für", "an", "zu"],
    },
  ],
};

// Ajouts 2026-11 : [phrase, bonne préposition, mauvaises propositions].
// Une seule réponse possible par phrase (on évite at/in the library, etc.).
const AJOUTS = {
  en: [
    ["We go to school ___ bus.", "by", ["on", "in", "at"]],
    ["I was born ___ 2012.", "in", ["on", "at", "for"]],
    ["My birthday is ___ July 31st.", "on", ["in", "at", "to"]],
    ["It's ten ___ five. (5 h 10)", "past", ["to", "at", "on"]],
    ["Next ___ the bed, there is a bedside table.", "to", ["at", "of", "in"]],
    ["I live ___ the third floor.", "on", ["in", "at", "to"]],
    ["There are posters ___ the walls.", "on", ["in", "at", "under"]],
    ["Pupils keep their books ___ the lockers.", "in", ["on", "at", "under"]],
    ["I'm afraid ___ spiders.", "of", ["at", "from", "with"]],
    ["I listen ___ music in my room.", "to", ["at", "for", "on"]],
    ["Look ___ the board, please.", "at", ["to", "on", "for"]],
    ["I share a bathroom ___ my brother.", "with", ["at", "for", "of"]],
    ["He comes ___ Rouen.", "from", ["of", "at", "to"]],
    ["I didn't hand my homework ___.", "in", ["on", "at", "to"]],
    ["Bastille Day is ___ the fourteenth of July.", "on", ["in", "at", "by"]],
    ["I go to bed ___ nine o'clock.", "at", ["in", "on", "to"]],
    ["It's too hot ___ work.", "to", ["at", "of", "on"]],
    ["My favourite room ___ my house is my bedroom.", "in", ["on", "at", "to"]],
    ["We have English ___ Monday morning.", "on", ["in", "at", "to"]],
    ["It's cold ___ the morning.", "in", ["on", "at", "to"]],
    ["Thank you ___ your help!", "for", ["to", "at", "of"]],
  ],
  de: [
    ["Ich fahre ___ dem Bus in die Schule.", "mit", ["bei", "von", "zu"]],
    ["Wir sind ___ Garten.", "im", ["zu", "um", "auf"]],
    ["___ September wird es kälter.", "Im", ["Am", "Um", "Zu"]],
    ["Um wie viel Uhr? ___ sieben Uhr.", "Um", ["Am", "Im", "Zu"]],
    ["___ Montag habe ich Deutsch.", "Am", ["Im", "Um", "In"]],
    ["Mein Vater fährt mich ___ die Schule.", "in", ["nach", "zu", "bei"]],
    ["Alex und Lisa sprechen ___ Mode.", "über", ["auf", "mit", "an"]],
    ["Was isst du ___ Frühstück?", "zum", ["im", "um", "auf"]],
    ["Fabian wohnt ___ Regensburg.", "in", ["nach", "zu", "an"]],
    ["Er surft ___ Internet.", "im", ["am", "um", "an"]],
    ["Ich spiele ___ meinem Bruder Tennis.", "mit", ["für", "von", "aus"]],
    ["Die Sneakers ___ Zahide sind braun.", "von", ["mit", "zu", "aus"]],
    ["Ich komme ___ Frankreich.", "aus", ["von", "nach", "in"]],
    ["Das Heft ist ___ der Tasche.", "in", ["nach", "um", "zu"]],
    ["Ich gehe ___ Hause.", "nach", ["zu", "in", "bei"]],
    ["Ich bin ___ Hause.", "zu", ["nach", "in", "bei"]],
    ["Das Geschenk ist ___ dich.", "für", ["mit", "von", "zu"]],
    ["___ Winter ist es kalt.", "Im", ["Am", "Um", "Zu"]],
    ["Mein Geburtstag ist ___ 5. Mai.", "am", ["im", "um", "zu"]],
    ["Die Party ist ___ Freitag.", "am", ["im", "um", "zu"]],
    ["Ich warte ___ meinen Freund.", "auf", ["an", "mit", "zu"]],
    ["Er geht ___ Fuß in die Schule.", "zu", ["mit", "auf", "an"]],
  ],
};
for (const lang of ["en", "de"]) {
  EXERCICES[lang].push(
    ...AJOUTS[lang].map(([sentence, answer, autres]) => ({
      sentence,
      answer,
      options: [answer, ...autres],
    })),
  );
}

const NB_QUESTIONS = 5;

export function start(container, ctx) {
  const lang = ctx.pack.language === "de" ? "de" : "en";
  const pool = EXERCICES[lang];
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
        message: `${bonnes} préposition${bonnes > 1 ? "s" : ""} trouvée${bonnes > 1 ? "s" : ""} sur ${questions.length} !`,
      });
      return;
    }

    const q = questions[index];
    const optionsMelangees = shuffle(q.options);
    let repondu = false;

    container.innerHTML = `
      <div class="jeu-entete">
        <div class="barre-prog"><div style="width:${(index / questions.length) * 100}%"></div></div>
        ${microDisponible() ? `<button class="btn-micro-small" id="micro-preposition" title="Prononcer la préposition" style="margin: 0 10px;">🎤</button>` : ""}
        <span class="compteur">Question ${index + 1} / ${questions.length}</span>
      </div>

      <div class="centre" style="margin: 25px 0;">
        <p style="font-size: 1rem; color: var(--texte-2); margin-bottom: 8px;">Complète la phrase :</p>
        <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--texte); line-height: 1.45;">
          ${esc(q.sentence).replace("___", `<span style="color: var(--jaune); border-bottom: 3px solid var(--jaune); padding: 0 6px;">___</span>`)}
        </h2>
      </div>

      <div class="grille-options" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 18px;">
        ${optionsMelangees
          .map(
            (opt) => `
          <button class="btn option-preposition" data-val="${esc(opt)}" style="padding: 16px 0; font-size: 1.1rem; font-weight: 700; text-align: center;">
            ${esc(opt)}
          </button>`,
          )
          .join("")}
      </div>
      <div id="feedback" style="text-align: center; min-height: 24px;"></div>`;

    container.querySelectorAll(".option-preposition").forEach((b) => {
      b.onclick = () => valider(b.dataset.val);
    });

    const btnMic = container.querySelector("#micro-preposition");
    if (btnMic) {
      btnMic.onclick = async () => {
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
            const fb = container.querySelector("#feedback");
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
      const correct = reponse === q.answer;

      container.querySelectorAll(".option-preposition").forEach((b) => {
        if (b.dataset.val === q.answer) {
          b.style.background = "rgba(52, 211, 153, 0.25)";
          b.style.borderColor = "var(--vert)";
        } else if (b.dataset.val === reponse) {
          b.style.background = "rgba(248, 113, 113, 0.25)";
          b.style.borderColor = "var(--rouge)";
        }
        b.disabled = true;
      });

      const complete = q.sentence.replace("___", q.answer);
      const fb = container.querySelector("#feedback");

      if (correct) {
        bonnes++;
        xp += 6;
        parler(complete, ctx.pack.language);
        fb.innerHTML = `<p class="feedback ok">✅ Bien visé ! +6 XP<br><em>${esc(complete)}</em></p>`;
      } else {
        parler(complete, ctx.pack.language);
        fb.innerHTML = `<p class="feedback ko">❌ Loupé ! La bonne réponse était : <strong>${esc(q.answer)}</strong><br><em>${esc(complete)}</em></p>`;
      }

      index++;
      setTimeout(suivante, correct ? 1800 : 3400);
    }
  }

  suivante();
}
