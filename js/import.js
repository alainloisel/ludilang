// Écran « Importer un cours » : deux chemins.
// 1. Fichier .json généré par Claude Code (recommandé, gratuit).
// 2. Coller le verbatim → appel direct de l'API Claude (clé API requise).

import {
  validatePack,
  saveImportedPack,
  getApiKey,
  setApiKey,
} from "./store.js";
import { esc } from "./utils.js";

const MODELE = "claude-sonnet-5";

async function chargerPrompt() {
  const res = await fetch("import/PROMPT-PACK.md");
  if (!res.ok) throw new Error("PROMPT-PACK.md introuvable");
  return res.text();
}

async function appelerClaude(cle, langue, titre, verbatim) {
  const systemPrompt = await chargerPrompt();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cle,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODELE,
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Langue du cours : ${langue === "en" ? "anglais (en)" : "allemand (de)"}\nTitre souhaité : ${titre}\n\nVerbatim du cours :\n\n${verbatim}`,
        },
      ],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Erreur API (${res.status})`);
  }
  const data = await res.json();
  let texte = (data.content || []).map((c) => c.text || "").join("");
  // Retire un éventuel bloc de code markdown autour du JSON.
  texte = texte.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut === -1 || fin === -1)
    throw new Error("La réponse ne contient pas de JSON.");
  return JSON.parse(texte.slice(debut, fin + 1));
}

export function ecranImport(
  container,
  { packsImportes, onNouveauPack, onSupprimer },
) {
  container.innerHTML = `
    <section class="import">
      <div class="carte-info">
        <h2>📄 Méthode 1 — Fichier pack (recommandé)</h2>
        <p>Demande à un parent de générer un pack avec <strong>Claude Code</strong> à partir du
        verbatim du cours (voir le fichier <code>import/PROMPT-PACK.md</code>), puis charge le
        fichier <code>.json</code> ici :</p>
        <input type="file" id="fichier-pack" accept=".json,application/json" />
        <div id="fb-fichier"></div>
      </div>

      <div class="carte-info">
        <h2>🤖 Méthode 2 — Directement dans l'app (clé API)</h2>
        <p>Colle le texte de ton cours, l'IA en fait un pack de révision. Nécessite une clé API
        Anthropic (payante à l'usage), gardée uniquement sur cet appareil.</p>
        <label>Clé API <input type="password" id="cle-api" placeholder="sk-ant-…" value="${esc(getApiKey())}" /></label>
        <label>Langue
          <select id="langue-import">
            <option value="en">🇬🇧 Anglais</option>
            <option value="de">🇩🇪 Allemand</option>
          </select>
        </label>
        <label>Titre du cours <input type="text" id="titre-import" placeholder="Ex. : Anglais 5e — chapitres 4 à 6" /></label>
        <label>Verbatim du cours
          <textarea id="verbatim" rows="10" placeholder="Colle ici le contenu du cours : leçons, listes de mots, règles de grammaire, phrases vues en classe…"></textarea>
        </label>
        <button class="btn btn-primary" id="generer">✨ Générer le pack</button>
        <div id="fb-api"></div>
      </div>

      ${
        packsImportes.length
          ? `
      <div class="carte-info">
        <h2>🗂️ Cours importés</h2>
        ${packsImportes
          .map(
            (p) => `
          <div class="ligne-pack">
            <span>${esc(p.title)}</span>
            <button class="btn btn-ghost btn-suppr" data-id="${esc(p.id)}">🗑️ Supprimer</button>
          </div>`,
          )
          .join("")}
      </div>`
          : ""
      }
    </section>`;

  // --- Méthode 1 : fichier .json ---
  container.querySelector("#fichier-pack").onchange = async (e) => {
    const fb = container.querySelector("#fb-fichier");
    const fichier = e.target.files[0];
    if (!fichier) return;
    try {
      const pack = JSON.parse(await fichier.text());
      const erreurs = validatePack(pack);
      if (erreurs.length) {
        fb.innerHTML = `<p class="feedback ko">Pack invalide :<br>${erreurs.map(esc).join("<br>")}</p>`;
        return;
      }
      await saveImportedPack(pack);
      fb.innerHTML = `<p class="feedback ok">✅ « ${esc(pack.title)} » importé !</p>`;
      setTimeout(() => onNouveauPack(pack), 800);
    } catch (err) {
      fb.innerHTML = `<p class="feedback ko">Fichier illisible : ${esc(err.message)}</p>`;
    }
  };

  // --- Méthode 2 : appel API ---
  container.querySelector("#generer").onclick = async () => {
    const fb = container.querySelector("#fb-api");
    const cle = container.querySelector("#cle-api").value.trim();
    const langue = container.querySelector("#langue-import").value;
    const titre =
      container.querySelector("#titre-import").value.trim() || "Mon cours";
    const verbatim = container.querySelector("#verbatim").value.trim();
    if (!cle) {
      fb.innerHTML = `<p class="feedback ko">Il faut une clé API pour cette méthode. Sinon, utilise la méthode 1 !</p>`;
      return;
    }
    if (verbatim.length < 100) {
      fb.innerHTML = `<p class="feedback ko">Le verbatim est trop court : colle au moins quelques leçons.</p>`;
      return;
    }
    setApiKey(cle);
    const btn = container.querySelector("#generer");
    btn.disabled = true;
    fb.innerHTML = `<p class="feedback">⏳ Génération du pack en cours… (30 s à 2 min)</p>`;
    try {
      const pack = await appelerClaude(cle, langue, titre, verbatim);
      pack.title = pack.title || titre;
      pack.language = pack.language || langue;
      pack.id = pack.id || "import-" + Date.now();
      const erreurs = validatePack(pack);
      if (erreurs.length) throw new Error(erreurs.join(" "));
      await saveImportedPack(pack);
      fb.innerHTML = `<p class="feedback ok">✅ Pack créé : ${pack.vocab.length} mots, ${pack.grammar.length} points de grammaire, ${pack.phrases.length} phrases.</p>`;
      setTimeout(() => onNouveauPack(pack), 1200);
    } catch (err) {
      fb.innerHTML = `<p class="feedback ko">❌ ${esc(err.message)}</p>`;
    } finally {
      btn.disabled = false;
    }
  };

  // --- Suppression ---
  container.querySelectorAll(".btn-suppr").forEach((b) => {
    b.onclick = () => {
      if (
        confirm(
          "Supprimer ce cours importé ? (la progression associée sera perdue)",
        )
      )
        onSupprimer(b.dataset.id);
    };
  });
}
