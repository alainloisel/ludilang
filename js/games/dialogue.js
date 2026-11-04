// Jeu : Jeu de rôle (Dialog Roleplay)
// Dialogue interactif avec un bot. L'élève répond en choisissant ou en prononçant les phrases adaptées au cours.

import { esc, similarity, pick, shuffle } from "../utils.js";
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
        "My class is super and my teacher is nice.",
        "I do my homework after school.",
      ],
    },
    {
      botPrompt: "Awesome! What do you like to do in your free time?",
      correct: "I love to listen to music and hang out with friends.",
      choices: [
        "I love to listen to music and hang out with friends.",
        "My mother is very nice and friendly.",
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

// Autres scénarios, un par partie tiré au hasard. Chaque réplique :
// [ce que dit AloBot, la bonne réponse, mauvaise réponse 1, mauvaise réponse 2].
// Les mauvaises réponses sont correctes en anglais/allemand mais hors sujet.
const AUTRES = {
  en: [
    // À l'école : matières et goûts
    [
      ["Hi! What is your favourite subject?", "My favourite subject is history.", "I live on the second floor.", "It's half past five."],
      ["Why do you like it?", "Because it's interesting and the teacher is nice.", "Yes, there is a library.", "I went to Normandy."],
      ["Is there a swimming pool in your school?", "No, there isn't, but there is a big gym.", "My favourite colour is blue.", "I can't come to the party."],
      ["What do you do after class?", "I study in the library or I play football.", "I was born in July.", "Could you speak up, please?"],
    ],
    // En classe : devoirs oubliés et demandes polies
    [
      ["Good morning! Where is your homework?", "I'm sorry, I didn't do my homework. My dog ate it!", "I live in a flat in Lyon.", "My favourite food is sushi."],
      ["That's not a good excuse! Do you have your book?", "Yes, I have my book, but I forgot my pencil case.", "It's sunny and hot today.", "My sister is twelve."],
      ["Listen to the recording. Can you hear it?", "No, I can't hear a thing. Could you play it again, please?", "I have two cats and a rabbit.", "I went to the cinema yesterday."],
      ["Of course. Any questions before the end of the class?", "Yes, can I go to the toilets, please?", "My birthday is in November.", "There are three bedrooms in my house."],
    ],
    // Ma maison
    [
      ["Do you live in a flat or in a house?", "I live in a house with a big garden.", "I get up at seven o'clock.", "My favourite subject is maths."],
      ["How many bedrooms are there?", "There are three bedrooms and one bathroom.", "I can speak English and French.", "Yes, I would like to go."],
      ["What is your bedroom like?", "It's small but tidy. There is a desk next to the bed.", "I went to the beach last summer.", "Could you lend me a ruler?"],
      ["What do you like to do in your room?", "I like to read and to listen to music.", "It is a quarter to four.", "There aren't any lockers."],
    ],
    // Les vacances (prétérit)
    [
      ["Hi! What did you do during the holidays?", "I went to Normandy with my family.", "I like history and geography.", "There is a lift in my block."],
      ["Great! What did you do there?", "I visited a castle and I played on the beach.", "My favourite colour is green.", "I can't swim very well."],
      ["Did you celebrate Halloween?", "Yes, I celebrated Halloween with my friends.", "No, I don't have a balcony.", "It's ten past five."],
      ["And what did you do yesterday?", "I did my homework and I watched a movie.", "I would like to live in London.", "Lions are hungry."],
    ],
    // L'internat et l'école idéale (would)
    [
      ["Would you like to go to a boarding school?", "No, I wouldn't, because I would miss my family.", "I have a pencil in my pencil case.", "It's cloudy today."],
      ["At Summerhill, classes are not obligatory. What do you think?", "It's cool, but I think I would play all day!", "My house has two floors.", "I was born in 2012."],
      ["What would you do in your ideal school?", "In my ideal school, we could chew gum and there would be only nice teachers.", "I share a bathroom with my brother.", "I didn't hand my homework in."],
      ["Students must get up at seven. Is that OK for you?", "No, it's too early for me!", "Yes, there is a gym.", "My dog chewed it up."],
    ],
  ],
  de: [
    // Familie und Haustiere
    [
      ["Hast du Geschwister?", "Ja, ich habe einen Bruder und eine Schwester.", "Ich esse Brot und Marmelade.", "Um acht Uhr."],
      ["Wie heißt dein Bruder?", "Mein Bruder heißt Jonas. Er ist vierzehn.", "Ich wohne in Regensburg.", "Die Hose ist schwarz."],
      ["Hast du ein Haustier?", "Ja, ich habe eine Maus.", "Ich trage einen Pulli.", "Heute ist Donnerstag."],
      ["Was machst du gern?", "Ich spiele Gitarre und surfe im Internet.", "Mein Vater fährt mich in die Schule.", "Wir sind im Garten."],
    ],
    // Der Morgen
    [
      ["Guten Morgen! Was isst du zum Frühstück?", "Ich esse Brot und Marmelade.", "Ich heiße Lisa.", "Er hat kurze Haare."],
      ["Und wie kommst du in die Schule?", "Mein Vater fährt mich in die Schule.", "Ich habe eine Katze.", "Das Kleid ist cool."],
      ["Um wie viel Uhr nimmst du den Bus?", "Ich nehme den Bus um sieben Uhr.", "Ich spiele gern Tennis.", "Sie ist hübsch."],
      ["Hast du heute Sport?", "Ja, heute spielen wir Fußball.", "Ich wohne in Lyon.", "Wie viel Geld hast du?"],
    ],
    // Mode
    [
      ["Was trägst du heute?", "Ich trage eine blaue Jeans und ein weißes T-Shirt.", "Ich esse gern Brot.", "Mein Bruder heißt Jonas."],
      ["Wie findest du meine Jacke?", "Ich finde deine Jacke schick!", "Ich nehme den Bus.", "Wir haben noch Zeit."],
      ["Was ist dein Stil?", "Mein Stil ist lässig und sportlich.", "Ich wohne in Berlin.", "Um acht Uhr."],
      ["Wer ist dein Lieblingsinfluencer?", "Mein Lieblingsinfluencer ist Nic Kaufmann.", "Ich habe keine Lust.", "Die Schule ist groß."],
    ],
    // Im Geschäft
    [
      ["Hallo! Was möchtest du kaufen?", "Ich möchte einen warmen Pulli kaufen.", "Ich heiße Paul.", "Er läuft schnell."],
      ["Welche Farbe magst du?", "Ich mag Blau und Schwarz.", "Ich bin zwölf Jahre alt.", "Mein Vater ist groß."],
      ["Der blaue Pulli kostet zwanzig Euro.", "Super, ich kaufe den blauen Pulli!", "Ich habe eine Maus.", "Wir spielen Fußball."],
      ["Brauchst du auch einen Schal?", "Nein danke, ich habe schon einen Schal.", "Ich esse Marmelade.", "Heute ist Montag."],
    ],
  ],
};

const SCENARIOS = {};
for (const lang of ["en", "de"]) {
  SCENARIOS[lang] = [
    DIALOGUES[lang],
    ...AUTRES[lang].map((scenario) =>
      scenario.map(([botPrompt, correct, ...faux]) => ({
        botPrompt,
        correct,
        choices: [correct, ...faux],
      })),
    ),
  ];
}

export function start(container, ctx) {
  const lang = ctx.pack.language === "de" ? "de" : "en";
  const dialogue = pick(SCENARIOS[lang]);
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
    // Mélangés : sans ça, la bonne réponse était toujours le premier bouton.
    optionsDiv.innerHTML = shuffle(exchange.choices)
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
