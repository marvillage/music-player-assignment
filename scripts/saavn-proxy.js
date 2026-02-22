const http = require("http");

const PORT = Number(process.env.SAAVN_PROXY_PORT || 8787);
const UPSTREAM = "https://saavn.sumit.co";
const LYRICS_UPSTREAM = "https://api.lyrics.ovh";
const LRCLIB_UPSTREAM = "https://lrclib.net";
const CACHE_TTL_MS = 30 * 1000;

const cache = new Map();

const setCors = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
};

const normalizeToken = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[\[\](){}]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const sanitizeArtist = (value) =>
  String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/\b(feat|ft|featuring)\.?\b.*$/i, "")
    .split(/[,&|/]/)[0]
    .trim();

const sanitizeTitle = (value, artist) => {
  let cleaned = String(value ?? "")
    .replace(/&amp;/gi, "&")
    .replace(/\s*[\[(].*?[\])]\s*/g, " ")
    .replace(/\b(feat|ft|featuring)\.?\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const primaryArtist = sanitizeArtist(artist);
  const normalizedArtist = normalizeToken(primaryArtist);
  const normalizedTitle = normalizeToken(cleaned);
  if (normalizedArtist && normalizedTitle.endsWith(normalizedArtist)) {
    const splitPoint = cleaned.length - primaryArtist.length;
    if (splitPoint > 1) {
      cleaned = cleaned.slice(0, splitPoint).trim();
    }
  }
  return cleaned;
};

const normalizeLyrics = (value) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  const lines = trimmed.split(/\r?\n/);
  if (lines[0].toLowerCase().startsWith("paroles de la chanson")) {
    return lines.slice(1).join("\n").trim();
  }
  return trimmed;
};

const requestSuggestions = async (query) => {
  if (!query) {
    return [];
  }
  const url = `${LYRICS_UPSTREAM}/suggest/${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const json = await response.json();
  return Array.isArray(json?.data) ? json.data : [];
};

const scoreSuggestion = (candidate, wantedTitle, wantedArtist) => {
  const title = normalizeToken(candidate?.title);
  const artist = normalizeToken(candidate?.artist?.name);
  const targetTitle = normalizeToken(wantedTitle);
  const targetArtist = normalizeToken(wantedArtist);

  let score = 0;
  if (targetTitle && title === targetTitle) {
    score += 4;
  } else if (targetTitle && (title.includes(targetTitle) || targetTitle.includes(title))) {
    score += 2;
  }

  if (targetArtist && (artist.includes(targetArtist) || targetArtist.includes(artist))) {
    score += 3;
  }

  return score;
};

const pickBestSuggestion = (items, wantedTitle, wantedArtist) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  let best = null;
  let bestScore = -1;
  items.slice(0, 10).forEach((item) => {
    const score = scoreSuggestion(item, wantedTitle, wantedArtist);
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  });
  return best;
};

const requestLyrics = async (artist, title) => {
  if (!artist || !title) {
    return null;
  }
  const url = `${LYRICS_UPSTREAM}/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const json = await response.json();
  const lyrics = normalizeLyrics(json?.lyrics);
  return lyrics.length > 0 ? lyrics : null;
};

const scoreLrcLibItem = (item, wantedArtist, wantedTitle) => {
  const title = normalizeToken(item?.trackName);
  const artist = normalizeToken(item?.artistName);
  const targetTitle = normalizeToken(wantedTitle);
  const targetArtist = normalizeToken(wantedArtist);

  let score = 0;
  if (targetTitle && title === targetTitle) {
    score += 5;
  } else if (targetTitle && (title.includes(targetTitle) || targetTitle.includes(title))) {
    score += 3;
  }

  if (targetArtist && artist === targetArtist) {
    score += 4;
  } else if (targetArtist && (artist.includes(targetArtist) || targetArtist.includes(artist))) {
    score += 2;
  }

  return score;
};

const requestLyricsFromLrcLib = async (artist, title) => {
  const query = new URLSearchParams();
  query.set("track_name", title);
  if (artist) {
    query.set("artist_name", artist);
  }

  const response = await fetch(`${LRCLIB_UPSTREAM}/api/search?${query.toString()}`);
  if (!response.ok) {
    return null;
  }
  const json = await response.json();
  if (!Array.isArray(json) || json.length === 0) {
    return null;
  }

  const best = json
    .map((item) => ({
      score: scoreLrcLibItem(item, artist, title),
      lyrics: item?.plainLyrics || item?.syncedLyrics || "",
    }))
    .sort((a, b) => b.score - a.score)
    .find((item) => String(item.lyrics).trim().length > 0);

  if (!best) {
    return null;
  }
  const lyrics = normalizeLyrics(String(best.lyrics));
  return lyrics.length > 0 ? lyrics : null;
};

const resolveLyrics = async (artistRaw, titleRaw) => {
  const artist = sanitizeArtist(artistRaw);
  const title = sanitizeTitle(titleRaw, artist);
  if (!title) {
    return null;
  }

  const lrcLib = await requestLyricsFromLrcLib(artist, title);
  if (lrcLib) {
    return lrcLib;
  }

  const queries = [title, `${title} ${artist}`].filter((value) => value.trim().length > 0);
  let best = null;
  for (const query of queries) {
    const suggestions = await requestSuggestions(query);
    best = pickBestSuggestion(suggestions, title, artist);
    if (best) {
      break;
    }
  }

  if (best?.artist?.name && best?.title) {
    const matched = await requestLyrics(best.artist.name, best.title);
    if (matched) {
      return matched;
    }
  }

  if (!artist) {
    return null;
  }
  return await requestLyrics(artist, title);
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

  if (incomingUrl.pathname === "/api/lyrics") {
    const artist = incomingUrl.searchParams.get("artist") || "";
    const title = incomingUrl.searchParams.get("title") || "";
    const cacheKey = `lyrics:${artist}:${title}`;
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
      const lyrics = await resolveLyrics(artist, title);
      const body = JSON.stringify({
        success: true,
        data: { lyrics },
      });

      cache.set(cacheKey, {
        timestamp: Date.now(),
        status: 200,
        contentType: "application/json",
        body,
      });

      res.writeHead(200, {
        "Content-Type": "application/json",
        "X-Proxy-Cache": "MISS",
      });
      res.end(body);
      return;
    } catch (error) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: false,
          data: { lyrics: null },
          error: "Lyrics lookup failed",
          details: String(error),
        })
      );
      return;
    }
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
