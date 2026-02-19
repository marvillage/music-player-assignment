import type { Song, SortOption } from "../types/music";

export const formatDuration = (durationSec: number): string => {
  if (!Number.isFinite(durationSec) || durationSec < 0) {
    return "00:00";
  }
  const min = Math.floor(durationSec / 60)
    .toString()
    .padStart(2, "0");
  const sec = Math.floor(durationSec % 60)
    .toString()
    .padStart(2, "0");
  return `${min}:${sec}`;
};

export const formatDurationLabel = (durationSec: number): string =>
  `${formatDuration(durationSec)} mins`;

export const msToSec = (value: number): number => Math.max(0, Math.floor(value / 1000));

export const secToMs = (value: number): number => Math.max(0, Math.floor(value * 1000));

export const sortSongs = (songs: Song[], option: SortOption): Song[] => {
  const copy = [...songs];
  switch (option) {
    case "Ascending":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "Descending":
      return copy.sort((a, b) => b.title.localeCompare(a.title));
    case "Artist":
      return copy.sort((a, b) => a.artist.localeCompare(b.artist));
    case "Album":
      return copy.sort((a, b) => (a.albumName ?? "").localeCompare(b.albumName ?? ""));
    case "Year":
      return copy.sort((a, b) => (b.year ?? "").localeCompare(a.year ?? ""));
    default:
      return copy;
  }
};

