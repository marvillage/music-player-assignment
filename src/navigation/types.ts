import type { Album, Artist, Song } from "../types/music";

export type RootStackParamList = {
  MainTabs: undefined;
  Search: undefined;
  Player: { song?: Song; sourceQueue?: Song[]; startIndex?: number } | undefined;
  ArtistDetails: { artist: Artist };
  AlbumDetails: { album: Album };
  Queue: undefined;
  PlaylistDetails: { playlistId: string };
  History: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Favorites: undefined;
  Playlists: undefined;
  Settings: undefined;
};
