// Jeu : Le Constructeur de Phrases (Syntax Architect)
// Réordonner les mots pour respecter une règle ou consigne grammaticale spécifique.

import { shuffle, sample, esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "syntaxe",
  nom: "Le Constructeur",
  emoji: "🏗️",
  desc: "Assemble les mots dans le bon ordre en respectant la consigne grammaticale !",
};

const EXERCICES = {
  en: [
    {
      titre: "Adverbe de fréquence",
      consigne:
        "Place l'adverbe de fréquence (always) avant le verbe principal.",
      mots: ["I", "always", "learn", "my", "lessons"],
      solution: "I always learn my lessons",
    },
    {
      titre: "Présent continu",
      consigne: "Structure : Sujet + be au présent + Verbe-ING.",
      mots: ["She", "is", "listening", "to", "music"],
      solution: "She is listening to music",
    },
    {
      titre: "Structure interrogative",
      consigne: "Structure de question : Auxiliaire + Sujet + Verbe + reste.",
      mots: ["Do", "you", "speak", "English", "?"],
      solution: "Do you speak English ?",
    },
    {
      titre: "Comparatif de supériorité",
      consigne: "Adjectif court + terminaison '-er' + than.",
      mots: ["The", "dog", "is", "bigger", "than", "the", "cat"],
      solution: "The dog is bigger than the cat",
    },
  ],
  de: [
    {
      titre: "Inversion après complément",
      consigne:
        "Si la phrase commence par 'Heute', le sujet passe immédiatement après le verbe conjugué.",
      mots: ["Heute", "lerne", "ich", "Deutsch"],
      solution: "Heute lerne ich Deutsch",
    },
    {
      titre: "Subordonnée avec 'weil'",
      consigne:
        "Dans une subordonnée avec 'weil', le verbe conjugué (bin) se place tout à la fin.",
      mots: ["weil", "ich", "heute", "müde", "bin"],
      solution: "weil ich heute müde bin",
    },
    {
      titre: "Verbe modal",
      consigne:
        "Le verbe à l'infinitif (spielen) se place tout à la fin après le verbe modal (kann).",
      mots: ["Ich", "kann", "gut", "Fußball", "spielen"],
      solution: "Ich kann gut Fußball spielen",
    },
    {
      titre: "Ordre Temps avant Lieu",
      consigne:
        "Règle TE-KA-MO-LO : le complément de temps (am Wochenende) se place avant le lieu (in Paris).",
      mots: ["Ich", "spiele", "am", "Wochenende", "in", "Paris"],
      solution: "Ich spiele am Wochenende in Paris",
    },
  ],
};

const NB_MANCHES = 4;

export function start(container, ctx) {
  const lang = ctx.pack.language === "de" ? "de" : "en";
  const pool = EXERCICES[lang];
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
        message: `${bonnes} règle${bonnes > 1 ? "s" : ""} de syntaxe validée${bonnes > 1 ? "s" : ""} sur ${items.length} !`,
      });
      return;
    }

    const item = items[index];
    const cible = item.solution;
    let essais = 0;

    // Mélange des jetons
    let melange = shuffle(item.mots.map((m, idx) => ({ m, idx })));
    // Éviter de donner la solution directement
    if (item.mots.length > 1) {
      while (melange.map((x) => x.m).join(" ") === cible)
        melange = shuffle(melange);
    }

    let reponse = []; // ordre des jetons choisis

    function rendu(feedback = "") {
      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(index / items.length) * 100}%"></div></div>
          ${microDisponible() ? `<button class="btn-micro-small" id="micro-syntaxe" title="Parler la phrase entière" style="margin: 0 10px;">🎤</button>` : ""}
          <span class="compteur">Règle ${index + 1} / ${items.length}</span>
        </div>

        <div class="carte-info" style="margin-bottom: 14px; padding: 12px; background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.25);">
          <h3 style="color: var(--cyan); font-size: 1.05rem; font-weight: 800; margin-bottom: 4px;">🏗️ ${esc(item.titre)}</h3>
          <p style="font-size: 0.9rem; line-height: 1.4;">${esc(item.consigne)}</p>
        </div>

        <div class="zone-reponse" id="zone-syntaxe" style="min-height: 60px; background: rgba(255,255,255,0.04); border: 2px dashed rgba(255,255,255,0.18); border-radius: 12px; padding: 10px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 12px;">
          ${reponse.map((x, ri) => `<button class="chip choisie" data-ri="${ri}" style="font-size: 0.95rem;">${esc(x.m)}</button>`).join("") || `<span class="zone-vide">Touche les mots ci-dessous pour ordonner…</span>`}
        </div>

        <div class="zone-mots" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 18px;">
          ${melange.map((x, mi) => (reponse.includes(x) ? "" : `<button class="chip" data-mi="${mi}" style="font-size: 0.95rem;">${esc(x.m)}</button>`)).join("")}
        </div>

        ${feedback}
        <div class="carte-boutons">
          <button class="btn btn-primary" id="verifier-syntaxe" ${reponse.length === item.mots.length ? "" : "disabled"}>Vérifier</button>
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
      container.querySelector("#verifier-syntaxe").onclick = verifier;

      const btnMic = container.querySelector("#micro-syntaxe");
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
      const ok =
        proposition.replace(/\s+\?/g, "?") === cible.replace(/\s+\?/g, "?");

      if (ok) {
        if (essais === 1) {
          bonnes++;
          xp += 8;
        } else {
          xp += 4;
        }
        parler(cible, ctx.pack.language);
        rendu(
          `<p class="feedback ok">✅ Parfait ! ${essais === 1 ? "+8 XP" : "+4 XP"}<br><em>${esc(cible)}</em></p>`,
        );
        container.querySelector("#verifier-syntaxe").disabled = true;
        index++;
        setTimeout(suivante, 1800);
      } else if (essais >= 2) {
        parler(cible, ctx.pack.language);
        rendu(
          `<p class="feedback ko">❌ Non. La bonne structure était :<br><strong>${esc(cible)}</strong></p>`,
        );
        container.querySelector("#verifier-syntaxe").disabled = true;
        index++;
        setTimeout(suivante, 3400);
      } else {
        rendu(
          `<p class="feedback ko">❌ Ce n'est pas tout à fait ça… essaie encore !</p>`,
        );
      }
    }

    rendu();
  }

  suivante();
}
