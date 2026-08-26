// Jeu : L'Inspecteur (Error Finder / Proofreader)
// Identifier le mot incorrect dans une phrase du cours, puis fournir sa correction (clavier ou voix).

import { sample, esc, normalize, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "detective",
  nom: "L'Inspecteur",
  emoji: "🕵️",
  desc: "Trouve la faute cachée dans la phrase et corrige-la. Ouvre l'œil !",
};

const NB_ITEMS = 5;

export function start(container, ctx) {
  const phrases = ctx.pack.phrases || [];
  const vocab = ctx.pack.vocab || [];

  // Collecter les phrases sources (priorité phrases du cours, sinon vocabulaire mis en exemple)
  const sources =
    phrases.length >= NB_ITEMS
      ? phrases.map((p) => ({ texte: p.texte, traduction: p.traduction }))
      : [
          ...phrases,
          ...vocab
            .filter((v) => v.exemple)
            .map((v) => ({ texte: v.exemple, traduction: v.traduction })),
        ];

  if (sources.length < NB_ITEMS) {
    // Si on a très peu de contenu, on duplique ou complète avec le vocabulaire brut
    while (sources.length < NB_ITEMS) {
      const v = sample(vocab, 1)[0];
      if (v) sources.push({ texte: `${v.mot}.`, traduction: v.traduction });
      else break;
    }
  }

  let index = 0,
    bonnes = 0,
    xp = 0;
  const manches = [];

  // Création des manches avec erreurs
  for (const src of sources) {
    const q = preparerPhrase(src.texte, src.traduction, ctx.pack.language);
    if (q) manches.push(q);
    if (manches.length >= NB_ITEMS) break;
  }

  function preparerPhrase(texte, traduction, langue) {
    // Nettoyer la phrase en gardant la ponctuation séparée si possible
    const motsOrig = texte.split(/\s+/);
    const candidats = [];

    motsOrig.forEach((m, idx) => {
      // Nettoyer le mot de sa ponctuation pour tester l'altération
      const cleanMot = m.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
      if (cleanMot.length > 3) {
        candidats.push({ idx, mot: cleanMot });
      }
    });

    if (!candidats.length) return null;

    // Sélectionner un candidat au hasard et créer une erreur
    const cand = sample(candidats, 1)[0];
    const motAltere = alternerMot(cand.mot, langue);

    if (!motAltere) return null;

    // Remplacer dans la phrase d'origine en préservant la ponctuation
    const motsAvecErreur = [...motsOrig];
    motsAvecErreur[cand.idx] = motsOrig[cand.idx].replace(cand.mot, motAltere);

    return {
      phraseOriginale: texte,
      phraseErreur: motsAvecErreur.join(" "),
      mots: motsAvecErreur,
      motIncorrectIndex: cand.idx,
      correctWord: cand.mot,
      wrongWord: motAltere,
      traduction,
    };
  }

  function alternerMot(mot, langue) {
    if (mot.length <= 3) return null;

    // Règle 1 : Casse des noms communs en allemand
    if (
      langue === "de" &&
      /^[A-Z]/.test(mot) &&
      mot !== mot.toUpperCase() &&
      Math.random() < 0.4
    ) {
      return mot.charAt(0).toLowerCase() + mot.slice(1);
    }
    // Règle 2 : Suppression d'une double lettre
    if (/(.)\1/.test(mot) && Math.random() < 0.5) {
      return mot.replace(/(.)\1/, "$1");
    }
    // Règle 3 : H aspiré silencieux en allemand (wohnen -> wonen)
    if (
      langue === "de" &&
      mot.includes("h") &&
      !mot.startsWith("h") &&
      Math.random() < 0.5
    ) {
      return mot.replace("h", "");
    }
    // Règle 4 : Substitution courante (th -> d ou ß -> ss)
    if (langue === "en" && mot.includes("th") && Math.random() < 0.5) {
      return mot.replace("th", "d");
    }
    if (langue === "de" && mot.includes("ß")) {
      return mot.replace("ß", "ss");
    }

    // Règle 5 : Inversion de 2 caractères au milieu
    const arr = mot.split("");
    const i = Math.floor(Math.random() * (mot.length - 2)) + 1;
    const temp = arr[i];
    arr[i] = arr[i + 1];
    arr[i + 1] = temp;
    const wrong = arr.join("");
    if (wrong !== mot) return wrong;

    return null;
  }

  function jouerManche() {
    if (index >= manches.length) {
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: manches.length,
        message: `${bonnes} faute${bonnes > 1 ? "s" : ""} identifiée${bonnes > 1 ? "s" : ""} et corrigée${bonnes > 1 ? "s" : ""} !`,
      });
      return;
    }

    const q = manches[index];
    let motCliqueIndex = -1;
    let resolu = false;

    function rendu(feedback = "") {
      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(index / manches.length) * 100}%"></div></div>
          <span class="compteur">Enquête ${index + 1} / ${manches.length}</span>
        </div>
        <p class="indice" style="margin-bottom: 8px;">💡 Traduction : <strong>${esc(q.traduction)}</strong></p>
        <p style="text-align: center; color: var(--texte-2); font-size: 0.9rem; margin-bottom: 12px;">
          ${motCliqueIndex === -1 ? "Étape 1 : Clique sur le mot qui contient une faute" : "Étape 2 : Écris ou parle pour corriger la faute"}
        </p>

        <div class="zone-phrase-detective" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 18px 0; font-size: 1.25rem; font-weight: 700;">
          ${q.mots
            .map((m, idx) => {
              const estClique = idx === motCliqueIndex;
              const estFauxEtTrouve = estClique && idx === q.motIncorrectIndex;
              let style =
                "background: var(--carte); border: 1px solid rgba(255,255,255,0.12); cursor: pointer;";
              if (estFauxEtTrouve)
                style =
                  "background: rgba(248, 113, 113, 0.25); border-color: var(--rouge); color: var(--rouge); cursor: default;";
              else if (estClique)
                style =
                  "background: var(--carte-claire); border-color: var(--texte-2); cursor: pointer;";

              return `<button class="chip word-chip" data-idx="${idx}" style="${style} padding: 8px 12px; border-radius: 12px; font: inherit;">${esc(m)}</button>`;
            })
            .join("")}
        </div>

        <div id="correction-panel" ${motCliqueIndex === q.motIncorrectIndex ? "" : "hidden"} style="margin-top: 18px; display: flex; flex-direction: column; align-items: center; gap: 12px;">
          <div class="ligne-saisie" style="width: 100%; max-width: 400px; display: flex; gap: 10px;">
            <input type="text" id="saisie-correction" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Mot corrigé en ${ctx.pack.language === "de" ? "allemand" : "anglais"}…" style="flex: 1;" />
            ${microDisponible() ? `<button class="btn-micro-small" id="micro-detective" title="Corriger de vive voix">🎤</button>` : ""}
            <button class="btn btn-primary" id="valider-correction">OK</button>
          </div>
        </div>
        <div id="feedback" style="margin-top: 12px;">${feedback}</div>`;

      // Clics sur les mots
      container.querySelectorAll(".word-chip").forEach((b) => {
        b.onclick = () => {
          if (resolu) return;
          const idx = parseInt(b.dataset.idx);
          if (idx === q.motIncorrectIndex) {
            motCliqueIndex = idx;
            rendu();
            const input = container.querySelector("#saisie-correction");
            if (input) {
              input.focus();
              input.onkeydown = (e) => {
                if (e.key === "Enter") validerCorrection(input.value);
              };
            }
            const validerBtn = container.querySelector("#valider-correction");
            if (validerBtn)
              validerBtn.onclick = () => validerCorrection(input.value);

            const btnMic = container.querySelector("#micro-detective");
            if (btnMic) {
              btnMic.onclick = async () => {
                btnMic.classList.add("actif");
                try {
                  const alts = await ecouter(ctx.pack.language);
                  if (alts && alts.length) {
                    let bestAlt = alts[0];
                    for (const alt of alts) {
                      if (normalize(alt) === normalize(q.correctWord)) {
                        bestAlt = alt;
                        break;
                      }
                    }
                    input.value = bestAlt;
                    validerCorrection(bestAlt);
                  }
                } catch (err) {
                  console.error(err);
                } finally {
                  btnMic.classList.remove("actif");
                }
              };
            }
          } else {
            // Mauvais mot cliqué
            b.style.animation = "secousse 0.35s";
            setTimeout(() => (b.style.animation = ""), 400);
            const fb = container.querySelector("#feedback");
            fb.innerHTML = `<p class="feedback ko" style="padding: 6px 12px; font-size: 0.9em; margin-top:5px;">Ce mot n'a pas de faute. Cherche encore !</p>`;
          }
        };
      });
    }

    function validerCorrection(correction) {
      if (resolu) return;

      const ok = normalize(correction) === normalize(q.correctWord);
      resolu = true;

      const panel = container.querySelector("#correction-panel");
      if (panel) panel.hidden = true;

      if (ok) {
        bonnes++;
        xp += 8;
        parler(q.phraseOriginale, ctx.pack.language);
        rendu(
          `<p class="feedback ok">✅ Exact ! Tu as bien corrigé : <strong>${esc(q.correctWord)}</strong> (+8 XP)<br><em>${esc(q.phraseOriginale)}</em></p>`,
        );
      } else {
        parler(q.phraseOriginale, ctx.pack.language);
        rendu(
          `<p class="feedback ko">❌ Non. La correction correcte était : <strong>${esc(q.correctWord)}</strong><br>La phrase était : <em>${esc(q.phraseOriginale)}</em></p>`,
        );
      }

      index++;
      setTimeout(jouerManche, ok ? 2000 : 3800);
    }

    rendu();
  }

  jouerManche();
}
