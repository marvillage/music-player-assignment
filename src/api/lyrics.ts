import { Platform } from "react-native";

const WEB_PROXY_BASE = "http://localhost:8787";
const LYRICS_UPSTREAM = "https://api.lyrics.ovh";
const LRCLIB_UPSTREAM = "https://lrclib.net";

type SuggestItem = {
  title?: string;
  artist?: {
    name?: string;
  };
};

type LrcLibItem = {
  trackName?: string;
  artistName?: string;
  plainLyrics?: string;
  syncedLyrics?: string;
};

type FetchJsonResult = {
  ok: boolean;
  status: number;
  json: unknown;
};

export type TimedLyricLine = {
  text: string;
  timeSec: number;
};

export type LyricsData = {
  lyrics: string | null;
  timedLines: TimedLyricLine[];
};

const decodeHtmlEntities = (value: string): string =>
  value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const normalizeLyrics = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const lines = trimmed.split(/\r?\n/);
  if (lines[0].toLowerCase().startsWith("paroles de la chanson")) {
    return lines.slice(1).join("\n").trim();
  }

  return trimmed;
};

const normalizeToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[\[\](){}]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseSyncedTimestamp = (value: string): number | null => {
  const match = value.match(/^(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?$/);
  if (!match) {
    return null;
  }
  const minutes = Number.parseInt(match[1], 10);
  const seconds = Number.parseInt(match[2], 10);
  const fractionRaw = match[3] ?? "0";
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return null;
  }
  const fractionMs =
    fractionRaw.length === 3
      ? Number.parseInt(fractionRaw, 10)
      : fractionRaw.length === 2
      ? Number.parseInt(fractionRaw, 10) * 10
      : Number.parseInt(fractionRaw, 10) * 100;
  if (!Number.isFinite(fractionMs)) {
    return null;
  }
  return minutes * 60 + seconds + fractionMs / 1000;
};

