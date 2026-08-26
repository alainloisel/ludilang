// Jeu : Jeu de rôle (Dialog Roleplay)
// Dialogue interactif avec un bot. L'élève répond en choisissant ou en prononçant les phrases adaptées au cours.

import { esc, similarity } from "../utils.js";
import { parler, ecouter, microDisponible } from "../speech.js";

export const meta = {
  id: "dialogue",
  nom: "Jeu de rôle",
  emoji: "💬",
  desc: "Discute avec AloBot de vive voix ! Choisis ou parle pour répondre.",
};

const DIALOGUES = {
  en: [
    {
      botPrompt: "Hello! What is your name?",
      correct: "Hello! My name is Emma.",
      choices: [
        "Hello! My name is Emma.",
        "This is my brother, Thomas.",
        "I like to play football on weekends.",
      ],
    },
    {
      botPrompt: "Nice to meet you! How are you doing today?",
      correct: "I am doing great, thank you! And you?",
      choices: [
        "I am doing great, thank you! And you?",
        "I am twelve years old.",
        "The dog is very small and cute.",
      ],
    },
    {
      botPrompt: "I am good, thanks! Where do you live?",
      correct: "I live in a big city named Lyon.",
      choices: [
        "I live in a big city named Lyon.",
        "My class is super and my teacher is net.",
        "I make my homework after school.",
      ],
    },
    {
      botPrompt: "Awesome! What do you like to do in your free time?",
      correct: "I love to listen to music and hang out with friends.",
      choices: [
        "I love to listen to music and hang out with friends.",
        "My mother is very net and friendly.",
        "Goodbye, have a nice day!",
      ],
    },
  ],
  de: [
    {
      botPrompt: "Hallo! Wie heißt du?",
      correct: "Hallo! Ich heiße Emma.",
      choices: [
        "Hallo! Ich heiße Emma.",
        "Das ist mein Bruder Thomas.",
        "Ich spiele gern Fußball am Wochenende.",
      ],
    },
    {
      botPrompt: "Freut mich, Emma! Wie geht es dir heute?",
      correct: "Mir geht es gut, danke! Und dir?",
      choices: [
        "Mir geht es gut, danke! Und dir?",
        "Ich bin zwölf Jahre alt.",
        "Die Katze ist klein und süß.",
      ],
    },
    {
      botPrompt: "Mir geht's auch super, danke! Wo wohnst du?",
      correct: "Ich wohne in Lyon. Das ist in Frankreich.",
      choices: [
        "Ich wohne in Lyon. Das ist in Frankreich.",
        "Meine Schule beginnt um acht Uhr.",
        "Mein Vater heißt Thomas.",
      ],
    },
    {
      botPrompt: "Schön! Was machst du gern in deiner Freizeit?",
      correct: "Ich höre gern Musik und spiele am Wochenende Fußball.",
      choices: [
        "Ich höre gern Musik und spiele am Wochenende Fußball.",
        "Meine Großeltern wohnen in Berlin.",
        "Auf Wiedersehen, bis bald!",
      ],
    },
  ],
};

