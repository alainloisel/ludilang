// Jeu : L'Intrus (Odd One Out)
// L'élève doit trouver le mot qui n'appartient pas au même groupe/thème.

import { sample, shuffle, esc, similarity, motTranscrit } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "intrus",
  nom: "L'Intrus",
  emoji: "🕵️‍♂️",
  desc: "Trouve le mot qui n'appartient pas au groupe. Reste concentré !",
};

const NB_MANCHES = 5;

export function start(container, ctx) {
  const vocab = ctx.pack.vocab;
  let manche = 0,
    bonnes = 0,
    xp = 0;

  // Générer les manches
  const manches = [];
  for (let m = 0; m < NB_MANCHES * 2; m++) {
    const q = genererManche(vocab);
    if (q && !manches.some((x) => x.intrus.id === q.intrus.id)) {
      manches.push(q);
    }
    if (manches.length >= NB_MANCHES) break;
  }

  // Si on n'a pas pu en générer assez
  while (manches.length < NB_MANCHES) {
    manches.push(genererManche(vocab));
  }

  function jouerManche() {
    if (manche >= manches.length) {
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: manches.length,
        message: `${bonnes} intrus démasqué${bonnes > 1 ? "s" : ""} sur ${manches.length} !`,
      });
      return;
    }

    const current = manches[manche];
    const options = shuffle([...current.correct, current.intrus]);
    let repondu = false;

    function rendu(feedback = "") {
      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(manche / manches.length) * 100}%"></div></div>
          ${microDisponible() ? `<button class="btn-micro-small" id="micro-intrus" title="Prononcer l'intrus" style="margin: 0 10px;">🎤</button>` : ""}
          <span class="compteur">Manche ${manche + 1} / ${manches.length}</span>
        </div>
        <p class="indice">💡 ${esc(current.indice)}</p>
        <div class="grille-intrus" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 20px 0;">
          ${options
            .map(
              (v) => `
            <button class="btn option-intrus" data-id="${v.id}" style="padding: 24px 16px; font-size: 1.15rem; display: flex; flex-direction: column; align-items: center; gap: 8px;">
              <span class="mot-intrus">${motTranscrit(v.mot, v.pinyin)}</span>
              <span class="btn-son" style="font-size: 1rem; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center;">🔊</span>
            </button>`,
            )
            .join("")}
        </div>
        ${feedback}`;

      container.querySelectorAll(".option-intrus").forEach((b) => {
        b.onclick = (e) => {
          const id = b.dataset.id;
          const clickSurSon = e.target.classList.contains("btn-son");
          const wordObj = options.find((x) => x.id === id);

          if (clickSurSon) {
            e.stopPropagation();
            parler(wordObj.mot, ctx.pack.language);
            return;
          }

          repondre(id);
        };
      });

      const btnMic = container.querySelector("#micro-intrus");
      if (btnMic) {
        btnMic.onclick = async () => {
          btnMic.classList.add("actif");
          try {
            const alts = await ecouter(ctx.pack.language);
            let bestWord = null;
            let bestSim = 0;
            for (const opt of options) {
              for (const alt of alts) {
                const sim = similarity(
                  opt.mot.toLowerCase(),
                  alt.toLowerCase(),
                );
                if (sim > bestSim) {
                  bestSim = sim;
                  bestWord = opt;
                }
              }
            }
            if (bestWord && bestSim >= 0.75) {
              repondre(bestWord.id);
            } else {
              // Try French translation
              const altsFr = await ecouter("fr-FR");
              for (const opt of options) {
                for (const alt of altsFr) {
                  const sim = similarity(
                    opt.traduction.toLowerCase(),
                    alt.toLowerCase(),
                  );
                  if (sim > bestSim) {
                    bestSim = sim;
                    bestWord = opt;
                  }
                }
              }
              if (bestWord && bestSim >= 0.75) {
                repondre(bestWord.id);
              } else {
                rendu(
                  `<p class="feedback ko" style="font-size: 0.95em;">J'ai entendu : « ${esc(alts[0] || "")} ». Réessaie !</p>`,
                );
              }
            }
          } catch (err) {
            console.error(err);
          } finally {
            btnMic.classList.remove("actif");
          }
        };
      }
    }

    function repondre(selectionId) {
      if (repondu) return;
      repondu = true;
      const correct = selectionId === current.intrus.id;

      container.querySelectorAll(".option-intrus").forEach((b) => {
        const id = b.dataset.id;
        if (id === current.intrus.id) {
          b.style.background = "rgba(52, 211, 153, 0.25)";
          b.style.borderColor = "var(--vert)";
        } else if (id === selectionId) {
          b.style.background = "rgba(248, 113, 113, 0.25)";
          b.style.borderColor = "var(--rouge)";
        }
        b.disabled = true;
      });

      if (correct) {
        bonnes++;
        xp += 6;
        parler(current.intrus.mot, ctx.pack.language);
        rendu(
          `<p class="feedback ok">✅ Bien vu ! C'était l'intrus (+6 XP)<br><em>${esc(current.intrus.mot)} = ${esc(current.intrus.traduction)}</em></p>`,
        );
      } else {
        parler(current.intrus.mot, ctx.pack.language);
        rendu(
          `<p class="feedback ko">❌ Mauvais choix ! L'intrus était : <strong>${esc(current.intrus.mot)}</strong> (${esc(current.intrus.traduction)})</p>`,
        );
      }
      manche++;
      setTimeout(jouerManche, correct ? 1600 : 2800);
    }

    rendu();
  }

  function genererManche(vocab) {
    // 1. Essayer par thèmes
    const themes = {};
    vocab.forEach((v) => {
      const t = v.theme || "Général";
      if (!themes[t]) themes[t] = [];
      themes[t].push(v);
    });

    const clesValides = Object.keys(themes).filter(
      (k) => themes[k].length >= 3,
    );
    if (clesValides.length >= 1 && Object.keys(themes).length >= 2) {
      const themeT1 = sample(clesValides, 1)[0];
      const rest = Object.keys(themes).filter((k) => k !== themeT1);
      const themeT2 = sample(rest, 1)[0];

      return {
        correct: sample(themes[themeT1], 3),
        intrus: sample(themes[themeT2], 1)[0],
        indice: `Trouve le mot qui ne correspond pas au thème : « ${themeT1} »`,
      };
    }

    // 2. Essayer par longueur de mots
    const courts = vocab.filter((v) => v.mot.length <= 6);
    const longs = vocab.filter((v) => v.mot.length >= 9);
    if (courts.length >= 3 && longs.length >= 1) {
      return {
        correct: sample(courts, 3),
        intrus: sample(longs, 1)[0],
        indice: "Cherche l'intrus dans la longueur des mots",
      };
    } else if (longs.length >= 3 && courts.length >= 1) {
      return {
        correct: sample(longs, 3),
        intrus: sample(courts, 1)[0],
        indice: "Cherche l'intrus dans la longueur des mots",
      };
    }

    // 3. Fallback absolu : 3 mots aléatoires et 1 intrus
    const pool = [...vocab];
    const correct = sample(pool, 3);
    const restant = pool.filter((x) => !correct.includes(x));
    const intrus = sample(restant.length ? restant : pool, 1)[0];
    return {
      correct,
      intrus,
      indice: "Trouve le mot singulier parmi ces options",
    };
  }

  jouerManche();
}
