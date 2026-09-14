// Service worker : l'app fonctionne hors ligne après la première visite.
// Stratégie « réseau d'abord, cache en secours » pour rester à jour
// tout en marchant sans connexion.

const CACHE = "alo-langues-v8";

const COQUILLE = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/store.js",
  "./js/srs.js",
  "./js/speech.js",
  "./js/gamification.js",
  "./js/utils.js",
  "./js/import.js",
  "./js/games/flashcards.js",
  "./js/games/quiz.js",
  "./js/games/memory.js",
  "./js/games/pendu.js",
  "./js/games/ordre.js",
  "./js/games/trous.js",
  "./js/games/dictee.js",
  "./js/games/perroquet.js",
  "./js/games/intrus.js",
  "./js/games/course.js",
  "./js/games/dialogue.js",
  "./js/games/detective.js",
  "./js/games/conjugaison.js",
  "./js/games/accord.js",
  "./js/games/syntaxe.js",
  "./js/games/preposition.js",
  "./js/games/irregular.js",
  "./js/games/marathon.js",
  "./js/games/oreille.js",
  "./packs/index.json",
  "./packs/demo-anglais-5e.json",
  "./packs/demo-allemand-5e.json",
  "./import/PROMPT-PACK.md",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(COQUILLE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) =>
        Promise.all(
          cles.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Ne jamais intercepter les appels vers l'API Claude.
  if (!e.request.url.startsWith(self.location.origin)) return;
  if (e.request.method !== "GET") return;
  // « no-cache » force une revalidation auprès du serveur : sans ça le cache
  // HTTP du navigateur court-circuite le réseau et on sert du périmé (fichiers
  // js modifiés, nouveaux packs) même si la stratégie est « réseau d'abord ».
  // Les requêtes de navigation n'acceptent pas d'options : on les laisse telles quelles.
  const reseau =
    e.request.mode === "navigate"
      ? fetch(e.request)
      : fetch(e.request, { cache: "no-cache" });
  e.respondWith(
    reseau
      .then((rep) => {
        // Chrome interdit de respondWith() une réponse "redirected" pour une
        // requête de navigation (redirect mode "follow") : on la reconstruit
        // en 302 propre pour que le navigateur refasse la navigation vers
        // /_login (gate mot de passe) sans throw.
        if (e.request.mode === "navigate" && rep.redirected) {
          return new Response(null, {
            status: 302,
            headers: { Location: rep.url, "Cache-Control": "no-store" },
          });
        }
        // Ne jamais mettre en cache une réponse d'erreur (ex : 401 du gate
        // mot de passe) : sinon elle serait resservie plus tard hors-ligne.
        if (rep.ok) {
          const copie = rep.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copie));
        }
        return rep;
      })
      .catch(() => caches.match(e.request)),
  );
});