export function start(container, ctx) {
  const lang = ctx.pack.language === "de" ? "de" : "en";
  const dialogue = DIALOGUES[lang];
  let turn = 0,
    bonnes = 0,
    xp = 0;

  // Customiser la conversation si le cours contient des informations
  if (ctx.pack.vocab && ctx.pack.vocab.length > 3) {
    const vocabNames = ctx.pack.vocab.filter(
      (v) => v.theme === "Se présenter" || v.theme === "La famille",
    );
    if (vocabNames.length > 0) {
      // On garde les dialogues par défaut pour assurer la grammaire, mais on sait que le vocab est là.
    }
  }

  container.innerHTML = `
    <div class="jeu-entete" style="margin-bottom: 12px;">
      <div class="barre-prog"><div style="width:0%"></div></div>
      <span class="compteur">Dialogue 0 / ${dialogue.length}</span>
    </div>

    <div id="dialogue-box" style="background: var(--carte); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--rayon); padding: 16px; min-height: 200px; max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; scroll-behavior: smooth;">
      <div class="bot-bulle" style="align-self: flex-start; background: var(--carte-claire); color: var(--texte); border-radius: 14px 14px 14px 0; padding: 10px 14px; max-width: 80%; line-height: 1.45; animation: apparition 0.25s;">
        👋 Salut ! Commençons la discussion !
      </div>
    </div>

    <div id="options-dialogue" style="display: flex; flex-direction: column; gap: 8px;"></div>
    <div id="controls-dialogue" style="margin-top: 12px; display: flex; justify-content: center; align-items: center; gap: 10px;">
      ${microDisponible() ? `<button class="btn-micro-small" id="micro-dialogue" title="Répondre par la voix">🎤</button>` : ""}
    </div>
    <div id="feedback-micro" style="text-align: center; min-height: 20px; margin-top: 8px;"></div>`;

  const dBox = container.querySelector("#dialogue-box");
  const optionsDiv = container.querySelector("#options-dialogue");
  const progBar = container.querySelector(".barre-prog div");
  const compteur = container.querySelector(".compteur");

  function triggerBot(texte) {
    // Ajouter bulle bot
    const b = document.createElement("div");
    b.className = "bot-bulle";
    b.style.alignSelf = "flex-start";
    b.style.background = "var(--carte-claire)";
    b.style.color = "var(--texte)";
    b.style.borderRadius = "14px 14px 14px 0";
    b.style.padding = "10px 14px";
    b.style.maxWidth = "80%";
    b.style.lineHeight = "1.45";
    b.style.animation = "apparition 0.25s";
    b.innerHTML =
      esc(texte) +
      ` <button class="btn-son" style="font-size: 0.9rem; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; margin-left: 6px; border:none; background:rgba(255,255,255,0.1); border-radius:50%; cursor:pointer;">🔊</button>`;

    b.querySelector("button").onclick = () => parler(texte, ctx.pack.language);
    dBox.appendChild(b);
    dBox.scrollTop = dBox.scrollHeight;

    // Prononcer immédiatement
    parler(texte, ctx.pack.language);
  }

  function triggerUser(texte) {
    const u = document.createElement("div");
    u.className = "user-bulle";
    u.style.alignSelf = "flex-end";
    u.style.background = "linear-gradient(135deg, var(--violet), var(--rose))";
    u.style.color = "var(--texte)";
    u.style.borderRadius = "14px 14px 0 14px";
    u.style.padding = "10px 14px";
    u.style.maxWidth = "80%";
    u.style.lineHeight = "1.45";
    u.style.animation = "apparition 0.25s";
    u.textContent = texte;
    dBox.appendChild(u);
    dBox.scrollTop = dBox.scrollHeight;
  }

  function avancer() {
    if (turn >= dialogue.length) {
      setTimeout(() => {
        ctx.finPartie({
          jeu: meta.id,
          xp,
          bonnes,
          reponses: dialogue.length,
          message: `Bravo, tu as discuté avec AloBot ! (+${xp} XP)`,
        });
      }, 2000);
      return;
    }

    const current = dialogue[turn];
    progBar.style.width = (turn / dialogue.length) * 100 + "%";
    compteur.textContent = `Dialogue ${turn + 1} / ${dialogue.length}`;

    // Le bot parle
    setTimeout(() => {
      triggerBot(current.botPrompt);
      // Rendre les options de réponse
      afficherChoix(current);
    }, 800);
  }

  function afficherChoix(exchange) {
    optionsDiv.innerHTML = exchange.choices
      .map(
        (c, idx) => `
      <button class="btn btn-choix-dial" data-val="${esc(c)}" style="text-align: left; font-size: 0.95rem; padding: 10px 14px; width: 100%;">
        ${esc(c)}
      </button>`,
      )
      .join("");

    container.querySelectorAll(".btn-choix-dial").forEach((b) => {
      b.onclick = () => valider(b.dataset.val, exchange);
    });

    const btnMic = container.querySelector("#micro-dialogue");
    if (btnMic) {
      btnMic.onclick = async () => {
        btnMic.classList.add("actif");
        try {
          const alts = await ecouter(ctx.pack.language);
          let bestVal = null;
          let bestSim = 0;
          for (const choice of exchange.choices) {
            for (const alt of alts) {
              const sim = similarity(choice.toLowerCase(), alt.toLowerCase());
              if (sim > bestSim) {
                bestSim = sim;
                bestVal = choice;
              }
            }
          }
          if (bestVal && bestSim >= 0.75) {
            valider(bestVal, exchange);
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

  function valider(phraseChoisie, exchange) {
    optionsDiv.innerHTML = "";
    const correct = phraseChoisie === exchange.correct;

    // User answer appears in the chat
    triggerUser(phraseChoisie);

    if (correct) {
      bonnes++;
      xp += 8;
      const fb = container.querySelector("#feedback-micro");
      fb.innerHTML = `<p class="feedback ok" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9em;">✅ Excellent ! (+8 XP)</p>`;
    } else {
      xp += 3;
      const fb = container.querySelector("#feedback-micro");
      fb.innerHTML = `<p class="feedback ko" style="margin-top: 5px; padding: 6px 12px; font-size: 0.9em;">🙂 Réponse acceptée. La réponse idéale était :<br><em>${esc(exchange.correct)}</em></p>`;
    }

    turn++;
    setTimeout(() => {
      const fb = container.querySelector("#feedback-micro");
      fb.innerHTML = "";
      avancer();
    }, 2500);
  }

  // Lancement du premier échange
  setTimeout(avancer, 600);
}
