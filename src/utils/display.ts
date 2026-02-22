import type { Artist } from "../types/music";
import { formatDurationLabel } from "./format";

export const formatCountLabel = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

export const formatArtistStats = (albumCount: number, songCount: number): string =>
  `${formatCountLabel(albumCount, "Album")} | ${formatCountLabel(songCount, "Song")}`;

export const formatArtistStatsFrom = (artist: Pick<Artist, "albumCount" | "songCount">): string =>
  formatArtistStats(artist.albumCount ?? 0, artist.songCount ?? 0);

export const formatAlbumMeta = (artistName: string, year?: string): string =>
  year ? `${artistName} | ${year}` : artistName;

export const formatSongMeta = (artist: string, durationSec: number): string =>
  `${artist} | ${formatDurationLabel(durationSec)}`;

export const formatSongByline = (title: string, artist: string): string => `${title} - ${artist}`;

