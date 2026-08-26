// Jeu : L'Oreille Attentive (Minimal Pairs)
// Entraîner l'écoute en discriminant deux mots phonétiquement très proches.

import { sample, esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "oreille",
  nom: "L'Oreille Attentive",
  emoji: "👂",
  desc: "Écoute bien et retrouve le mot exact parmi des sons très proches.",
};

const PAIRES = {
  en: [
    { motA: "ship", motB: "sheep", transA: "navire", transB: "mouton" },
    { motA: "bad", motB: "bed", transA: "mauvais", transB: "lit" },
    { motA: "angry", motB: "hungry", transA: "en colère", transB: "affamé" },
    { motA: "work", motB: "walk", transA: "travailler", transB: "marcher" },
    { motA: "three", motB: "tree", transA: "trois", transB: "arbre" },
    { motA: "fit", motB: "feet", transA: "en forme", transB: "pieds" },
    { motA: "pen", motB: "pan", transA: "stylo", transB: "poêle" },
    { motA: "live", motB: "leave", transA: "vivre", transB: "quitter" },
  ],
  de: [
    { motA: "schon", motB: "schön", transA: "déjà", transB: "beau/joli" },
    { motA: "vier", motB: "für", transA: "quatre", transB: "pour" },
    { motA: "kann", motB: "kamm", transA: "peut", transB: "peigne" },
    {
      motA: "bitten",
      motB: "bieten",
      transA: "demander/prier",
      transB: "offrir",
    },
    { motA: "älter", motB: "eltern", transA: "plus âgé", transB: "parents" },
    { motA: "hauen", motB: "bauen", transA: "frapper", transB: "construire" },
    { motA: "lesen", motB: "lösen", transA: "lire", transB: "résoudre" },
    {
      motA: "singen",
      motB: "sinken",
      transA: "chanter",
      transB: "couler/baisser",
    },
  ],
};

const NB_MANCHES = 6;

export function start(container, ctx) {
  const lang = ctx.pack.language === "de" ? "de" : "en";
  const pool = PAIRES[lang];
  const items = sample(pool, Math.min(NB_MANCHES, pool.length));
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
        message: `${bonnes} son${bonnes > 1 ? "s" : ""} correctement identifié${bonnes > 1 ? "s" : ""} sur ${items.length} !`,
      });
      return;
    }

    const current = items[index];
    // Choisir de lire motA ou motB
    const choixA = Math.random() < 0.5;
    const cibleMot = choixA ? current.motA : current.motB;
    const cibleTrans = choixA ? current.transA : current.transB;
    let repondu = false;

    function rendu(feedback = "") {
      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(index / items.length) * 100}%"></div></div>
          ${microDisponible() ? `<button class="btn-micro-small" id="micro-oreille" title="Prononcer le mot entendu" style="margin: 0 10px;">🎤</button>` : ""}
          <span class="compteur">Écoute ${index + 1} / ${items.length}</span>
        </div>

        <div class="centre" style="margin: 20px 0;">
          <p style="font-size: 1.05rem; color: var(--texte-2); margin-bottom: 12px;">Appuie sur le haut-parleur pour écouter le mot mystère :</p>
          <button class="btn-son" id="rejouer-oreille" style="width: 72px; height: 72px; font-size: 2.2rem; display: inline-flex; align-items: center; justify-content: center; box-shadow: var(--ombre);">🔊</button>
        </div>

        <div class="carte-boutons" style="display: flex; gap: 16px; justify-content: center; margin: 20px 0;">
          <button class="btn option-oreille" data-val="${esc(current.motA)}" style="flex: 1; padding: 18px 12px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <strong style="font-size: 1.3rem; color: var(--cyan);">${esc(current.motA)}</strong>
            <span style="font-size: 0.75rem; color: var(--texte-2); font-weight: normal;">(${esc(current.transA)})</span>
          </button>

          <button class="btn option-oreille" data-val="${esc(current.motB)}" style="flex: 1; padding: 18px 12px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <strong style="font-size: 1.3rem; color: var(--rose);">${esc(current.motB)}</strong>
            <span style="font-size: 0.75rem; color: var(--texte-2); font-weight: normal;">(${esc(current.transB)})</span>
          </button>
        </div>
        <div id="feedback" style="text-align: center; min-height: 24px;">${feedback}</div>`;

      container.querySelector("#rejouer-oreille").onclick = () =>
        parler(cibleMot, ctx.pack.language);

      container.querySelectorAll(".option-oreille").forEach((b) => {
        b.onclick = () => valider(b.dataset.val);
      });

      const btnMic = container.querySelector("#micro-oreille");
      if (btnMic) {
        btnMic.onclick = async () => {
          if (repondu) return;
          btnMic.classList.add("actif");
          try {
            const alts = await ecouter(ctx.pack.language);
            let bestVal = null;
            let bestSim = 0;

            const options = [current.motA, current.motB];
            for (const opt of options) {
              for (const alt of alts) {
                const sim = similarity(opt.toLowerCase(), alt.toLowerCase());
                if (sim > bestSim) {
                  bestSim = sim;
                  bestVal = opt;
                }
              }
            }
            if (bestVal && bestSim >= 0.75) {
              valider(bestVal);
            } else {
              rendu(
                `<p class="feedback ko" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9em;">J'ai entendu : « ${esc(alts[0] || "")} ». Réessaie !</p>`,
              );
            }
          } catch (err) {
            console.error(err);
          } finally {
            btnMic.classList.remove("actif");
          }
        };
      }
    }

    function valider(reponse) {
      if (repondu) return;
      repondu = true;
      const ok = reponse === cibleMot;

      container.querySelectorAll(".option-oreille").forEach((b) => {
        if (b.dataset.val === cibleMot) {
          b.style.background = "rgba(52, 211, 153, 0.25)";
          b.style.borderColor = "var(--vert)";
        } else if (b.dataset.val === reponse) {
          b.style.background = "rgba(248, 113, 113, 0.25)";
          b.style.borderColor = "var(--rouge)";
        }
        b.disabled = true;
      });

      const fb = container.querySelector("#feedback");
      if (ok) {
        bonnes++;
        xp += 6;
        parler(cibleMot, ctx.pack.language);
        fb.innerHTML = `<p class="feedback ok">✅ Exact ! Tu as bien reconnu : <strong>${esc(cibleMot)}</strong> (+6 XP)<br><em>Signification : ${esc(cibleTrans)}</em></p>`;
      } else {
        parler(cibleMot, ctx.pack.language);
        fb.innerHTML = `<p class="feedback ko">❌ Mauvaise pioche ! C'était : <strong>${esc(cibleMot)}</strong> (${esc(cibleTrans)})</p>`;
      }

      index++;
      setTimeout(suivante, ok ? 1800 : 3400);
    }

    rendu();
    // Jouer le mot automatiquement à l'affichage
    setTimeout(() => {
      if (!repondu) parler(cibleMot, ctx.pack.language);
    }, 450);
  }

  suivante();
}
