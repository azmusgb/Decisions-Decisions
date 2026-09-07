const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'";

const PATHS = [
  "/", "/home.html",
  "/how", "/how.html",
  "/playtest", "/playtest.html",
  "/about", "/about.html",
  "/faq", "/faq.html",
  "/press", "/press.html",
  "/partners", "/partners.html",
  "/retail", "/retail.html",
  "/manufacturing", "/manufacturing.html",
  "/launch", "/launch.html",
  "/contact", "/contact.html",
  "/privacy", "/privacy.html",
  "/thanks", "/thanks.html"
];

function secureHeaders(headers: Headers) {
  headers.set("Content-Security-Policy", CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.delete("content-length");
  headers.delete("content-encoding");
  return headers;
}

export default async (req: Request, context: any) => {
  const response = await context.next();
  const headers = secureHeaders(new Headers(response.headers));
  const type = headers.get("content-type") || "";
  if (!type.includes("text/html")) return new Response(response.body, { status: response.status, statusText: response.statusText, headers });

  let html = await response.text();
  if (!html.includes("/css/navigation.css")) {
    html = html.replace("</head>", '<link rel="stylesheet" href="/css/navigation.css?v=10"></head>');
  }
  if (!html.includes("/site-nav.js")) {
    html = html.replace("</body>", '<script src="/site-nav.js?v=10" defer></script></body>');
  }

  const path = new URL(req.url).pathname;
  if (path === "/" || path === "/home.html") {
    html = html.replace('src="/play.html"', 'src="/demo-access?embed=1"');
  }

  return new Response(html, { status: response.status, statusText: response.statusText, headers });
};

export const config = { path: PATHS };
