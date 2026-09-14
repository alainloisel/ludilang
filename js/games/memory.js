// Memory : retrouver les paires mot ↔ traduction.

import { sample, shuffle, esc, similarity, motTranscrit } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "memory",
  nom: "Memory",
  emoji: "🧠",
  desc: "Retrouve les paires mot / traduction en un minimum de coups.",
};

const NB_PAIRES = 8;

export function start(container, ctx) {
  const paires = sample(
    ctx.pack.vocab,
    Math.min(NB_PAIRES, ctx.pack.vocab.length),
  );
  const cartes = shuffle(
    paires.flatMap((v) => [
      { id: v.id, texte: v.mot, pinyin: v.pinyin, type: "mot" },
      { id: v.id, texte: v.traduction, type: "trad" },
    ]),
  );
  let premiere = null,
    verrou = false,
    coups = 0,
    trouvees = 0;

  container.innerHTML = `
    <div class="jeu-entete">
      <span class="compteur" id="score-memory">Coups : 0</span>
      ${microDisponible() ? `<button class="btn-micro-small" id="micro-memory" title="Parler pour retourner une carte" style="margin: 0 10px;">🎤</button>` : ""}
      <span class="compteur">Paires : <span id="paires-trouvees">0</span> / ${paires.length}</span>
    </div>
    <div class="grille-memory">
      ${cartes
        .map(
          (c, idx) => `
        <button class="carte-memory" data-idx="${idx}">
          <span class="face-cachee">❓</span>
          <span class="face-texte">${motTranscrit(c.texte, c.pinyin)}</span>
        </button>`,
        )
        .join("")}
    </div>
    <div id="feedback-micro" style="text-align: center; min-height: 24px; margin-top: 10px;"></div>`;

  const btnMic = container.querySelector("#micro-memory");
  if (btnMic) {
    btnMic.onclick = async () => {
      if (verrou) return;
      btnMic.classList.add("actif");
      try {
        const alts = await ecouter(ctx.pack.language);
        let bestIdx = -1;
        let bestSim = 0;

        cartes.forEach((c, idx) => {
          const btn = container.querySelector(
            `.carte-memory[data-idx="${idx}"]`,
          );
          if (
            btn.classList.contains("visible") ||
            btn.classList.contains("trouvee")
          )
            return;
          for (const alt of alts) {
            const sim = similarity(c.texte.toLowerCase(), alt.toLowerCase());
            if (sim > bestSim) {
              bestSim = sim;
              bestIdx = idx;
            }
          }
        });

        if (bestSim < 0.75) {
          try {
            const altsFr = await ecouter("fr-FR");
            cartes.forEach((c, idx) => {
              const btn = container.querySelector(
                `.carte-memory[data-idx="${idx}"]`,
              );
              if (
                btn.classList.contains("visible") ||
                btn.classList.contains("trouvee")
              )
                return;
              for (const alt of altsFr) {
                const sim = similarity(
                  c.texte.toLowerCase(),
                  alt.toLowerCase(),
                );
                if (sim > bestSim) {
                  bestSim = sim;
                  bestIdx = idx;
                }
              }
            });
          } catch (eFr) {
            // ignore if French fails or cancelled
          }
        }

        if (bestIdx !== -1 && bestSim >= 0.75) {
          const targetBtn = container.querySelector(
            `.carte-memory[data-idx="${bestIdx}"]`,
          );
          if (targetBtn) targetBtn.click();
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

  container.querySelectorAll(".carte-memory").forEach((btn) => {
    btn.onclick = () => {
      if (
        verrou ||
        btn.classList.contains("visible") ||
        btn.classList.contains("trouvee")
      )
        return;
      const c = cartes[btn.dataset.idx];
      btn.classList.add("visible");
      if (c.type === "mot") parler(c.texte, ctx.pack.language);

      if (!premiere) {
        premiere = { btn, c };
        return;
      }
      coups++;
      container.querySelector("#score-memory").textContent = "Coups : " + coups;
      const ok = premiere.c.id === c.id && premiere.c.type !== c.type;
      if (ok) {
        btn.classList.add("trouvee");
        premiere.btn.classList.add("trouvee");
        premiere = null;
        trouvees++;
        container.querySelector("#paires-trouvees").textContent = trouvees;
        if (trouvees === paires.length) fin();
      } else {
        verrou = true;
        const p = premiere;
        premiere = null;
        setTimeout(() => {
          btn.classList.remove("visible");
          p.btn.classList.remove("visible");
          verrou = false;
        }, 900);
      }
    };
  });

  function fin() {
    const coupsParfaits = paires.length;
    const bonus = Math.max(0, coupsParfaits + 6 - coups) * 2; // efficacité
    const xp = paires.length * 3 + bonus;
    setTimeout(
      () =>
        ctx.finPartie({
          jeu: meta.id,
          xp,
          bonnes: paires.length,
          reponses: paires.length,
          message: `Toutes les paires en ${coups} coups !${bonus ? " Bonus efficacité +" + bonus + " XP" : ""}`,
        }),
      700,
    );
  }
}
