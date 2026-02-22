import type { Album, Artist, PaginatedResult, Song } from "../types/music";
import { Platform } from "react-native";
import { pickBestImage } from "../utils/image";

const BASE_URL = Platform.OS === "web" ? "http://localhost:8787" : "https://saavn.sumit.co";
const PAGE_SIZE = 20;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);
const failedArtistDetailIds = new Set<string>();

type AnyObject = Record<string, any>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeToken = (value: unknown): string =>
  String(value ?? "")
    .toLowerCase()
    .replace(/&[^;\s]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

const buildStableId = (prefix: string, ...parts: unknown[]): string => {
  const key = parts
    .map((part) => normalizeToken(part))
    .filter((part) => part.length > 0)
    .join("-");
  return key.length > 0 ? `${prefix}-${key}` : `${prefix}-unknown`;
};

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n)) {
      return n;
    }
  }
  return 0;
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const decodeHtmlEntities = (value: unknown): string => {
  const input = String(value ?? "");
  if (!input.includes("&")) {
    return input;
  }

  const namedEntities: Record<string, string> = {
    amp: "&",
    quot: '"',
    apos: "'",
    lt: "<",
    gt: ">",
  };

  return input.replace(/&(#x?[0-9a-f]+|amp|quot|apos|lt|gt);/gi, (entity, code) => {
    const normalized = String(code).toLowerCase();
    if (normalized in namedEntities) {
      return namedEntities[normalized];
    }
    if (normalized.startsWith("#x")) {
      const parsed = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : entity;
    }
    if (normalized.startsWith("#")) {
      const parsed = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(parsed) ? String.fromCharCode(parsed) : entity;
    }
    return entity;
  });
};

const sanitizeId = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = String(value).trim();
  if (!normalized || normalized === "0" || normalized.toLowerCase() === "null") {
    return undefined;
  }
  return normalized;
};

