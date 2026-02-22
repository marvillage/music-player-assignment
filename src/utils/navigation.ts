import type { Album, Artist, Song } from "../types/music";

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/&[^;\s]+;/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

export const buildAlbumFromSong = (song: Song): Album | null => {
  const albumName = song.albumName?.trim();
  if (!albumName) {
    return null;
  }

  const fallbackId = `album-${slugify(albumName)}-${slugify(song.artist || "unknown-artist")}`;
  return {
    id: song.albumId?.trim() || fallbackId,
    name: albumName,
    artistName: song.artist,
    image: song.image,
    year: song.year,
  };
};

export const buildArtistFromSong = (song: Song): Artist => {
  const artistName = song.artist.trim() || "Unknown Artist";
  const fallbackId = `artist-${slugify(artistName)}`;

  return {
    id: song.artistId?.trim() || fallbackId,
    name: artistName,
    image: song.image,
  };
};
