export type MediaLink = {
  quality: string;
  url: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  albumId?: string;
  albumName?: string;
  year?: string;
  language?: string;
  durationSec: number;
  image: string;
  streamUrls: MediaLink[];
};

export type Artist = {
  id: string;
  name: string;
  image: string;
  albumCount?: number;
  songCount?: number;
  subtitle?: string;
};

export type Album = {
  id: string;
  name: string;
  image: string;
  artistName: string;
  year?: string;
  songCount?: number;
  subtitle?: string;
};

export type Playlist = {
  id: string;
  name: string;
  songIds: string[];
};

export type HistoryEntry = {
  songId: string;
  playedAt: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
};

export type SortOption =
  | "Ascending"
  | "Descending"
  | "Artist"
  | "Album"
  | "Year"
  | "Date Added"
  | "Date Modified"
  | "Composer";