const parseSyncedLyrics = (value: string): TimedLyricLine[] => {
  const lines = value.split(/\r?\n/);
  const parsed: TimedLyricLine[] = [];

  lines.forEach((rawLine) => {
    const tagMatches = Array.from(rawLine.matchAll(/\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g));
    if (tagMatches.length === 0) {
      return;
    }
    const text = rawLine.replace(/\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g, "").trim();
    if (!text) {
      return;
    }
    tagMatches.forEach((match) => {
      const timeSec = parseSyncedTimestamp(match[1]);
      if (timeSec === null) {
        return;
      }
      parsed.push({ text, timeSec });
    });
  });

  parsed.sort((a, b) => a.timeSec - b.timeSec);
  const seen = new Set<string>();
  return parsed.filter((item) => {
    const key = `${Math.round(item.timeSec * 1000)}::${normalizeToken(item.text)}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const dedupeByNormalized = (items: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  items.forEach((item) => {
    const normalized = normalizeToken(item);
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(item.trim());
  });
  return result;
};

const sanitizeArtist = (value: string): string =>
  decodeHtmlEntities(value)
    .replace(/\b(feat|ft|featuring)\.?\b.*$/i, "")
    .split(/[,&|/]/)[0]
    .trim();

const buildArtistCandidates = (value: string): string[] => {
  const cleaned = decodeHtmlEntities(value).replace(/\b(feat|ft|featuring)\.?\b.*$/i, "");
  const split = cleaned
    .split(/[,&|/]|(?:\s+x\s+)|(?:\s+and\s+)/i)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const primary = sanitizeArtist(value);
  return dedupeByNormalized([primary, ...split]).slice(0, 4);
};

const inferArtistCandidatesFromTitle = (value: string): string[] => {
  const cleaned = decodeHtmlEntities(value)
    .replace(/\s*[\[(].*?[\])]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const candidates: string[] = [];
  const words = cleaned.split(" ").filter((word) => word.length > 0);

  if (cleaned.includes(" - ")) {
    candidates.push(cleaned.split(" - ").slice(-1)[0].trim());
  }
  if (words.length >= 3) {
    candidates.push(words.slice(-2).join(" "));
  }
  if (words.length >= 4) {
    candidates.push(words.slice(-3).join(" "));
  }

  return dedupeByNormalized(candidates.map((candidate) => sanitizeArtist(candidate))).slice(0, 2);
};

const sanitizeTitle = (value: string, artistCandidates: string[]): string => {
  let cleaned = decodeHtmlEntities(value)
    .replace(/\s*[\[(].*?[\])]\s*/g, " ")
    .replace(/\b(feat|ft|featuring)\.?\b.*$/i, "")
    .replace(/\s+-\s+(official|audio|video|lyric|lyrics|from)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "");

  const normalizedTitle = normalizeToken(cleaned);
  const artistMatch = artistCandidates.find((artist) => {
    const normalizedArtist = normalizeToken(artist);
    return normalizedArtist.length > 0 && normalizedTitle.endsWith(normalizedArtist);
  });

  if (artistMatch) {
    const splitPoint = cleaned.length - artistMatch.length;
    if (splitPoint > 1) {
      cleaned = cleaned.slice(0, splitPoint).trim();
    }
  }

  return cleaned;
};

const buildTitleCandidates = (value: string, artistCandidates: string[]): string[] => {
  const base = sanitizeTitle(value, artistCandidates);
  const shortByDash = base.includes("-") ? base.split("-")[0].trim() : "";
  const shortByColon = base.includes(":") ? base.split(":")[0].trim() : "";
  return dedupeByNormalized([base, shortByDash, shortByColon]).slice(0, 3);
};

const safeFetchJson = async (url: string): Promise<FetchJsonResult> => {
  try {
    const response = await fetch(url);
    let json: unknown = null;
    try {
      json = await response.json();
    } catch {
      json = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      json,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      json: null,
    };
  }
};

const toLyricsData = (lyrics: string | null, timedLines: TimedLyricLine[] = []): LyricsData => ({
  lyrics,
  timedLines,
});

const requestLyricsDirect = async (artist: string, title: string): Promise<string | null> => {
  const endpoint = `${LYRICS_UPSTREAM}/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
  const response = await safeFetchJson(endpoint);
  if (!response.ok || !response.json || typeof response.json !== "object") {
    return null;
  }
  const lyrics = (response.json as { lyrics?: unknown }).lyrics;
  if (typeof lyrics !== "string") {
    return null;
  }
  const normalized = normalizeLyrics(lyrics);
  return normalized.length > 0 ? normalized : null;
};

const requestSuggestions = async (query: string): Promise<SuggestItem[]> => {
  const response = await safeFetchJson(`${LYRICS_UPSTREAM}/suggest/${encodeURIComponent(query)}`);
  if (!response.ok || !response.json || typeof response.json !== "object") {
    return [];
  }
  const data = (response.json as { data?: unknown }).data;
  return Array.isArray(data) ? (data as SuggestItem[]) : [];
};

const scoreSuggestion = (candidate: SuggestItem, wantedTitle: string, wantedArtists: string[]): number => {
  const title = normalizeToken(candidate.title ?? "");
  const artist = normalizeToken(candidate.artist?.name ?? "");
  const targetTitle = normalizeToken(wantedTitle);

  let score = 0;
  if (targetTitle && title === targetTitle) {
    score += 5;
  } else if (targetTitle && (title.includes(targetTitle) || targetTitle.includes(title))) {
    score += 3;
  }

  wantedArtists.forEach((wantedArtist) => {
    const targetArtist = normalizeToken(wantedArtist);
    if (!targetArtist || !artist) {
      return;
    }
    if (artist === targetArtist) {
      score += 4;
      return;
    }
    if (artist.includes(targetArtist) || targetArtist.includes(artist)) {
      score += 2;
    }
  });

  return score;
};

const pickSuggestionCandidates = (
  items: SuggestItem[],
  wantedTitle: string,
  wantedArtists: string[]
): Array<{ artist: string; title: string }> => {
  const scored = items
    .slice(0, 12)
    .map((item) => ({
      item,
      score: scoreSuggestion(item, wantedTitle, wantedArtists),
    }))
    .sort((a, b) => b.score - a.score);

  const candidates = scored
    .filter((entry) => entry.score > 0)
    .map((entry) => ({
      artist: String(entry.item.artist?.name ?? "").trim(),
      title: String(entry.item.title ?? "").trim(),
    }))
    .filter((entry) => entry.artist.length > 0 && entry.title.length > 0);

  const seen = new Set<string>();
  const unique: Array<{ artist: string; title: string }> = [];
  candidates.forEach((candidate) => {
    const key = `${normalizeToken(candidate.artist)}::${normalizeToken(candidate.title)}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    unique.push(candidate);
  });
  return unique.slice(0, 4);
};

const buildLookupCombos = (artists: string[], titles: string[]) => {
  const combos: Array<{ artist: string; title: string }> = [];
  titles.slice(0, 3).forEach((title) => {
    artists.slice(0, 3).forEach((artist) => {
      combos.push({ artist, title });
    });
  });
  return combos;
};

const scoreLrcLibItem = (item: LrcLibItem, wantedArtist: string, wantedTitle: string): number => {
  const title = normalizeToken(item.trackName ?? "");
  const artist = normalizeToken(item.artistName ?? "");
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

const pickBestLrcLibLyrics = (items: LrcLibItem[], wantedArtist: string, wantedTitle: string): LyricsData | null => {
  if (!items.length) {
    return null;
  }
  const best = items
    .map((item) => ({
      score: scoreLrcLibItem(item, wantedArtist, wantedTitle),
      plainLyrics: item.plainLyrics ?? "",
      syncedLyrics: item.syncedLyrics ?? "",
    }))
    .sort((a, b) => b.score - a.score)
    .find((item) => item.plainLyrics.trim().length > 0 || item.syncedLyrics.trim().length > 0);
  if (!best) {
    return null;
  }

  const timedLines = best.syncedLyrics ? parseSyncedLyrics(best.syncedLyrics) : [];
  const plainFromSynced = timedLines.map((line) => line.text).join("\n");
  const normalized = normalizeLyrics(best.plainLyrics || plainFromSynced);
  if (!normalized.length && timedLines.length === 0) {
    return null;
  }

  return toLyricsData(normalized.length > 0 ? normalized : null, timedLines);
};

const requestLyricsFromLrcLib = async (artists: string[], titles: string[]): Promise<LyricsData | null> => {
  const combos = buildLookupCombos(artists.length > 0 ? artists : [""], titles.length > 0 ? titles : []);
  for (const combo of combos) {
    const query = new URLSearchParams();
    query.set("track_name", combo.title);
    if (combo.artist) {
      query.set("artist_name", combo.artist);
    }
    const response = await safeFetchJson(`${LRCLIB_UPSTREAM}/api/search?${query.toString()}`);
    if (!response.ok || !Array.isArray(response.json)) {
      continue;
    }
    const lyricsData = pickBestLrcLibLyrics(response.json as LrcLibItem[], combo.artist, combo.title);
    if (lyricsData) {
      return lyricsData;
    }
  }
  return null;
};

const requestLyricsFromLyricsOvh = async (
  artists: string[],
  titles: string[],
  allowDirectFallback: boolean
): Promise<string | null> => {
  const searchQueries = dedupeByNormalized(
    titles.flatMap((title) => [title, ...artists.slice(0, 2).map((artist) => `${title} ${artist}`)])
  );

  for (const query of searchQueries.slice(0, 6)) {
    const suggestions = await requestSuggestions(query);
    const candidates = pickSuggestionCandidates(suggestions, titles[0] ?? query, artists);
    for (const candidate of candidates) {
      const lyrics = await requestLyricsDirect(candidate.artist, candidate.title);
      if (lyrics) {
        return lyrics;
      }
    }
  }

  if (!allowDirectFallback) {
    return null;
  }

  const combos = buildLookupCombos(artists, titles);
  for (const combo of combos.slice(0, 6)) {
    const lyrics = await requestLyricsDirect(combo.artist, combo.title);
    if (lyrics) {
      return lyrics;
    }
  }
  return null;
};

const requestLyricsViaWebProxy = async (
  artist: string,
  title: string
): Promise<{ data: LyricsData; legacyProxy: boolean }> => {
  const endpoint = `${WEB_PROXY_BASE}/api/lyrics?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`;
  const response = await safeFetchJson(endpoint);
  if (!response.json || typeof response.json !== "object") {
    return { data: toLyricsData(null, []), legacyProxy: false };
  }

  if (response.ok) {
    const payload = (response.json as { data?: { lyrics?: unknown; timedLines?: unknown } }).data;
    const lyrics =
      typeof payload?.lyrics === "string" && payload.lyrics.trim().length > 0 ? normalizeLyrics(payload.lyrics) : null;
    const timedLinesRaw = Array.isArray(payload?.timedLines) ? payload?.timedLines : [];
    const timedLines = timedLinesRaw
      .map((item) => {
        const text = typeof (item as { text?: unknown }).text === "string" ? (item as { text: string }).text.trim() : "";
        const timeSec = Number((item as { timeSec?: unknown }).timeSec);
        if (!text || !Number.isFinite(timeSec)) {
          return null;
        }
        return { text, timeSec } as TimedLyricLine;
      })
      .filter((item): item is TimedLyricLine => item !== null);
    return { data: toLyricsData(lyrics, timedLines), legacyProxy: false };
  }

  const message = String((response.json as { message?: unknown }).message ?? "");
  const legacyProxy = message.toLowerCase().includes("route not found");
  return { data: toLyricsData(null, []), legacyProxy };
};

export const getLyricsDataForSong = async (artist: string, title: string): Promise<LyricsData> => {
  const artistCandidates = dedupeByNormalized([
    ...buildArtistCandidates(artist),
    ...inferArtistCandidatesFromTitle(title),
  ]).slice(0, 5);
  const titleCandidates = buildTitleCandidates(title, artistCandidates);
  if (titleCandidates.length === 0) {
    return toLyricsData(null, []);
  }

  try {
    const lrcLibData = await requestLyricsFromLrcLib(artistCandidates, titleCandidates);
    if (lrcLibData) {
      return lrcLibData;
    }

    if (Platform.OS === "web") {
      const primaryArtist = artistCandidates[0] ?? "";
      const primaryTitle = titleCandidates[0];
      const fromProxy = await requestLyricsViaWebProxy(primaryArtist, primaryTitle);
      if (fromProxy.data.lyrics || fromProxy.data.timedLines.length > 0) {
        return fromProxy.data;
      }
      const fallbackLyrics = await requestLyricsFromLyricsOvh(artistCandidates, titleCandidates, false);
      return toLyricsData(fallbackLyrics, []);
    }

    const nativeFallbackLyrics = await requestLyricsFromLyricsOvh(artistCandidates, titleCandidates, true);
    return toLyricsData(nativeFallbackLyrics, []);
  } catch {
    return toLyricsData(null, []);
  }
};

export const getLyricsForSong = async (artist: string, title: string): Promise<string | null> => {
  const data = await getLyricsDataForSong(artist, title);
  return data.lyrics;
};
