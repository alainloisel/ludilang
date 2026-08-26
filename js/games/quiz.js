// Quiz éclair : QCM chronométré mélangeant vocabulaire et grammaire,
// avec combo de bonnes réponses.

import { shuffle, sample, esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";
import { noter } from "../srs.js";

export const meta = {
  id: "quiz",
  nom: "Quiz éclair",
  emoji: "⚡",
  desc: "10 questions chrono, enchaîne les bonnes réponses pour le combo !",
};

const NB_QUESTIONS = 10;
const TEMPS = 15; // secondes par question

function construireQuestions(pack) {
  const questions = [];
  // Vocabulaire : dans les deux sens.
  for (const v of sample(pack.vocab, 8)) {
    const distracteurs = sample(
      pack.vocab.filter((x) => x.id !== v.id),
      3,
    );
    if (Math.random() < 0.5) {
      questions.push({
        type: "vocab",
        vocabId: v.id,
        dire: v.mot,
        question: `Que veut dire « ${v.mot} » ?`,
        options: shuffle([
          v.traduction,
          ...distracteurs.map((d) => d.traduction),
        ]),
        bonne: v.traduction,
      });
    } else {
      questions.push({
        type: "vocab",
        vocabId: v.id,
        question: `Comment dit-on « ${v.traduction} » ?`,
        options: shuffle([v.mot, ...distracteurs.map((d) => d.mot)]),
        bonne: v.mot,
        direApres: v.mot,
      });
    }
  }
  // Grammaire : les exercices à choix du pack.
  const choix = [];
  for (const g of pack.grammar || []) {
    for (const ex of g.exercices || []) {
      if (ex.type === "choix")
        choix.push({
          type: "grammaire",
          question: ex.question,
          options: [...ex.options],
          bonne: ex.options[ex.bonne],
          point: g.titre,
        });
    }
  }
  questions.push(...sample(choix, 4));
  return shuffle(questions).slice(0, NB_QUESTIONS);
}

export function start(container, ctx) {
  const questions = construireQuestions(ctx.pack);
  let i = 0,
    bonnes = 0,
    xp = 0,
    combo = 0,
    timer = null;

  function suivante() {
    if (i >= questions.length) {
      const parfait = bonnes === questions.length;
      ctx.finPartie({
        jeu: meta.id,
        xp,
        bonnes,
        reponses: questions.length,
        quizParfait: parfait,
        message: parfait
          ? "🎯 QUIZ PARFAIT ! Incroyable !"
          : `${bonnes} / ${questions.length} bonnes réponses`,
      });
      return;
    }
    const q = questions[i];
    let repondu = false;
    let tempsRestant = TEMPS;

    container.innerHTML = `
      <div class="jeu-entete">
        <div class="barre-prog"><div style="width:${(i / questions.length) * 100}%"></div></div>
        ${microDisponible() ? `<button class="btn-micro-small" id="micro-quiz" title="Répondre de vive voix" style="margin: 0 10px;">🎤</button>` : ""}
        <span class="compteur">${i + 1} / ${questions.length}</span>
        ${combo >= 2 ? `<span class="combo">🔥 combo ×${combo}</span>` : ""}
      </div>
      <div class="chrono"><div id="chrono-barre" style="width:100%"></div></div>
      ${q.point ? `<p class="theme-chip">${esc(q.point)}</p>` : ""}
      <h2 class="question">${esc(q.question)} ${q.dire ? `<button class="btn-son" id="dire">🔊</button>` : ""}</h2>
      <div class="options">
        ${q.options.map((o) => `<button class="btn option" data-val="${esc(o)}">${esc(o)}</button>`).join("")}
      </div>
      <div id="feedback-micro" style="text-align: center; min-height: 24px; margin-top: 10px;"></div>`;

    if (q.dire)
      container.querySelector("#dire").onclick = () =>
        parler(q.dire, ctx.pack.language);

    const btnMic = container.querySelector("#micro-quiz");
    if (btnMic) {
      btnMic.onclick = async () => {
        btnMic.classList.add("actif");
        const estFr = q.question.includes("veut dire");
        const langReco = estFr ? "fr-FR" : ctx.pack.language;
        try {
          const alts = await ecouter(langReco);
          let bestOpt = null;
          let bestSim = 0;
          for (const o of q.options) {
            for (const alt of alts) {
              const sim = similarity(o.toLowerCase(), alt.toLowerCase());
              if (sim > bestSim) {
                bestSim = sim;
                bestOpt = o;
              }
            }
          }
          if (bestOpt && bestSim >= 0.75) {
            const btnOpt = Array.from(
              container.querySelectorAll(".option"),
            ).find((b) => b.dataset.val === bestOpt);
            if (btnOpt) repondre(btnOpt);
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

    const barre = container.querySelector("#chrono-barre");
    timer = setInterval(() => {
      tempsRestant -= 0.1;
      barre.style.width = Math.max(0, (tempsRestant / TEMPS) * 100) + "%";
      if (tempsRestant <= 3) barre.classList.add("urgent");
      if (tempsRestant <= 0) {
        if (btnMic) btnMic.disabled = true;
        repondre(null);
      }
    }, 100);

    container.querySelectorAll(".option").forEach((b) => {
      b.onclick = () => repondre(b);
    });

    function repondre(bouton) {
      if (repondu) return;
      repondu = true;
      clearInterval(timer);
      const valeur = bouton ? bouton.dataset.val : null;
      const ok = valeur === q.bonne;
      container.querySelectorAll(".option").forEach((b) => {
        if (b.dataset.val === q.bonne) b.classList.add("bonne");
        else if (b === bouton) b.classList.add("mauvaise");
        b.disabled = true;
      });
      if (ok) {
        combo++;
        bonnes++;
        xp += 5 + Math.min(combo - 1, 5); // bonus combo jusqu'à +5
      } else {
        combo = 0;
      }
      // Le quiz alimente aussi la répétition espacée du vocabulaire.
      if (q.vocabId) {
        noter(ctx.progress, q.vocabId, ok);
        ctx.saveProgress();
      }
      if (q.direApres && ok) parler(q.direApres, ctx.pack.language);
      i++;
      setTimeout(suivante, ok ? 900 : 1800);
    }
  }
  suivante();
}
