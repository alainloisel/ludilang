// Phrases en désordre : remettre les mots dans le bon ordre
// (phrases du cours + exercices « ordre » de grammaire).

import { shuffle, sample, esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "ordre",
  nom: "Phrases en désordre",
  emoji: "🧩",
  desc: "Remets les mots dans le bon ordre pour reconstruire la phrase.",
};

const NB_PHRASES = 6;

function collecter(pack) {
  const items = [];
  for (const p of pack.phrases || []) {
    const mots = p.texte.split(/\s+/);
    if (mots.length >= 3) items.push({ mots, traduction: p.traduction });
  }
  for (const g of pack.grammar || []) {
    for (const ex of g.exercices || []) {
      if (ex.type === "ordre" && ex.mots?.length >= 3)
        items.push({ mots: ex.mots, point: g.titre });
    }
  }
  return items;
}

export function start(container, ctx) {
  const items = sample(collecter(ctx.pack), NB_PHRASES);
  let i = 0,
    bonnes = 0,
    xp = 0;

  function suivante() {
    if (i >= items.length) {
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: items.length,
        message: `${bonnes} phrase${bonnes > 1 ? "s" : ""} sur ${items.length} reconstruite${bonnes > 1 ? "s" : ""} !`,
      });
      return;
    }
    const item = items[i];
    const cible = item.mots.join(" ");
    let essais = 0;
    // On mélange jusqu'à obtenir un ordre différent de la solution.
    let melange = shuffle(item.mots.map((m, idx) => ({ m, idx })));
    if (item.mots.length > 1) {
      while (melange.map((x) => x.m).join(" ") === cible)
        melange = shuffle(melange);
    }
    let reponse = []; // éléments {m, idx} choisis dans l'ordre

    function rendu(feedback = "") {
      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(i / items.length) * 100}%"></div></div>
          ${microDisponible() ? `<button class="btn-micro-small" id="micro-ordre" title="Parler la phrase" style="margin: 0 10px;">🎤</button>` : ""}
          <span class="compteur">${i + 1} / ${items.length}</span>
        </div>
        ${item.point ? `<p class="theme-chip">${esc(item.point)}</p>` : ""}
        ${item.traduction ? `<p class="indice">💬 « ${esc(item.traduction)} »</p>` : `<p class="indice">Remets la phrase dans l'ordre :</p>`}
        <div class="zone-reponse" id="zone">
          ${reponse.map((x, ri) => `<button class="chip choisie" data-ri="${ri}">${esc(x.m)}</button>`).join("") || `<span class="zone-vide">Touche les mots ci-dessous…</span>`}
        </div>
        <div class="zone-mots">
          ${melange.map((x, mi) => (reponse.includes(x) ? "" : `<button class="chip" data-mi="${mi}">${esc(x.m)}</button>`)).join("")}
        </div>
        ${feedback}
        <div class="carte-boutons">
          <button class="btn" id="ecouter-btn" ${reponse.length === item.mots.length ? "" : "hidden"}>🔊 Écouter</button>
          <button class="btn btn-primary" id="verifier" ${reponse.length === item.mots.length ? "" : "disabled"}>Vérifier</button>
        </div>`;

      container.querySelectorAll(".zone-mots .chip").forEach((b) => {
        b.onclick = () => {
          reponse.push(melange[b.dataset.mi]);
          rendu();
        };
      });
      container.querySelectorAll(".zone-reponse .chip").forEach((b) => {
        b.onclick = () => {
          reponse.splice(b.dataset.ri, 1);
          rendu();
        };
      });
      const ecouterBtn = container.querySelector("#ecouter-btn");
      if (ecouterBtn)
        ecouterBtn.onclick = () =>
          parler(reponse.map((x) => x.m).join(" "), ctx.pack.language);
      container.querySelector("#verifier").onclick = verifier;

      const btnMic = container.querySelector("#micro-ordre");
      if (btnMic) {
        btnMic.onclick = async () => {
          btnMic.classList.add("actif");
          try {
            const alts = await ecouter(ctx.pack.language);
            let matched = false;
            for (const alt of alts) {
              const cleanAlt = alt
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();
              const cleanCible = cible
                .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .toLowerCase();
              if (
                cleanAlt === cleanCible ||
                similarity(cleanAlt, cleanCible) >= 0.8
              ) {
                // Order it automatically
                reponse = [...melange].sort((a, b) => a.idx - b.idx);
                matched = true;
                rendu();
                verifier();
                return;
              }
            }
            if (!matched) {
              rendu(
                `<p class="feedback ko" style="font-size: 0.95em;">J'ai entendu : « ${esc(alts[0] || "")} ». Réessaie !</p>`,
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

    function verifier() {
      essais++;
      const proposition = reponse.map((x) => x.m).join(" ");
      if (proposition === cible) {
        if (essais === 1) {
          bonnes++;
          xp += 6;
        } else {
          xp += 3;
        }
        parler(cible, ctx.pack.language);
        rendu(
          `<p class="feedback ok">✅ Bravo ! ${essais === 1 ? "+6 XP" : "+3 XP"}</p>`,
        );
        container.querySelector("#verifier").disabled = true;
        setTimeout(() => {
          i++;
          suivante();
        }, 1600);
      } else if (essais >= 2) {
        parler(cible, ctx.pack.language);
        rendu(
          `<p class="feedback ko">La bonne phrase était :<br><strong>${esc(cible)}</strong></p>`,
        );
        container.querySelector("#verifier").disabled = true;
        setTimeout(() => {
          i++;
          suivante();
        }, 2600);
      } else {
        rendu(`<p class="feedback ko">❌ Pas tout à fait… essaie encore !</p>`);
      }
    }

    rendu();
  }
  suivante();
}
