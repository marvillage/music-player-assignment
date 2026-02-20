import AsyncStorage from "@react-native-async-storage/async-storage";
import { create, createJSONStorage, persist } from "./zustandCompat";

import type { HistoryEntry, Song } from "../types/music";
import type { ThemeMode } from "../constants/theme";

type AppState = {
  themeMode: ThemeMode;
  recentSearches: string[];
  recentlyPlayed: Song[];
  playbackHistory: HistoryEntry[];
  playCounts: Record<string, number>;
  searchCounts: Record<string, number>;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  addRecentSearch: (value: string) => void;
  removeRecentSearch: (value: string) => void;
  clearRecentSearches: () => void;
  pushRecentlyPlayed: (song: Song) => void;
  clearPlaybackHistory: () => void;
  topSearches: (limit?: number) => string[];
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      themeMode: "light",
      recentSearches: [],
      recentlyPlayed: [],
      playbackHistory: [],
      playCounts: {},
      searchCounts: {},
      setThemeMode: (mode) => set({ themeMode: mode }),
      toggleTheme: () => set((state) => ({ themeMode: state.themeMode === "light" ? "dark" : "light" })),
      addRecentSearch: (value) =>
        set((state) => {
          const normalized = value.trim();
          if (!normalized) {
            return state;
          }
          const deduped = state.recentSearches.filter(
            (item) => item.toLowerCase() !== normalized.toLowerCase()
          );
          const nextKey = normalized.toLowerCase();
          return {
            recentSearches: [normalized, ...deduped].slice(0, 12),
            searchCounts: {
              ...state.searchCounts,
              [nextKey]: (state.searchCounts[nextKey] ?? 0) + 1,
            },
          };
        }),
      removeRecentSearch: (value) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter(
            (item) => item.toLowerCase() !== value.toLowerCase()
          ),
        })),
      clearRecentSearches: () => set({ recentSearches: [] }),
      pushRecentlyPlayed: (song) =>
        set((state) => {
          const deduped = state.recentlyPlayed.filter((item) => item.id !== song.id);
          const nextHistory: HistoryEntry[] = [
            { songId: song.id, playedAt: Date.now() },
            ...state.playbackHistory,
          ].slice(0, 200);
          return {
            recentlyPlayed: [song, ...deduped].slice(0, 15),
            playbackHistory: nextHistory,
            playCounts: {
              ...state.playCounts,
              [song.id]: (state.playCounts[song.id] ?? 0) + 1,
            },
          };
        }),
      clearPlaybackHistory: () => set({ playbackHistory: [] }),
      topSearches: (limit = 8) =>
        Object.entries(get().searchCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([value]) => value),
    }),
    {
      name: "app-store-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        recentSearches: state.recentSearches,
        recentlyPlayed: state.recentlyPlayed,
        playbackHistory: state.playbackHistory,
        playCounts: state.playCounts,
        searchCounts: state.searchCounts,
      }),
    }
  )
);
