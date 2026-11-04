// Petites fonctions partagées par tous les jeux.

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sample(arr, n) {
  return shuffle(arr).slice(0, n);
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Normalise un texte pour comparer les réponses : minuscules, sans
// ponctuation, apostrophes unifiées, espaces réduits.
export function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[.,!?;:«»"()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Distance de Levenshtein entre deux chaînes.
export function levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

// Similarité 0..1 entre deux textes (après normalisation).
export function similarity(a, b) {
  const na = normalize(a),
    nb = normalize(b);
  if (!na.length && !nb.length) return 1;
  const d = levenshtein(na, nb);
  return Math.max(0, 1 - d / Math.max(na.length, nb.length));
}

// Échappe le HTML pour insérer du contenu de pack en toute sécurité.
export function esc(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c],
  );
}

// Un mot avec sa transcription en dessous (pinyin, romaji…) quand le pack en
// fournit une. Sans transcription, rend exactement ce que rendait esc(mot).
//
// ⚠️ À n'utiliser que dans un LIBELLÉ affiché. Jamais dans un `data-val`, un
// `similarity()` ni une égalité de réponse : les jeux comparent les réponses par
// chaîne (quiz.js:169-172), et du HTML dans la valeur comparée casserait la
// correction.
export function motTranscrit(mot, transcription) {
  return transcription
    ? `${esc(mot)}<span class="transcription">${esc(transcription)}</span>`
    : esc(mot);
}

// ---- Réservoir de phrases (Perroquet, Détective) ----
// Phrases du pack + phrases d'exemple du vocabulaire, dédoublonnées, chacune
// avec son origine ("cours" = tirée telle quelle du cours de l'élève,
// "construite" = écrite pour l'entraînement, absente = inconnue).
export function reservoirPhrases(pack) {
  const vues = new Set();
  const unique = (liste) =>
    liste.filter((p) => {
      const cle = normalize(p.texte || "");
      if (!cle || vues.has(cle)) return false;
      vues.add(cle);
      return true;
    });
  const phrases = unique(
    (pack.phrases || []).map((p) => ({
      texte: p.texte,
      traduction: p.traduction,
      origine: p.origine,
    })),
  );
  const exemples = unique(
    (pack.vocab || [])
      .filter((v) => v.exemple)
      .map((v) => ({
        texte: v.exemple,
        // Pas de `traduction` : le pack ne donne que celle du mot, pas de la
        // phrase. Chaque jeu décide quoi en montrer (le Détective ne doit pas
        // afficher `mot`, ce serait la correction de la faute).
        mot: v.mot,
        tradMot: v.traduction,
        origine: v.origineExemple,
      })),
  );
  return { phrases, exemples };
}

// Tout le réservoir dans un ordre aléatoire, avec `nbPhrasesPack` phrases du
// champ `phrases` en tête (plus longues et plus riches que les exemples du
// vocabulaire, on en garantit quelques-unes par partie).
export function phrasesMelangees(pack, nbPhrasesPack = 2) {
  const { phrases, exemples } = reservoirPhrases(pack);
  const garanties = sample(phrases, nbPhrasesPack);
  const reste = [...phrases, ...exemples].filter((p) => !garanties.includes(p));
  return [...garanties, ...shuffle(reste)];
}

// Étiquette « phrase du cours » / « phrase d'entraînement ». Rien si l'origine
// est inconnue (anciens packs, packs importés).
export function badgeOrigine(origine) {
  if (origine === "cours")
    return `<p class="badge-origine cours" title="Cette phrase vient telle quelle de ton cahier">📒 Phrase de ton cours</p>`;
  if (origine === "construite")
    return `<p class="badge-origine construite" title="Cette phrase a été écrite pour t'entraîner avec les mots du cours">✏️ Phrase d'entraînement</p>`;
  return "";
}

// Crée un élément à partir d'un gabarit HTML.
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Date du jour au format AAAA-MM-JJ (heure locale).
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysBetween(isoA, isoB) {
  return Math.round((new Date(isoB) - new Date(isoA)) / 86400000);
}

const ARTICLES = new Set([
  "a",
  "an",
  "the",
  "to",
  "un",
  "une",
  "le",
  "la",
  "les",
  "l'",
  "des",
  "du",
  "der",
  "die",
  "das",
  "ein",
  "eine",
]);

// Distracteurs « crédibles » : on privilégie les mots du même thème, de même
// forme (même nombre de mots, même article ou « to » devant, longueur proche).
// Sinon un « a pencil case » entouré de « busy » et « switch off » se devine
// sans connaître le cours. Les réponses identiques à la bonne sont exclues.
export function distracteursPour(v, vocab, champ) {
  const bonne = v[champ];
  const premier = (t) => String(t).toLowerCase().split(/\s+/)[0];
  const nbMots = (t) => String(t).trim().split(/\s+/).length;
  const candidats = [];
  const vus = new Set([bonne]);
  for (const x of vocab) {
    if (x.id === v.id || vus.has(x[champ])) continue;
    vus.add(x[champ]);
    const t = x[champ];
    const proximite =
      1 -
      Math.min(
        Math.abs(t.length - bonne.length) / Math.max(bonne.length, 1),
        1,
      );
    const score =
      (x.theme && x.theme === v.theme ? 3 : 0) +
      (nbMots(t) === nbMots(bonne) ? 1.5 : 0) +
      (ARTICLES.has(premier(t)) && premier(t) === premier(bonne) ? 1.5 : 0) +
      proximite +
      Math.random(); // varie les distracteurs d'une partie à l'autre
    candidats.push({ x, score });
  }
  candidats.sort((a, b) => b.score - a.score);
  return candidats.slice(0, 3).map((c) => c.x);
}
