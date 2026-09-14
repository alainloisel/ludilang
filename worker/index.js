// Gate mot de passe pour le site (usage monoutilisateur).
//
// Déployé comme Cloudflare Worker (avec assets statiques via le binding
// ASSETS, voir wrangler.jsonc) — PAS comme Cloudflare Pages. La convention
// Pages Functions (`functions/_middleware.js`) ne s'applique pas à ce mode
// de déploiement, d'où ce fichier.
//
// Formulaire + cookie signé plutôt que HTTP Basic Auth : le popup natif du
// navigateur pour Basic Auth est peu fiable en PWA « ajoutée à l'écran
// d'accueil » (écran blanc possible sur iOS). Le cookie, lui, est envoyé
// automatiquement par le navigateur (et par les fetch du service worker,
// en same-origin) une fois posé.
//
// Le mot de passe vient uniquement de la variable d'environnement Cloudflare
// `SITE_PASSWORD` (secret du Worker) — jamais commité dans le repo.

const COOKIE_NAME = "alo_auth";
const LOGIN_PATH = "/_login";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

function loginPage(erreur) {
  return `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AloLangues — connexion</title>
<body style="font-family:system-ui,sans-serif;max-width:320px;margin:20vh auto;text-align:center;padding:0 1em">
  <h1>🔒 AloLangues</h1>
  <form method="POST" style="display:flex;flex-direction:column;gap:.75em">
    <input type="password" name="password" placeholder="Mot de passe" autofocus required
      style="padding:.6em;font-size:1em;box-sizing:border-box">
    <button type="submit" style="padding:.6em;font-size:1em">Entrer</button>
  </form>
  ${erreur ? '<p style="color:#c00">Mot de passe incorrect</p>' : ""}
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const secret = env.SITE_PASSWORD;

    if (!secret) {
      return new Response("SITE_PASSWORD non configuré côté Cloudflare.", {
        status: 500,
      });
    }

    // robots.txt doit rester lisible sans authentification : un crawler ne
    // se connecte pas, il faut qu'il voie le Disallow directement.
    if (url.pathname === "/robots.txt") {
      return env.ASSETS.fetch(request);
    }

    const expectedCookie = await hmac(secret, "alo-auth-v1");

    if (url.pathname === LOGIN_PATH) {
      if (request.method === "POST") {
        const form = await request.formData();
        const pwd = form.get("password");
        if (timingSafeEqual(String(pwd || ""), secret)) {
          const headers = new Headers({
            Location: "/",
            "Cache-Control": "no-store",
          });
          headers.append(
            "Set-Cookie",
            `${COOKIE_NAME}=${expectedCookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
          );
          return new Response(null, { status: 302, headers });
        }
        return new Response(loginPage(true), {
          status: 401,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      }
      return new Response(loginPage(false), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const cookie = getCookie(request, COOKIE_NAME);
    if (timingSafeEqual(cookie, expectedCookie)) {
      const rep = await env.ASSETS.fetch(request);
      // Le CDN Cloudflare met en cache les réponses des assets statiques par
      // défaut (Cache-Control public, max-age=0, must-revalidate) — ça peut
      // resservir une réponse à un visiteur non authentifié sans jamais
      // repasser par ce Worker. On force "no-store" pour que chaque requête
      // passe systématiquement par le gate.
      const headers = new Headers(rep.headers);
      headers.set("Cache-Control", "private, no-store");
      return new Response(rep.body, {
        status: rep.status,
        statusText: rep.statusText,
        headers,
      });
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: `${url.origin}${LOGIN_PATH}`,
        "Cache-Control": "no-store",
      },
    });
  },
};
