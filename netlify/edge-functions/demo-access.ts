const COOKIE_NAME = "gtp_demo";
const COOKIE_MESSAGE = "get-the-point-demo-v1";
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

async function signature(secret: string) {
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

function cookieValue(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
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
  const passcode = Netlify.env.get("DEMO_PASSCODE") || "";
  const secret = Netlify.env.get("DEMO_COOKIE_SECRET") || "";

  if (!passcode || !secret) {
    return new Response("Demo access is temporarily unavailable.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const expected = `v1.${await signature(secret)}`;
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
      if (submitted === passcode) {
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
  path: ["/play", "/play.html", "/demo-access", "/demo-access.html"],
};