const extractIdFromUrl = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const match = value.match(/\/([0-9]{4,})[_/?#]?/);
  if (!match) {
    return undefined;
  }
  return sanitizeId(match[1]);
};

const extractArtistName = (raw: AnyObject): string => {
  if (typeof raw.primaryArtists === "string" && raw.primaryArtists.trim().length > 0) {
    return decodeHtmlEntities(raw.primaryArtists).trim();
  }
  const primary = raw.artists?.primary;
  if (Array.isArray(primary) && primary.length > 0) {
    const names = primary
      .map((item: AnyObject) => decodeHtmlEntities(item?.name ?? "").trim())
      .filter((name: string) => name.length > 0);
    if (names.length > 0) {
      return names.join(", ");
    }
  }
  return "Unknown Artist";
};

const extractArtistId = (raw: AnyObject): string | undefined => {
  const primary = raw.artists?.primary;
  if (Array.isArray(primary) && primary.length > 0) {
    const primaryId = sanitizeId(primary[0]?.id);
    if (primaryId) {
      return primaryId;
    }
  }

  if (typeof raw.primaryArtistsId === "string" && raw.primaryArtistsId.trim().length > 0) {
    const [first] = raw.primaryArtistsId.split(",");
    const primaryId = sanitizeId(first);
    if (primaryId) {
      return primaryId;
    }
  }

  const allArtists = raw.artists?.all;
  if (Array.isArray(allArtists) && allArtists.length > 0) {
    const firstAllId = sanitizeId(allArtists[0]?.id);
    if (firstAllId) {
      return firstAllId;
    }
  }

  return sanitizeId(raw.artistId) ?? extractIdFromUrl(raw.url);
};

const extractSongAlbumId = (raw: AnyObject): string | undefined =>
  sanitizeId(raw.album?.id) ??
  sanitizeId(raw.albumId) ??
  sanitizeId(raw.albumid) ??
  sanitizeId(raw.more_info?.album_id);

const extractSongAlbumName = (raw: AnyObject): string | undefined => {
  const direct = raw.album?.name ?? raw.albumName ?? raw.album;
  if (typeof direct !== "string" || direct.trim().length === 0) {
    return undefined;
  }
  return decodeHtmlEntities(direct).trim();
};

const extractAlbumArtistName = (raw: AnyObject): string => {
  if (typeof raw.primaryArtists === "string" && raw.primaryArtists.trim().length > 0) {
    return decodeHtmlEntities(raw.primaryArtists).trim();
  }
  if (typeof raw.artist === "string" && raw.artist.trim().length > 0) {
    return decodeHtmlEntities(raw.artist).trim();
  }

  const primary = raw.artists?.primary;
  if (Array.isArray(primary) && primary.length > 0) {
    const names = primary
      .map((item: AnyObject) => decodeHtmlEntities(item?.name ?? "").trim())
      .filter((name: string) => name.length > 0);
    if (names.length > 0) {
      return names.join(", ");
    }
  }
  return "Unknown Artist";
};

const normalizeSong = (raw: AnyObject): Song => {
  const streamUrls = Array.isArray(raw.downloadUrl)
    ? raw.downloadUrl
        .map((item: AnyObject) => ({
          quality: String(item?.quality ?? "unknown"),
          url: String(item?.url ?? item?.link ?? ""),
        }))
        .filter((item: { quality: string; url: string }) => item.url.length > 0)
    : [];

  return {
    id:
      sanitizeId(raw.id) ??
      buildStableId(
        "song",
        raw.name,
        raw.primaryArtists ?? raw.artist,
        raw.album?.name ?? raw.albumName,
        raw.year
      ),
    title: decodeHtmlEntities(raw.name ?? "Unknown Song"),
    artist: extractArtistName(raw),
    artistId: extractArtistId(raw),
    albumId: extractSongAlbumId(raw),
    albumName: extractSongAlbumName(raw),
    year: raw.year ? String(raw.year) : undefined,
    language: raw.language ? String(raw.language) : undefined,
    durationSec: toNumber(raw.duration),
    image: pickBestImage(raw.image),
    streamUrls,
  };
};

const normalizeArtist = (raw: AnyObject): Artist => {
  const name = decodeHtmlEntities(raw.name ?? "Unknown Artist");
  return {
    id: sanitizeId(raw.id) ?? sanitizeId(raw.artistId) ?? extractIdFromUrl(raw.url) ?? buildStableId("artist", name),
    name,
    image: pickBestImage(raw.image),
    albumCount: toOptionalNumber(raw.albumCount ?? raw.albums ?? raw.topAlbums?.length),
    songCount: toOptionalNumber(raw.songCount ?? raw.songs ?? raw.topSongs?.length),
    subtitle:
      typeof raw.subtitle === "string"
        ? decodeHtmlEntities(raw.subtitle)
        : raw.description
        ? decodeHtmlEntities(raw.description)
        : undefined,
  };
};

const normalizeAlbum = (raw: AnyObject): Album => {
  const name = decodeHtmlEntities(raw.name ?? "Unknown Album");
  const artistName = extractAlbumArtistName(raw);
  return {
    id:
      sanitizeId(raw.id) ??
      sanitizeId(raw.albumId) ??
      sanitizeId(raw.albumid) ??
      extractIdFromUrl(raw.url) ??
      buildStableId("album", name, artistName, raw.year),
    name,
    image: pickBestImage(raw.image),
    artistName,
    year: raw.year ? String(raw.year) : undefined,
    songCount: toNumber(raw.songCount ?? raw.songs),
    subtitle: raw.language ? `${decodeHtmlEntities(raw.language)} music` : undefined,
  };
};

const unwrapData = (json: AnyObject): AnyObject => {
  if (json?.data && typeof json.data === "object") {
    return json.data;
  }
  return json;
};

const normalizeListResponse = <T>(
  json: AnyObject,
  page: number,
  mapper: (raw: AnyObject) => T
): PaginatedResult<T> => {
  const data = unwrapData(json);
  const results = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : Array.isArray(data.songs)
    ? data.songs
    : Array.isArray(data.topSongs)
    ? data.topSongs
    : [];
  const items = results.map((item: AnyObject) => mapper(item)).filter(Boolean);
  const total = toNumber(data.total || data.totalResults || items.length);
  const hasMore = items.length >= PAGE_SIZE && page * PAGE_SIZE < total;
  return { items, total, page, hasMore };
};

const fetchJson = async (path: string, params: Record<string, string | number | undefined> = {}) => {
  const url = new URL(path, BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  let lastError = "Unknown error";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: { accept: "application/json" },
      });
    } catch (error) {
      lastError = String(error);
      if (attempt < MAX_RETRIES) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      const proxyHint =
        Platform.OS === "web"
          ? " For web, run `npm run saavn-proxy` in another terminal."
          : "";
      throw new Error(`${lastError}${proxyHint}`);
    }

    if (response.ok) {
      return (await response.json()) as AnyObject;
    }

    lastError = `API error ${response.status}`;
    if (attempt < MAX_RETRIES && RETRYABLE_STATUS.has(response.status)) {
      await sleep(400 * (attempt + 1));
      continue;
    }

    throw new Error(lastError);
  }

  throw new Error(lastError);
};

