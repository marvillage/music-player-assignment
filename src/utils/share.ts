import { Share } from "react-native";

import type { Album, Artist, Playlist, Song } from "../types/music";

const APP_LINK = "https://lokal-music.example/app";

export const shareSong = async (song: Song) => {
  await Share.share({
    title: `${song.title} - ${song.artist}`,
    message: `Listening to "${song.title}" by ${song.artist} on Lokal Music.\n${APP_LINK}/song/${song.id}`,
  });
};

export const shareAlbum = async (album: Album) => {
  await Share.share({
    title: album.name,
    message: `Check out album "${album.name}" by ${album.artistName}.\n${APP_LINK}/album/${album.id}`,
  });
};

export const shareArtist = async (artist: Artist) => {
  await Share.share({
    title: artist.name,
    message: `Check out artist "${artist.name}" on Lokal Music.\n${APP_LINK}/artist/${artist.id}`,
  });
};

export const sharePlaylist = async (playlist: Pick<Playlist, "id" | "name">, songsCount: number) => {
  await Share.share({
    title: playlist.name,
    message: `Listen to my playlist "${playlist.name}" (${songsCount} songs).\n${APP_LINK}/playlist/${playlist.id}`,
  });
};
