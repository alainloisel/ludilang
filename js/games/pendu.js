// Le pendu : deviner un mot du cours lettre par lettre.
// L'indice est la traduction française.

import { sample, esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";
import { noter } from "../srs.js";

export const meta = {
  id: "pendu",
  nom: "Le pendu",
  emoji: "🪢",
  desc: "Devine le mot lettre par lettre, l'indice est sa traduction.",
};

const VIES = 7;
const NB_MOTS = 3;

export function start(container, ctx) {
  const mots = sample(ctx.pack.vocab, NB_MOTS);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  if (ctx.pack.language === "de") alphabet.push("Ä", "Ö", "Ü", "ß");
  let manche = 0,
    gagnes = 0,
    xp = 0;

  function jouerManche() {
    if (manche >= mots.length) {
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes: gagnes,
        reponses: mots.length,
        message: `${gagnes} mot${gagnes > 1 ? "s" : ""} trouvé${gagnes > 1 ? "s" : ""} sur ${mots.length} !`,
      });
      return;
    }
    const v = mots[manche];
    const cible = v.mot.toUpperCase();
    const trouvees = new Set();
    let vies = VIES;
    const estLettre = (ch) => /[A-ZÄÖÜß]/.test(ch);

    function motAffiche() {
      return cible
        .split("")
        .map((ch) => {
          if (!estLettre(ch)) return ch === " " ? " " : ch;
          return trouvees.has(ch) ? ch : "_";
        })
        .join(" ");
    }

    function rendu() {
      container.innerHTML = `
        <div class="jeu-entete">
          <span class="compteur">Mot ${manche + 1} / ${mots.length}</span>
          ${microDisponible() ? `<button class="btn-micro-small" id="micro-pendu" title="Parler une lettre ou le mot entier" style="margin: 0 10px;">🎤</button>` : ""}
          <span class="vies">${"❤️".repeat(vies)}${"🖤".repeat(VIES - vies)}</span>
        </div>
        <p class="indice">💡 Indice : <strong>${esc(v.traduction)}</strong></p>
        <p class="mot-pendu" id="mot">${motAffiche()}</p>
        <div class="clavier">
          ${alphabet
            .map((l) => {
              const usee = trouvees.has(l) || viesPerduesPour(l);
              return `<button class="touche" data-l="${l}" ${usee ? "disabled" : ""}>${l}</button>`;
            })
            .join("")}
        </div>
        <div id="feedback-micro" style="text-align: center; min-height: 24px; margin-top: 10px;"></div>`;

      container.querySelectorAll(".touche").forEach((b) => {
        b.onclick = () => proposer(b.dataset.l);
      });

      const btnMic = container.querySelector("#micro-pendu");
      if (btnMic) {
        btnMic.onclick = async () => {
          btnMic.classList.add("actif");
          try {
            const alts = await ecouter(ctx.pack.language);
            let foundWord = false;
            for (const alt of alts) {
              const cleanAlt = alt.trim().toUpperCase();
              const cleanCible = cible.trim().toUpperCase();
              if (
                cleanAlt === cleanCible ||
                similarity(cleanAlt, cleanCible) >= 0.85
              ) {
                foundWord = true;
                break;
              }
            }
            if (foundWord) {
              finManche(true);
              return;
            }

            let letterFound = null;
            for (const alt of alts) {
              const txt = alt.trim().toUpperCase();
              if (txt.length === 1 && alphabet.includes(txt)) {
                letterFound = txt;
                break;
              }
            }

            if (!letterFound) {
              for (const alt of alts) {
                const char = alt.trim().charAt(0).toUpperCase();
                if (alphabet.includes(char)) {
                  letterFound = char;
                  break;
                }
              }
            }

            if (letterFound) {
              proposer(letterFound);
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
    }

    const essayees = new Set();
    function viesPerduesPour(l) {
      return essayees.has(l);
    }

    function proposer(lettre) {
      if (essayees.has(lettre) || trouvees.has(lettre)) return;
      if (cible.includes(lettre)) {
        trouvees.add(lettre);
        const complet = cible
          .split("")
          .every((ch) => !estLettre(ch) || trouvees.has(ch));
        if (complet) return finManche(true);
      } else {
        essayees.add(lettre);
        vies--;
        if (vies <= 0) return finManche(false);
      }
      rendu();
    }

    function finManche(gagne) {
      noter(ctx.progress, v.id, gagne);
      ctx.saveProgress();
      if (gagne) {
        gagnes++;
        xp += 8 + vies;
      } // bonus pour les vies restantes
      parler(v.mot, ctx.pack.language);
      container.innerHTML = `
        <div class="centre">
          <p class="gros-emoji">${gagne ? "🎉" : "😵"}</p>
          <h2>${gagne ? "Trouvé !" : "Perdu…"}</h2>
          <p class="carte-mot">${esc(v.mot)} <button class="btn-son" id="son">🔊</button></p>
          <p>${esc(v.traduction)}</p>
          ${v.exemple ? `<p class="carte-exemple">« ${esc(v.exemple)} »</p>` : ""}
          <button class="btn btn-primary" id="suite">${manche + 1 < mots.length ? "Mot suivant →" : "Voir le score"}</button>
        </div>`;
      container.querySelector("#son").onclick = () =>
        parler(v.mot, ctx.pack.language);
      container.querySelector("#suite").onclick = () => {
        manche++;
        jouerManche();
      };
    }

    rendu();
  }
  jouerManche();
}
