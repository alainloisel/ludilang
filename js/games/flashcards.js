import { cartesDues, noter } from "../srs.js";
import { parler, ecouter, microDisponible } from "../speech.js";
import { esc, el, sample, similarity, motTranscrit } from "../utils.js";

export const meta = {
  id: "flashcards",
  nom: "Cartes flash",
  emoji: "🃏",
  desc: "Mémorise ton vocabulaire, les cartes reviennent au bon moment.",
};

export function start(container, ctx) {
  let cartes = cartesDues(ctx.pack.vocab, ctx.progress, 12);
  let revisionLibre = false;
  if (!cartes.length) {
    // Tout est à jour : proposer une révision libre quand même.
    container.innerHTML = "";
    const msg = el(`
      <div class="centre">
        <p class="gros-emoji">🎉</p>
        <h2>Tout est révisé pour aujourd'hui !</h2>
        <p>Tes cartes reviendront quand il sera temps de les revoir.</p>
        <button class="btn btn-primary">Réviser quand même</button>
      </div>`);
    msg.querySelector("button").onclick = () => {
      cartes = sample(ctx.pack.vocab, 12);
      revisionLibre = true;
      jouer();
    };
    container.appendChild(msg);
    return;
  }
  jouer();

  function jouer() {
    let i = 0,
      bonnes = 0,
      xp = 0;

    function afficher() {
      if (i >= cartes.length) {
        ctx.finPartie({
          jeu: meta.id,
          xp,
          bonnes,
          reponses: cartes.length,
          message: `${bonnes} carte${bonnes > 1 ? "s" : ""} sur ${cartes.length} connue${bonnes > 1 ? "s" : ""} !`,
        });
        return;
      }
      const v = cartes[i];
      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(i / cartes.length) * 100}%"></div></div>
          <span class="compteur">${i + 1} / ${cartes.length}</span>
        </div>
        <div class="carte-flash" id="carte">
          <div class="carte-face carte-avant">
            <span class="theme-chip">${esc(v.theme || "")}</span>
            <p class="carte-mot">${motTranscrit(v.mot, v.pinyin)}</p>
            <div style="display: flex; gap: 10px; align-items: center;">
              <button class="btn-son" data-say="mot" title="Écouter">🔊</button>
              ${microDisponible() ? `<button class="btn-micro-small" id="micro-devine" title="Prononcer la traduction">🎤</button>` : ""}
            </div>
            <p class="carte-aide">Touche la carte pour voir la réponse ou clique sur le micro</p>
          </div>
          <div class="carte-face carte-arriere">
            <p class="carte-mot">${esc(v.traduction)}</p>
            ${v.exemple ? `<p class="carte-exemple">« ${esc(v.exemple)} » <button class="btn-son" data-say="exemple">🔊</button></p>` : ""}
          </div>
        </div>
        <div class="carte-boutons" id="boutons" hidden>
          <button class="btn btn-ko">❌ À revoir</button>
          ${microDisponible() ? `<button class="btn-micro-small" id="micro-reponse" title="Dire Oui ou Non">🎤</button>` : ""}
          <button class="btn btn-ok">✅ Je savais !</button>
        </div>
        <div id="feedback-micro" style="text-align: center; min-height: 24px; margin-top: 10px;"></div>`;

      const carte = container.querySelector("#carte");
      const boutons = container.querySelector("#boutons");
      container.querySelectorAll(".btn-son").forEach((b) => {
        b.onclick = (e) => {
          e.stopPropagation();
          parler(
            b.dataset.say === "exemple" ? v.exemple : v.mot,
            ctx.pack.language,
          );
        };
      });
      carte.onclick = () => {
        carte.classList.toggle("retournee");
        boutons.hidden = false;
      };
      boutons.querySelector(".btn-ok").onclick = () => repondre(true);
      boutons.querySelector(".btn-ko").onclick = () => repondre(false);

      const btnDevine = container.querySelector("#micro-devine");
      if (btnDevine) {
        btnDevine.onclick = async (e) => {
          e.stopPropagation();
          btnDevine.classList.add("actif");
          try {
            const alts = await ecouter("fr-FR");
            let correct = false;
            for (const alt of alts) {
              if (similarity(alt, v.traduction) >= 0.75) {
                correct = true;
                break;
              }
            }
            if (correct) {
              carte.classList.add("retournee");
              boutons.hidden = false;
              const fb = container.querySelector("#feedback-micro");
              fb.innerHTML = `<p class="feedback ok" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9em;">🎯 Bien deviné ! C'est « ${esc(v.traduction)} »</p>`;
            } else {
              const fb = container.querySelector("#feedback-micro");
              fb.innerHTML = `<p class="feedback ko" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9em;">J'ai entendu : « ${esc(alts[0] || "")} ». Réessaie !</p>`;
            }
          } catch (err) {
            console.error(err);
          } finally {
            btnDevine.classList.remove("actif");
          }
        };
      }

      const btnReponse = container.querySelector("#micro-reponse");
      if (btnReponse) {
        btnReponse.onclick = async (e) => {
          e.stopPropagation();
          btnReponse.classList.add("actif");
          try {
            const alts = await ecouter("fr-FR");
            let action = null;
            for (const alt of alts) {
              const text = alt.toLowerCase();
              if (
                text.includes("oui") ||
                text.includes("savais") ||
                text.includes("connu") ||
                text.includes("ok") ||
                text.includes("bien") ||
                text.includes("yes") ||
                text.includes("ja")
              ) {
                action = "ok";
                break;
              }
              if (
                text.includes("non") ||
                text.includes("revoir") ||
                text.includes("faux") ||
                text.includes("no") ||
                text.includes("nein")
              ) {
                action = "ko";
                break;
              }
            }
            if (action === "ok") {
              repondre(true);
            } else if (action === "ko") {
              repondre(false);
            } else {
              const fb = container.querySelector("#feedback-micro");
              fb.innerHTML = `<p class="feedback ko" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9em;">J'ai entendu : « ${esc(alts[0] || "")} ». Dis « oui » ou « non ».</p>`;
            }
          } catch (err) {
            console.error(err);
          } finally {
            btnReponse.classList.remove("actif");
          }
        };
      }

      function repondre(su) {
        if (!revisionLibre) {
          noter(ctx.progress, v.id, su);
          ctx.saveProgress();
        }
        if (su) {
          bonnes++;
          xp += 4;
          i++;
          afficher();
        } else {
          xp += 1;
          carte.classList.add("retournee");
          boutons.hidden = true;
          const fb = container.querySelector("#feedback-micro");
          fb.innerHTML = `<p class="feedback ko" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9em;">C'était : « ${esc(v.traduction)} »</p>`;
          setTimeout(() => {
            i++;
            afficher();
          }, 2000);
        }
      }
      // Petite aide : on entend le mot dès l'affichage.
      parler(v.mot, ctx.pack.language);
    }
    afficher();
  }
}
