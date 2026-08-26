// Le perroquet : répéter une phrase du cours au micro,
// score de prononciation calculé par reconnaissance vocale.

import { sample, esc } from "../utils.js";
import {
  parler,
  ecouter,
  microDisponible,
  scorePrononciation,
} from "../speech.js";

export const meta = {
  id: "perroquet",
  nom: "Le perroquet",
  emoji: "🦜",
  desc: "Répète après moi ! Ton accent est noté sur 100.",
};

const NB_PHRASES = 5;

export function start(container, ctx) {
  if (!microDisponible()) {
    container.innerHTML = `<div class="centre"><p class="gros-emoji">🎙️</p>
      <h2>Micro non disponible</h2>
      <p>La reconnaissance vocale fonctionne avec <strong>Chrome</strong> ou <strong>Edge</strong> (ordinateur et Android).</p>
      <p>En attendant, tu peux t'entraîner à écouter avec la <strong>Dictée audio</strong> 🎧.</p></div>`;
    return;
  }
  const sources =
    (ctx.pack.phrases || []).length >= NB_PHRASES
      ? ctx.pack.phrases
      : [
          ...(ctx.pack.phrases || []),
          ...ctx.pack.vocab.map((v) => ({
            texte: v.exemple || v.mot,
            traduction: v.traduction,
          })),
        ];
  const items = sample(sources, NB_PHRASES);
  let i = 0,
    xp = 0,
    bonnes = 0,
    meilleurScoreGlobal = 0;

  function suivante() {
    if (i >= items.length) {
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: items.length,
        scorePerroquet: meilleurScoreGlobal,
        message: `Meilleur score de prononciation : ${meilleurScoreGlobal} / 100 🦜`,
      });
      return;
    }
    const item = items[i];
    const texte = item.texte;
    let meilleurScore = 0;

    function rendu(etat = "", detail = "") {
      container.innerHTML = `
        <div class="jeu-entete">
          <div class="barre-prog"><div style="width:${(i / items.length) * 100}%"></div></div>
          <span class="compteur">${i + 1} / ${items.length}</span>
        </div>
        <p class="indice">Répète cette phrase :</p>
        <p class="phrase-cible">${esc(texte)} <button class="btn-son" id="son">🔊</button></p>
        ${item.traduction ? `<p class="carte-exemple">${esc(item.traduction)}</p>` : ""}
        <div class="centre">
          <button class="btn-micro" id="micro" title="Parle après le bip">🎤</button>
          <p id="etat">${etat}</p>
          ${detail}
          ${meilleurScore > 0 ? `<p class="score-perroquet">Meilleur essai : <strong>${meilleurScore}</strong> / 100</p>` : ""}
        </div>
        <div class="carte-boutons">
          <button class="btn" id="passer">${meilleurScore > 0 ? "Phrase suivante →" : "Passer"}</button>
        </div>`;
      container.querySelector("#son").onclick = () =>
        parler(texte, ctx.pack.language);
      container.querySelector("#passer").onclick = valider;
      container.querySelector("#micro").onclick = enregistrer;
    }

    async function enregistrer() {
      const micro = container.querySelector("#micro");
      const etat = container.querySelector("#etat");
      micro.classList.add("actif");
      etat.textContent = "🔴 Je t'écoute… parle maintenant !";
      try {
        const alternatives = await ecouter(ctx.pack.language);
        const score = scorePrononciation(texte, alternatives);
        meilleurScore = Math.max(meilleurScore, score);
        let msg, cls;
        if (score >= 90) {
          msg = "🌟 Accent parfait !";
          cls = "ok";
        } else if (score >= 75) {
          msg = "😄 Très bien !";
          cls = "ok";
        } else if (score >= 50) {
          msg = "🙂 Pas mal ! Réécoute et réessaie.";
          cls = "";
        } else {
          msg = "😅 Réécoute le modèle et tente encore !";
          cls = "ko";
        }
        rendu(
          "",
          `<p class="feedback ${cls}">${msg}<br>Score : <strong>${score}</strong> / 100<br>
          <em>J'ai entendu : « ${esc(alternatives[0] || "")} »</em></p>`,
        );
      } catch (e) {
        const raisons = {
          "not-allowed": "Autorise le micro dans ton navigateur pour jouer 🎙️",
          "rien-entendu":
            "Je n'ai rien entendu… parle plus fort ou rapproche-toi du micro !",
          "no-speech":
            "Je n'ai rien entendu… parle plus fort ou rapproche-toi du micro !",
          network: "La reconnaissance vocale a besoin d'internet.",
          "non-supporte":
            "Ton navigateur ne supporte pas la reconnaissance vocale.",
        };
        rendu(
          "",
          `<p class="feedback ko">${raisons[e.message] || "Oups, petit souci de micro. Réessaie !"}</p>`,
        );
      }
    }

    function valider() {
      if (meilleurScore >= 75) bonnes++;
      if (meilleurScore > meilleurScoreGlobal)
        meilleurScoreGlobal = meilleurScore;
      xp += Math.round(meilleurScore / 10);
      i++;
      suivante();
    }

    rendu();
    parler(texte, ctx.pack.language);
  }
  suivante();
}
