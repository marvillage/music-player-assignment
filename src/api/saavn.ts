import type { Album, Artist, PaginatedResult, Song } from "../types/music";
import { Platform } from "react-native";
import { pickBestImage } from "../utils/image";

const BASE_URL = Platform.OS === "web" ? "http://localhost:8787" : "https://saavn.sumit.co";
const PAGE_SIZE = 20;
const MAX_RETRIES = 2;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

type AnyObject = Record<string, any>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const extractArtistName = (raw: AnyObject): string => {
  if (typeof raw.primaryArtists === "string" && raw.primaryArtists.trim().length > 0) {
    return raw.primaryArtists;
  }
  const primary = raw.artists?.primary;
  if (Array.isArray(primary) && primary.length > 0) {
    return primary.map((item: AnyObject) => item?.name).filter(Boolean).join(", ");
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
    id: String(raw.id ?? ""),
    title: String(raw.name ?? "Unknown Song"),
    artist: extractArtistName(raw),
    albumId: raw.album?.id ? String(raw.album.id) : undefined,
    albumName: raw.album?.name ? String(raw.album.name) : undefined,
    year: raw.year ? String(raw.year) : undefined,
    language: raw.language ? String(raw.language) : undefined,
    durationSec: toNumber(raw.duration),
    image: pickBestImage(raw.image),
    streamUrls,
  };
};

const normalizeArtist = (raw: AnyObject): Artist => ({
  id: String(raw.id ?? ""),
  name: String(raw.name ?? "Unknown Artist"),
  image: pickBestImage(raw.image),
  albumCount: toNumber(raw?.dominantType === "artist" ? raw?.albumCount : raw?.albums),
  songCount: toNumber(raw.songCount ?? raw.songs),
  subtitle:
    typeof raw.subtitle === "string"
      ? raw.subtitle
      : raw.description
      ? String(raw.description)
      : undefined,
});

const normalizeAlbum = (raw: AnyObject): Album => ({
  id: String(raw.id ?? ""),
  name: String(raw.name ?? "Unknown Album"),
  image: pickBestImage(raw.image),
  artistName: String(raw.primaryArtists ?? raw.artist ?? "Unknown Artist"),
  year: raw.year ? String(raw.year) : undefined,
  songCount: toNumber(raw.songCount ?? raw.songs),
  subtitle: raw.language ? `${String(raw.language)} music` : undefined,
});

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
    try {
      const response = await fetch(url.toString(), {
        headers: { accept: "application/json" },
      });

      if (response.ok) {
        return (await response.json()) as AnyObject;
      }

      lastError = `API error ${response.status}`;
      if (attempt < MAX_RETRIES && RETRYABLE_STATUS.has(response.status)) {
        await sleep(400 * (attempt + 1));
        continue;
      }
      throw new Error(lastError);
    } catch (error) {
      lastError = String(error);
      if (attempt < MAX_RETRIES) {
        await sleep(350 * (attempt + 1));
        continue;
      }
      const proxyHint =
        Platform.OS === "web"
          ? " For web, run `npm run saavn-proxy` in another terminal."
          : "";
      throw new Error(`${lastError}${proxyHint}`);
    }
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
  const json = await fetchJson(`/api/artists/${id}`);
  const data = unwrapData(json);
  if (!data || typeof data !== "object") {
    return null;
  }
  return normalizeArtist(data);
};

export const getArtistSongs = async (id: string, page = 1): Promise<PaginatedResult<Song>> => {
  const json = await fetchJson(`/api/artists/${id}/songs`, { page, limit: PAGE_SIZE });
  return normalizeListResponse(json, page, normalizeSong);
};

export const getAlbumById = async (id: string): Promise<{ album: Album | null; songs: Song[] }> => {
  const json = await fetchJson(`/api/albums/${id}`);
  const data = unwrapData(json);
  const albumRaw =
    (data.album as AnyObject | undefined) ??
    (typeof data === "object" && !Array.isArray(data) ? (data as AnyObject) : undefined);
  const songsRaw = Array.isArray(data.songs)
    ? data.songs
    : Array.isArray(data.results)
    ? data.results
    : [];

  return {
    album: albumRaw ? normalizeAlbum(albumRaw) : null,
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

  const search = await searchSongs(`${album.name} ${album.artistName}`, 1);
  return search.items.filter((song) => {
    if (!song.albumId) {
      return false;
    }
    return song.albumId === album.id || song.albumName?.toLowerCase() === album.name.toLowerCase();
  });
};
