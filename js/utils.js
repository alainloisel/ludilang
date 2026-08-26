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
