import AsyncStorage from "@react-native-async-storage/async-storage";
import { create, createJSONStorage, persist } from "./zustandCompat";

import type { Song } from "../types/music";
import type { ThemeMode } from "../constants/theme";

type AppState = {
  themeMode: ThemeMode;
  recentSearches: string[];
  recentlyPlayed: Song[];
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  addRecentSearch: (value: string) => void;
  removeRecentSearch: (value: string) => void;
  clearRecentSearches: () => void;
  pushRecentlyPlayed: (song: Song) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: "light",
      recentSearches: [],
      recentlyPlayed: [],
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
          return { recentSearches: [normalized, ...deduped].slice(0, 12) };
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
          return { recentlyPlayed: [song, ...deduped].slice(0, 15) };
        }),
    }),
    {
      name: "app-store-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        recentSearches: state.recentSearches,
        recentlyPlayed: state.recentlyPlayed,
      }),
    }
  )
);
