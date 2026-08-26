// Textes à trous : les exercices de grammaire du cours, avec la leçon
// affichable et une aide progressive.

import { esc, normalize, shuffle } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "trous",
  nom: "Textes à trous",
  emoji: "✏️",
  desc: "Complète les phrases et révise les règles de grammaire.",
};

export function start(container, ctx) {
  const points = (ctx.pack.grammar || []).filter((g) =>
    (g.exercices || []).some((e) => e.type === "trous"),
  );
  if (!points.length) {
    container.innerHTML = `<div class="centre"><p class="gros-emoji">🤷</p>
      <h2>Pas d'exercice à trous dans ce pack</h2>
      <p>Importe un cours avec des points de grammaire pour jouer ici.</p></div>`;
    return;
  }

  // Choix du point de grammaire à travailler.
  container.innerHTML = `
    <h2 class="question">Quel point de grammaire veux-tu travailler ?</h2>
    <div class="liste-points">
      ${points
        .map(
          (g, idx) => `
        <button class="btn point-grammaire" data-idx="${idx}">
          <strong>${esc(g.titre)}</strong>
          <span>${(g.exercices || []).filter((e) => e.type === "trous").length} exercices</span>
        </button>`,
        )
        .join("")}
    </div>`;
  container.querySelectorAll(".point-grammaire").forEach((b) => {
    b.onclick = () => jouer(points[b.dataset.idx]);
  });

  function jouer(g) {
    const exos = shuffle((g.exercices || []).filter((e) => e.type === "trous"));
    let i = 0,
      bonnes = 0,
      xp = 0;

    function suivante() {
      if (i >= exos.length) {
        ctx.finPartie({
          jeu: meta.id,
          xp,
          bonnes,
          reponses: exos.length,
          message: `${bonnes} / ${exos.length} sur « ${g.titre} »`,
        });
        return;
      }
      const ex = exos[i];
      let aideUtilisee = false;

      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(i / exos.length) * 100}%"></div></div>
          <span class="compteur">${i + 1} / ${exos.length}</span>
        </div>
        <details class="lecon">
          <summary>📚 ${esc(g.titre)} — revoir la règle</summary>
          <p>${esc(g.explication || "")}</p>
          ${(g.exemples || []).map((e) => `<p class="carte-exemple">• ${esc(e)}</p>`).join("")}
        </details>
        <p class="phrase-trou">${esc(ex.phrase).replace(/_{2,}/, `<span class="trou">___</span>`)}</p>
        <div class="ligne-saisie">
          <input type="text" id="saisie" autocomplete="off" autocapitalize="off" spellcheck="false"
                 placeholder="Ta réponse…" />
          ${microDisponible() ? `<button class="btn-micro-small" id="micro-trous" title="Parler la réponse">🎤</button>` : ""}
          <button class="btn btn-primary" id="valider">OK</button>
        </div>
        <div class="carte-boutons">
          <button class="btn btn-ghost" id="aide">💡 Indice</button>
        </div>
        <div id="feedback"></div>`;

      const saisie = container.querySelector("#saisie");
      saisie.focus();
      saisie.onkeydown = (e) => {
        if (e.key === "Enter") valider();
      };
      container.querySelector("#valider").onclick = valider;
      container.querySelector("#aide").onclick = () => {
        aideUtilisee = true;
        saisie.placeholder = "Ça commence par « " + ex.reponse[0] + " »…";
        saisie.focus();
      };

      const btnMic = container.querySelector("#micro-trous");
      if (btnMic) {
        btnMic.onclick = async () => {
          btnMic.classList.add("actif");
          try {
            const alts = await ecouter(ctx.pack.language);
            if (alts && alts.length) {
              let bestAlt = alts[0];
              for (const alt of alts) {
                if (normalize(alt) === normalize(ex.reponse)) {
                  bestAlt = alt;
                  break;
                }
              }
              saisie.value = bestAlt;
              valider();
            }
          } catch (err) {
            console.error(err);
          } finally {
            btnMic.classList.remove("actif");
          }
        };
      }

      function valider() {
        const ok = normalize(saisie.value) === normalize(ex.reponse);
        const fb = container.querySelector("#feedback");
        if (ok) {
          bonnes++;
          xp += aideUtilisee ? 3 : 5;
          fb.innerHTML = `<p class="feedback ok">✅ Exact ! ${aideUtilisee ? "+3" : "+5"} XP</p>`;
          const complete = ex.phrase
            .replace(/_{2,}/, ex.reponse)
            .replace(/\s*\([^)]*\)\s*$/, "");
          parler(complete, ctx.pack.language);
          i++;
          setTimeout(suivante, 1400);
        } else {
          fb.innerHTML = `<p class="feedback ko">❌ Non… La réponse était : <strong>${esc(ex.reponse)}</strong></p>`;
          i++;
          setTimeout(suivante, 2200);
        }
      }
    }
    suivante();
  }
}
