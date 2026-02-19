import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create, createJSONStorage, persist } from "./zustandCompat";

import type { Playlist, Song } from "../types/music";
import { pickHighestQualityUrl } from "../utils/image";

type LibraryState = {
  favorites: string[];
  playlists: Playlist[];
  downloaded: Record<string, string>;
  songCache: Record<string, Song>;
  toggleFavorite: (song: Song) => void;
  isFavorite: (songId: string) => boolean;
  cacheSongs: (songs: Song[]) => void;
  createPlaylist: (name: string) => string;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  downloadSong: (song: Song) => Promise<string | null>;
  removeDownload: (songId: string) => Promise<void>;
};

const DEFAULT_PLAYLIST: Playlist = {
  id: "liked",
  name: "Liked Songs",
  songIds: [],
};

const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ""}downloads/`;

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      playlists: [DEFAULT_PLAYLIST],
      downloaded: {},
      songCache: {},
      toggleFavorite: (song) =>
        set((state) => {
          const isPresent = state.favorites.includes(song.id);
          const favorites = isPresent
            ? state.favorites.filter((id) => id !== song.id)
            : [song.id, ...state.favorites];
          const liked = state.playlists.find((item) => item.id === "liked");
          const updatedLiked = liked
            ? {
                ...liked,
                songIds: isPresent
                  ? liked.songIds.filter((id) => id !== song.id)
                  : [song.id, ...liked.songIds.filter((id) => id !== song.id)],
              }
            : DEFAULT_PLAYLIST;
          return {
            favorites,
            playlists: [updatedLiked, ...state.playlists.filter((item) => item.id !== "liked")],
            songCache: { ...state.songCache, [song.id]: song },
          };
        }),
      isFavorite: (songId) => get().favorites.includes(songId),
      cacheSongs: (songs) =>
        set((state) => {
          if (songs.length === 0) {
            return state;
          }
          const cache = { ...state.songCache };
          songs.forEach((song) => {
            cache[song.id] = song;
          });
          return { songCache: cache };
        }),
      createPlaylist: (name) => {
        const id = `playlist-${Date.now().toString(16)}`;
        set((state) => ({
          playlists: [...state.playlists, { id, name, songIds: [] }],
        }));
        return id;
      },
      addSongToPlaylist: (playlistId, song) =>
        set((state) => ({
          playlists: state.playlists.map((playlist) =>
            playlist.id === playlistId
              ? {
                  ...playlist,
                  songIds: [song.id, ...playlist.songIds.filter((id) => id !== song.id)],
                }
              : playlist
          ),
          songCache: { ...state.songCache, [song.id]: song },
        })),
      removeSongFromPlaylist: (playlistId, songId) =>
        set((state) => ({
          playlists: state.playlists.map((playlist) =>
            playlist.id === playlistId
              ? { ...playlist, songIds: playlist.songIds.filter((id) => id !== songId) }
              : playlist
          ),
        })),
      downloadSong: async (song) => {
        const existing = get().downloaded[song.id];
        if (existing) {
          return existing;
        }

        const streamUrl = pickHighestQualityUrl(song.streamUrls);
        if (!streamUrl) {
          return null;
        }

        try {
          await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
        } catch {
          // no-op
        }

        const target = `${DOWNLOAD_DIR}${song.id}.mp4`;
        const result = await FileSystem.downloadAsync(streamUrl, target);

        set((state) => ({
          downloaded: { ...state.downloaded, [song.id]: result.uri },
          songCache: { ...state.songCache, [song.id]: song },
        }));

        return result.uri;
      },
      removeDownload: async (songId) => {
        const uri = get().downloaded[songId];
        if (uri) {
          try {
            await FileSystem.deleteAsync(uri, { idempotent: true });
          } catch {
            // no-op
          }
        }
        set((state) => {
          const next = { ...state.downloaded };
          delete next[songId];
          return { downloaded: next };
        });
      },
    }),
    {
      name: "library-store-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        playlists: state.playlists,
        downloaded: state.downloaded,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<LibraryState>) };
        if (!merged.playlists.some((playlist) => playlist.id === "liked")) {
          merged.playlists = [DEFAULT_PLAYLIST, ...merged.playlists];
        }
        return merged;
      },
    }
  )
);
