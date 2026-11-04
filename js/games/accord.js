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

// Ajouts 2026-11 : [phrase, correcte ?, explication], tirés des points de
// grammaire des cours (there is/are, did/didn't, can, does, verbes forts,
// adjectif épithète, verbe en 2e position).
const AJOUTS = {
  en: [
    ["She doesn't like football.", true, "Avec she : doesn't + base verbale."],
    ["She don't like football.", false, "Avec she, c'est doesn't (does not), pas don't."],
    ["There are two playgrounds in our school.", true, "Devant un nom pluriel : there are."],
    ["There is two playgrounds in our school.", false, "Playgrounds est pluriel : il faut there are."],
    ["I didn't do my homework.", true, "Didn't + base verbale (do)."],
    ["I didn't did my homework.", false, "Après didn't, le verbe reste à la base verbale : I didn't do."],
    ["He can swim.", true, "Après can : base verbale, sans to et sans -s."],
    ["He cans swim.", false, "Can ne prend jamais de -s, même avec he."],
    ["He can to swim.", false, "Pas de to après can : he can swim."],
    ["We are afraid of spiders.", true, "Avec we, le verbe be devient are."],
    ["We is afraid of spiders.", false, "Avec we, c'est are : we are."],
    ["Is there a library in your school?", true, "Library est singulier : is there… ?"],
    ["Are there a library in your school?", false, "Library est singulier : is there a library ?"],
    ["My sister and I love reading comics.", true, "Ma sœur et moi = nous : pas de -s."],
    ["My best friend like foreign languages.", false, "My best friend = he : il faut likes."],
    ["Does she like French?", true, "Question avec she : does + base verbale."],
    ["Does she likes French?", false, "Après does, le verbe perd son -s : does she like ?"],
    ["They mustn't leave school without permission.", true, "Mustn't + base verbale."],
    ["They was at school yesterday.", false, "Au pluriel, le prétérit de be est were : they were."],
    ["Many students play hockey.", true, "Many + nom pluriel (students)."],
    ["Many student play hockey.", false, "Après many, le nom est au pluriel : many students."],
  ],
  de: [
    ["Er isst Brot und Marmelade.", true, "Essen est un verbe fort : er isst."],
    ["Er esst Brot und Marmelade.", false, "Essen change de voyelle avec er : er isst."],
    ["Du fährst in die Schule.", true, "Fahren prend un ä avec du : du fährst."],
    ["Du fahrst in die Schule.", false, "Fahren est un verbe fort : du fährst (avec ä)."],
    ["Ihr seid glücklich.", true, "Sein avec ihr : ihr seid."],
    ["Ihr sind glücklich.", false, "Avec ihr, c'est seid (sind va avec wir et sie)."],
    ["Wir haben noch Zeit.", true, "Haben avec wir : wir haben."],
    ["Wir habt noch Zeit.", false, "Habt va avec ihr ; avec wir, c'est haben."],
    ["Sie hat lange Haare.", true, "Avec sie (elle) : sie hat."],
    ["Sie hast lange Haare.", false, "Hast va avec du ; avec sie (elle), c'est hat."],
    ["Der blaue Pulli ist warm.", true, "Après der (nominatif), l'adjectif épithète prend -e."],
    ["Der blau Pulli ist warm.", false, "L'adjectif épithète s'accorde : der blaue Pulli."],
    ["Ich kaufe den blauen Pulli.", true, "Le pulli est COD : accusatif masculin, den blauen."],
    ["Ich kaufe der blaue Pulli.", false, "Le pulli est COD, donc à l'accusatif : den blauen Pulli."],
    ["Die Sneakers sind braun.", true, "Après sein, l'adjectif attribut ne s'accorde pas."],
    ["Die Sneakers sind braune.", false, "Après sein, l'adjectif reste invariable : sind braun."],
    ["Er nimmt den Bus.", true, "Nehmen est un verbe fort : er nimmt."],
    ["Er nehmt den Bus.", false, "Nehmen change de voyelle avec er : er nimmt."],
    ["Am Wochenende spiele ich Fußball.", true, "Le verbe reste en 2e position, le sujet passe après."],
    ["Am Wochenende ich spiele Fußball.", false, "Le verbe conjugué doit être en 2e position : spiele ich."],
  ],
};
for (const lang of ["en", "de"]) {
  PROPOSITIONS[lang].push(
    ...AJOUTS[lang].map(([text, correct, explication]) => ({
      text,
      correct,
      explication,
    })),
  );
}

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
