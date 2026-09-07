const COOKIE_NAME = "gtp_demo";
const COOKIE_MESSAGE = "get-the-point-demo-v1";
const FALLBACK_PASSCODE_HASH = "69cb897cc1e08697b4a3c2c4a740aab4003c144e2ab77a2dd9452b3d729ac12b";
const FALLBACK_COOKIE_SECRET = "gtp-demo-fallback-7d49a0f5-c7e2-4b7d-98a2-64b27ae6c541";
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

async function hmacSignature(secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(COOKIE_MESSAGE)));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

function cookieValue(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function normalizePasscode(value: string) {
  return value.trim().toLowerCase();
}

async function passcodeMatches(submitted: string, configuredPasscode: string) {
  const normalized = normalizePasscode(submitted);
  if (configuredPasscode) return normalized === normalizePasscode(configuredPasscode);
  return (await sha256(normalized)) === FALLBACK_PASSCODE_HASH;
}

function withSecurity(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", CSP);
  headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function redirect(location: string, cookie?: string) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "no-store",
    "Content-Security-Policy": CSP,
    "X-Robots-Tag": "noindex, nofollow",
  });
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export default async (req: Request, context: any) => {
  const url = new URL(req.url);
  const configuredPasscode = Netlify.env.get("DEMO_PASSCODE") || "";
  const secret = Netlify.env.get("DEMO_COOKIE_SECRET") || FALLBACK_COOKIE_SECRET;
  const expected = `v1.${await hmacSignature(secret)}`;
  const granted = cookieValue(req, COOKIE_NAME) === expected;
  const isAccessPage = url.pathname === "/demo-access" || url.pathname === "/demo-access.html";

  if (isAccessPage) {
    if (url.searchParams.get("logout") === "1") {
      const cleared = `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
      return redirect("/demo-access?locked=1", cleared);
    }

    if (req.method === "POST") {
      const data = await req.formData();
      const submitted = String(data.get("passcode") || "");
      const nextRaw = String(data.get("next") || "/play");
      const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/play";
      if (await passcodeMatches(submitted, configuredPasscode)) {
        const cookie = `${COOKIE_NAME}=${encodeURIComponent(expected)}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`;
        return redirect(next, cookie);
      }
      return redirect(`/demo-access?error=1&next=${encodeURIComponent(next)}`);
    }

    return withSecurity(await context.next());
  }

  if (!granted) {
    const next = url.pathname === "/play.html" ? "/play" : url.pathname;
    return redirect(`/demo-access?next=${encodeURIComponent(next)}`);
  }

  return withSecurity(await context.next());
};

export const config = {
  path: [
    "/play", "/play.html",
    "/diagnostics", "/diagnostics.html",
    "/analysis", "/analysis.html",
    "/feedback", "/feedback.html",
    "/demo-access", "/demo-access.html"
  ],
};
