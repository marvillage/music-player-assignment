import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create, createJSONStorage, persist } from "./zustandCompat";
import { Platform } from "react-native";

import type { Playlist, Song } from "../types/music";
import { pickHighestQualityUrl } from "../utils/image";

type LibraryState = {
  favorites: string[];
  playlists: Playlist[];
  downloaded: Record<string, string>;
  songCache: Record<string, Song>;
  followedArtists: string[];
  followedAlbums: string[];
  toggleFavorite: (song: Song) => void;
  isFavorite: (songId: string) => boolean;
  cacheSongs: (songs: Song[]) => void;
  createPlaylist: (name: string) => string;
  renamePlaylist: (playlistId: string, name: string) => void;
  deletePlaylist: (playlistId: string) => void;
  addSongToPlaylist: (playlistId: string, song: Song) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  moveSongInPlaylist: (playlistId: string, from: number, to: number) => void;
  toggleFollowArtist: (artistId: string) => void;
  toggleFollowAlbum: (albumId: string) => void;
  isFollowingArtist: (artistId: string) => boolean;
  isFollowingAlbum: (albumId: string) => boolean;
  downloadSong: (song: Song) => Promise<string | null>;
  removeDownload: (songId: string) => Promise<void>;
};

const DEFAULT_PLAYLIST: Playlist = {
  id: "liked",
  name: "Liked Songs",
  songIds: [],
};

const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ""}downloads/`;
const IS_WEB = Platform.OS === "web";

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      favorites: [],
      playlists: [DEFAULT_PLAYLIST],
      downloaded: {},
      songCache: {},
      followedArtists: [],
      followedAlbums: [],
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
        const normalized = name.trim();
        const id = `playlist-${Date.now().toString(16)}`;
        const playlistName = normalized.length > 0 ? normalized : "New Playlist";
        set((state) => ({
          playlists: [...state.playlists, { id, name: playlistName, songIds: [] }],
        }));
        return id;
      },
      renamePlaylist: (playlistId, name) =>
        set((state) => {
          if (playlistId === "liked") {
            return state;
          }
          const normalized = name.trim();
          if (!normalized) {
            return state;
          }
          return {
            playlists: state.playlists.map((playlist) =>
              playlist.id === playlistId ? { ...playlist, name: normalized } : playlist
            ),
          };
        }),
      deletePlaylist: (playlistId) =>
        set((state) => ({
          playlists:
            playlistId === "liked"
              ? state.playlists
              : state.playlists.filter((playlist) => playlist.id !== playlistId),
        })),
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
      moveSongInPlaylist: (playlistId, from, to) =>
        set((state) => ({
          playlists: state.playlists.map((playlist) => {
            if (playlist.id !== playlistId || from === to) {
              return playlist;
            }
            if (from < 0 || to < 0 || from >= playlist.songIds.length || to >= playlist.songIds.length) {
              return playlist;
            }
            const nextIds = [...playlist.songIds];
            const [moved] = nextIds.splice(from, 1);
            nextIds.splice(to, 0, moved);
            return { ...playlist, songIds: nextIds };
          }),
        })),
      toggleFollowArtist: (artistId) =>
        set((state) => {
          const already = state.followedArtists.includes(artistId);
          return {
            followedArtists: already
              ? state.followedArtists.filter((id) => id !== artistId)
              : [artistId, ...state.followedArtists],
          };
        }),
      toggleFollowAlbum: (albumId) =>
        set((state) => {
          const already = state.followedAlbums.includes(albumId);
          return {
            followedAlbums: already
              ? state.followedAlbums.filter((id) => id !== albumId)
              : [albumId, ...state.followedAlbums],
          };
        }),
      isFollowingArtist: (artistId) => get().followedArtists.includes(artistId),
      isFollowingAlbum: (albumId) => get().followedAlbums.includes(albumId),
      downloadSong: async (song) => {
        const existing = get().downloaded[song.id];
        if (existing) {
          return existing;
        }

        const streamUrl = pickHighestQualityUrl(song.streamUrls);
        if (!streamUrl) {
          return null;
        }

        if (IS_WEB || typeof FileSystem.downloadAsync !== "function") {
          // Web doesn't support expo-file-system downloads; keep a playable URL fallback.
          set((state) => ({
            downloaded: { ...state.downloaded, [song.id]: streamUrl },
            songCache: { ...state.songCache, [song.id]: song },
          }));
          return streamUrl;
        }

        try {
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
        } catch {
          return null;
        }
      },
      removeDownload: async (songId) => {
        const uri = get().downloaded[songId];
        if (uri && !IS_WEB) {
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
        followedArtists: state.followedArtists,
        followedAlbums: state.followedAlbums,
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
