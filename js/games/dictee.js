// Dictée audio : le navigateur prononce, l'ado écrit.
// Tolérance aux petites fautes grâce au score de similarité.

import { sample, esc, normalize, similarity } from "../utils.js";
import { parler, ttsDisponible, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "dictee",
  nom: "Dictée audio",
  emoji: "🎧",
  desc: "Écoute et écris ce que tu entends. Ouvre bien tes oreilles !",
};

const NB_ITEMS = 6;

export function start(container, ctx) {
  if (!ttsDisponible()) {
    container.innerHTML = `<div class="centre"><p class="gros-emoji">🔇</p>
      <h2>Pas de synthèse vocale</h2>
      <p>Ton navigateur ne sait pas lire les textes à voix haute. Essaie avec Chrome ou Edge.</p></div>`;
    return;
  }
  // Mélange de phrases (prioritaires) et de mots de vocabulaire.
  const phrases = (ctx.pack.phrases || []).map((p) => ({
    texte: p.texte,
    traduction: p.traduction,
  }));
  const mots = ctx.pack.vocab.map((v) => ({
    texte: v.mot,
    traduction: v.traduction,
  }));
  const items = [...sample(phrases, 4), ...sample(mots, NB_ITEMS)].slice(
    0,
    NB_ITEMS,
  );
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
        message: `${bonnes} / ${items.length} bien orthographié${bonnes > 1 ? "s" : ""} !`,
      });
      return;
    }
    const item = items[i];

    container.innerHTML = `
      <div class="jeu-entete">
        <div class="barre-prog"><div style="width:${(i / items.length) * 100}%"></div></div>
        <span class="compteur">${i + 1} / ${items.length}</span>
      </div>
      <div class="centre">
        <p class="gros-emoji">🎧</p>
        <div class="carte-boutons">
          <button class="btn btn-primary" id="rejouer-son">🔊 Écouter</button>
          <button class="btn" id="lent">🐢 Lentement</button>
        </div>
      </div>
      <div class="ligne-saisie">
        <input type="text" id="saisie" autocomplete="off" autocapitalize="off" spellcheck="false"
               placeholder="Écris ce que tu entends…" />
        ${microDisponible() ? `<button class="btn-micro-small" id="micro-dictee" title="Parler la dictée">🎤</button>` : ""}
        <button class="btn btn-primary" id="valider">OK</button>
      </div>
      <div id="feedback"></div>`;

    const dire = (debit) => parler(item.texte, ctx.pack.language, debit);
    container.querySelector("#rejouer-son").onclick = () => dire(0.9);
    container.querySelector("#lent").onclick = () => dire(0.55);
    const saisie = container.querySelector("#saisie");
    saisie.onkeydown = (e) => {
      if (e.key === "Enter") valider();
    };
    container.querySelector("#valider").onclick = valider;

    const btnMic = container.querySelector("#micro-dictee");
    if (btnMic) {
      btnMic.onclick = async () => {
        btnMic.classList.add("actif");
        try {
          const alts = await ecouter(ctx.pack.language);
          if (alts && alts.length) {
            // Pick the best match or first alternative
            saisie.value = alts[0];
            valider();
          }
        } catch (e) {
          console.error(e);
        } finally {
          btnMic.classList.remove("actif");
        }
      };
    }

    setTimeout(() => dire(0.9), 400);

    function valider() {
      const sim = similarity(saisie.value, item.texte);
      const exact = normalize(saisie.value) === normalize(item.texte);
      const fb = container.querySelector("#feedback");
      if (exact) {
        bonnes++;
        xp += 6;
        fb.innerHTML = `<p class="feedback ok">✅ Parfait ! +6 XP</p>`;
      } else if (sim >= 0.85) {
        bonnes++;
        xp += 4;
        fb.innerHTML = `<p class="feedback ok">🙂 Presque parfait (+4 XP). C'était : <strong>${esc(item.texte)}</strong></p>`;
      } else {
        fb.innerHTML = `<p class="feedback ko">❌ C'était : <strong>${esc(item.texte)}</strong><br><em>${esc(item.traduction || "")}</em></p>`;
      }
      i++;
      setTimeout(suivante, exact ? 1300 : 2600);
    }
  }
  suivante();
}