export const searchSongs = async (query: string, page = 1): Promise<PaginatedResult<Song>> => {
  const json = await fetchJson("/api/search/songs", { query, page, limit: PAGE_SIZE });
  return normalizeListResponse(json, page, normalizeSong);
};

export const searchArtists = async (query: string, page = 1): Promise<PaginatedResult<Artist>> => {
  const json = await fetchJson("/api/search/artists", { query, page, limit: PAGE_SIZE });
  return normalizeListResponse(json, page, normalizeArtist);
};

export const searchAlbums = async (query: string, page = 1): Promise<PaginatedResult<Album>> => {
  const json = await fetchJson("/api/search/albums", { query, page, limit: PAGE_SIZE });
  return normalizeListResponse(json, page, normalizeAlbum);
};

export const getSongById = async (id: string): Promise<Song | null> => {
  const json = await fetchJson(`/api/songs/${id}`);
  const data = unwrapData(json);
  const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
  if (list.length === 0) {
    return null;
  }
  return normalizeSong(list[0]);
};

export const getArtistById = async (id: string): Promise<Artist | null> => {
  const artistId = sanitizeId(id);
  if (!artistId || failedArtistDetailIds.has(artistId)) {
    return null;
  }

  try {
    const json = await fetchJson(`/api/artists/${artistId}`);
    const data = unwrapData(json);
    if (!data || typeof data !== "object") {
      failedArtistDetailIds.add(artistId);
      return null;
    }
    return normalizeArtist(data);
  } catch {
    failedArtistDetailIds.add(artistId);
    return null;
  }
};

export const getArtistSongs = async (id: string, page = 1): Promise<PaginatedResult<Song>> => {
  const artistId = sanitizeId(id);
  if (!artistId) {
    return { items: [], total: 0, page, hasMore: false };
  }

  try {
    const json = await fetchJson(`/api/artists/${artistId}/songs`, { page, limit: PAGE_SIZE });
    return normalizeListResponse(json, page, normalizeSong);
  } catch {
    return { items: [], total: 0, page, hasMore: false };
  }
};

export const getAlbumById = async (id: string): Promise<{ album: Album | null; songs: Song[] }> => {
  const albumId = sanitizeId(id);
  if (!albumId) {
    return { album: null, songs: [] };
  }

  const json = await fetchJson("/api/albums", { id: albumId });
  const data = unwrapData(json);
  const albumRaw =
    (data.album as AnyObject | undefined) ??
    (typeof data === "object" && !Array.isArray(data) ? (data as AnyObject) : undefined);
  const songsRaw = Array.isArray(data.songs)
    ? data.songs
    : Array.isArray(data.results)
    ? data.results
    : [];

  const album = albumRaw ? normalizeAlbum(albumRaw) : null;
  if (!album || album.id !== albumId) {
    return { album: null, songs: [] };
  }

  return {
    album,
    songs: songsRaw.map((item: AnyObject) => normalizeSong(item)),
  };
};

export const getAlbumSongs = async (album: Album): Promise<Song[]> => {
  try {
    const detail = await getAlbumById(album.id);
    if (detail.songs.length > 0) {
      return detail.songs;
    }
  } catch {
    // no-op
  }

  const normalizedAlbumName = album.name.trim().toLowerCase();
  if (!normalizedAlbumName || normalizedAlbumName === "album") {
    return [];
  }

  const normalizedArtist = album.artistName.trim().toLowerCase();
  const search = await searchSongs(`${album.name} ${album.artistName}`, 1);
  return search.items.filter((song) => {
    const byAlbumId = Boolean(song.albumId && song.albumId === album.id);
    const byAlbumName = song.albumName?.trim().toLowerCase() === normalizedAlbumName;
    if (byAlbumId) {
      return true;
    }
    if (!byAlbumName) {
      return false;
    }
    if (!normalizedArtist) {
      return true;
    }
    return song.artist.toLowerCase().includes(normalizedArtist);
  });
};
