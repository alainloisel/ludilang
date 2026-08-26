// Chargement des packs de cours (fichiers + packs importés en IndexedDB)
// et persistance de la progression / du profil joueur en localStorage.

const DB_NAME = "alo-langues";
const DB_STORE = "packs";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbAll() {
  // Si le stockage est indisponible (navigation privée, profil bloqué…),
  // IndexedDB peut ne jamais répondre : on abandonne après 2 s pour ne
  // pas bloquer le chargement de l'app.
  const timeout = new Promise((resolve) =>
    setTimeout(() => resolve(null), 2000),
  );
  try {
    const db = await Promise.race([openDb(), timeout]);
    if (!db) return [];
    return await Promise.race([
      new Promise((resolve, reject) => {
        const req = db.transaction(DB_STORE).objectStore(DB_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      }),
      timeout.then(() => []),
    ]);
  } catch {
    return [];
  }
}

export async function saveImportedPack(pack) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(pack);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteImportedPack(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Valide qu'un pack a la structure minimale attendue par les jeux.
export function validatePack(pack) {
  const errs = [];
  if (!pack || typeof pack !== "object") return ["Ce n'est pas un objet JSON."];
  if (!pack.id) errs.push("Champ « id » manquant.");
  if (!["en", "de"].includes(pack.language))
    errs.push('Champ « language » : doit être "en" ou "de".');
  if (!pack.title) errs.push("Champ « title » manquant.");
  if (!Array.isArray(pack.vocab) || pack.vocab.length < 4)
    errs.push("Il faut au moins 4 mots de vocabulaire.");
  else
    pack.vocab.forEach((v, i) => {
      if (!v.mot || !v.traduction)
        errs.push(`vocab[${i}] : « mot » et « traduction » sont obligatoires.`);
    });
  if (!Array.isArray(pack.grammar)) pack.grammar = [];
  if (!Array.isArray(pack.phrases)) pack.phrases = [];
  // Attribue des ids manquants pour que la répétition espacée fonctionne.
  pack.vocab?.forEach((v, i) => {
    if (!v.id) v.id = "v" + (i + 1);
  });
  pack.phrases?.forEach((p, i) => {
    if (!p.id) p.id = "p" + (i + 1);
  });
  pack.grammar?.forEach((g, i) => {
    if (!g.id) g.id = "g" + (i + 1);
  });
  return errs;
}

// Tous les packs : embarqués (packs/) + importés (IndexedDB).
// « no-cache » : on revalide toujours auprès du serveur. Le serveur de dev
// (python -m http.server) n'envoie pas de Cache-Control, donc sans ça le
// navigateur sert son cache pendant des heures et un pack ajouté à
// packs/index.json reste invisible même après un redémarrage de l'app.
// La revalidation est quasi gratuite : le serveur répond 304 si rien n'a bougé.
export async function loadAllPacks() {
  const packs = [];
  try {
    const index = await (
      await fetch("packs/index.json", { cache: "no-cache" })
    ).json();
    for (const entry of index.packs) {
      try {
        const pack = await (
          await fetch("packs/" + entry.fichier, { cache: "no-cache" })
        ).json();
        pack._builtin = true;
        packs.push(pack);
      } catch (e) {
        console.warn("Pack illisible :", entry.fichier, e);
      }
    }
  } catch (e) {
    console.warn("packs/index.json introuvable", e);
  }
  const imported = await idbAll();
  for (const p of imported) packs.push(p);
  return packs;
}

// ---- localStorage : profil joueur + progression par pack ----

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getPlayer(langCode) {
  const suffix = langCode ? `.${langCode}` : "";
  const hasLangPlayer = localStorage.getItem("alo.player" + suffix);
  if (hasLangPlayer) {
    return lsGet("alo.player" + suffix);
  }
  const generalPlayerRaw = localStorage.getItem("alo.player");
  if (generalPlayerRaw) {
    try {
      return JSON.parse(generalPlayerRaw);
    } catch (e) {
      // fallback if parsing fails
    }
  }
  return {
    xp: 0,
    streak: { count: 0, last: null },
    badges: [],
    stats: {
      reponses: 0,
      bonnes: 0,
      parties: 0,
      jeux: {},
      quizParfaits: 0,
      perroquetTop: 0,
    },
  };
}

export function savePlayer(langCode, player) {
  const suffix = langCode ? `.${langCode}` : "";
  lsSet("alo.player" + suffix, player);
}

export function getProgress(packId) {
  return lsGet("alo.progress." + packId, { srs: {} });
}

export function saveProgress(packId, progress) {
  lsSet("alo.progress." + packId, progress);
}

// Progression du mode Parcours : unités terminées et session interrompue.
// Portée par cours, comme la progression SRS.
export function getParcours(packId) {
  return lsGet("alo.parcours." + packId, {
    unitesTerminees: [],
    session: null,
  });
}

export function saveParcours(packId, data) {
  lsSet("alo.parcours." + packId, data);
}

export function getCurrentPackId() {
  return localStorage.getItem("alo.currentPack") || null;
}

export function setCurrentPackId(id) {
  localStorage.setItem("alo.currentPack", id);
}

export function getApiKey() {
  return localStorage.getItem("alo.apiKey") || "";
}

export function setApiKey(key) {
  if (key) localStorage.setItem("alo.apiKey", key);
  else localStorage.removeItem("alo.apiKey");
}
