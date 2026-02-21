const http = require("http");

const PORT = Number(process.env.SAAVN_PROXY_PORT || 8787);
const UPSTREAM = "https://saavn.sumit.co";
const CACHE_TTL_MS = 30 * 1000;

const cache = new Map();

const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
};

const server = http.createServer(async (req, res) => {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const incomingUrl = new URL(req.url || "/", `http://${req.headers.host}`);

  if (incomingUrl.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, upstream: UPSTREAM }));
    return;
  }

  if (!incomingUrl.pathname.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Use /api/* paths only" }));
    return;
  }

  const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, UPSTREAM);
  const cacheKey = upstreamUrl.toString();
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    res.writeHead(cached.status, {
      "Content-Type": cached.contentType,
      "X-Proxy-Cache": "HIT",
    });
    res.end(cached.body);
    return;
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: { accept: "application/json" },
    });
    const body = await upstreamResponse.text();
    const contentType = upstreamResponse.headers.get("content-type") || "application/json";

    if (upstreamResponse.ok) {
      cache.set(cacheKey, {
        timestamp: Date.now(),
        status: upstreamResponse.status,
        contentType,
        body,
      });
    }

    res.writeHead(upstreamResponse.status, {
      "Content-Type": contentType,
      "X-Proxy-Cache": "MISS",
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Upstream request failed",
        details: String(error),
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`Saavn proxy running on http://localhost:${PORT}`);
  console.log(`Forwarding -> ${UPSTREAM}`);
});
