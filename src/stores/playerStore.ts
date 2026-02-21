import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create, createJSONStorage, persist } from "./zustandCompat";

import type { Song } from "../types/music";
import { pickHighestQualityUrl } from "../utils/image";
import { msToSec, secToMs } from "../utils/format";
import { useAppStore } from "./appStore";
import { useLibraryStore } from "./libraryStore";

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  durationSec: number;
  positionSec: number;
  playbackRate: number;
  repeatMode: RepeatMode;
  shuffleEnabled: boolean;
  sleepTimerEndsAt: number | null;
  sound: Audio.Sound | null;
  initialized: boolean;
  hydrated: boolean;
  initialize: () => Promise<void>;
  restore: () => Promise<void>;
  currentSong: () => Song | null;
  setQueueAndPlay: (songs: Song[], startIndex?: number) => Promise<void>;
  playSongNow: (song: Song) => Promise<void>;
  playFromQueue: (index: number, shouldPlay?: boolean) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (positionSec: number) => Promise<void>;
  jumpBy: (deltaSec: number) => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  addToQueue: (song: Song) => void;
  addPlayNext: (song: Song) => void;
  moveQueueItem: (from: number, to: number) => void;
  removeFromQueue: (index: number) => Promise<void>;
  clearQueue: () => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  cyclePlaybackRate: () => Promise<void>;
  toggleShuffle: () => void;
  cycleRepeatMode: () => void;
  setSleepTimer: (minutes: number) => void;
  clearSleepTimer: () => void;
  playTrackEndBehavior: () => Promise<void>;
};

const resolvePlayableUri = (song: Song): string | null => {
  const downloads = useLibraryStore.getState().downloaded;
  if (downloads[song.id]) {
    return downloads[song.id];
  }
  return pickHighestQualityUrl(song.streamUrls);
};

const stopAndRelease = async (sound: Audio.Sound | null) => {
  if (!sound) {
    return;
  }
  try {
    await sound.stopAsync();
  } catch {
    // no-op
  }
  try {
    await sound.unloadAsync();
  } catch {
    // no-op
  }
};

let sleepTimerHandle: ReturnType<typeof setTimeout> | null = null;

const clearSleepTimerHandle = () => {
  if (!sleepTimerHandle) {
    return;
  }
  clearTimeout(sleepTimerHandle);
  sleepTimerHandle = null;
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      durationSec: 0,
      positionSec: 0,
      playbackRate: 1,
      repeatMode: "off",
      shuffleEnabled: false,
      sleepTimerEndsAt: null,
      sound: null,
      initialized: false,
      hydrated: false,
      initialize: async () => {
        if (get().initialized) {
          return;
        }
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          interruptionModeIOS: InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
        });
        set({ initialized: true });
      },
      restore: async () => {
        if (!get().hydrated || get().queue.length === 0 || get().currentIndex < 0 || get().sound) {
          return;
        }
        await get().playFromQueue(get().currentIndex, false);
      },
      currentSong: () => {
        const state = get();
        if (state.currentIndex < 0 || state.currentIndex >= state.queue.length) {
          return null;
        }
        return state.queue[state.currentIndex];
      },
      setQueueAndPlay: async (songs, startIndex = 0) => {
        if (songs.length === 0) {
          return;
        }
        useLibraryStore.getState().cacheSongs(songs);
        set({ queue: songs, currentIndex: Math.max(0, Math.min(startIndex, songs.length - 1)) });
        await get().playFromQueue(get().currentIndex, true);
      },
      playSongNow: async (song) => {
        useLibraryStore.getState().cacheSongs([song]);
        set({ queue: [song], currentIndex: 0 });
        await get().playFromQueue(0, true);
      },
      playFromQueue: async (index, shouldPlay = true) => {
        const state = get();
        if (index < 0 || index >= state.queue.length) {
          return;
        }

        await get().initialize();
        await stopAndRelease(state.sound);

        const song = state.queue[index];
        const uri = resolvePlayableUri(song);
        if (!uri) {
          return;
        }

        const { sound, status } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay,
            positionMillis: 0,
            progressUpdateIntervalMillis: 400,
            rate: state.playbackRate,
            shouldCorrectPitch: true,
          },
          (playbackStatus) => {
            if (!playbackStatus.isLoaded) {
              return;
            }
            set({
              isPlaying: playbackStatus.isPlaying,
              durationSec: msToSec(playbackStatus.durationMillis ?? 0),
              positionSec: msToSec(playbackStatus.positionMillis ?? 0),
            });

            if (playbackStatus.didJustFinish) {
              void get().playTrackEndBehavior();
            }
          }
        );

        set({
          sound,
          currentIndex: index,
          isPlaying: shouldPlay,
          durationSec: status.isLoaded ? msToSec(status.durationMillis ?? 0) : song.durationSec,
          positionSec: 0,
        });

        useAppStore.getState().pushRecentlyPlayed(song);
      },
      togglePlayPause: async () => {
        const state = get();
        if (!state.sound) {
          if (state.currentIndex >= 0) {
            await get().playFromQueue(state.currentIndex, true);
          }
          return;
        }
        const status = await state.sound.getStatusAsync();
        if (!status.isLoaded) {
          return;
        }
        if (status.isPlaying) {
          await state.sound.pauseAsync();
          set({ isPlaying: false });
        } else {
          await state.sound.playAsync();
          set({ isPlaying: true });
        }
      },
      seekTo: async (positionSec) => {
        const sound = get().sound;
        if (!sound) {
          return;
        }
        await sound.setPositionAsync(secToMs(positionSec));
        set({ positionSec: Math.max(0, positionSec) });
      },
      jumpBy: async (deltaSec) => {
        const state = get();
        const next = Math.max(0, Math.min(state.durationSec || 0, state.positionSec + deltaSec));
        await state.seekTo(next);
      },
      skipNext: async () => {
        const state = get();
        if (state.queue.length === 0) {
          return;
        }
        if (state.shuffleEnabled && state.queue.length > 1) {
          let random = state.currentIndex;
          while (random === state.currentIndex) {
            random = Math.floor(Math.random() * state.queue.length);
          }
          await state.playFromQueue(random, true);
          return;
        }

        const nextIndex = state.currentIndex + 1;
        if (nextIndex < state.queue.length) {
          await state.playFromQueue(nextIndex, true);
          return;
        }

        if (state.repeatMode === "all") {
          await state.playFromQueue(0, true);
        } else if (state.repeatMode === "one") {
          await state.playFromQueue(state.currentIndex, true);
        } else {
          set({ isPlaying: false, positionSec: 0 });
        }
      },
      skipPrevious: async () => {
        const state = get();
        if (state.positionSec > 3) {
          await state.seekTo(0);
          return;
        }
        const prev = state.currentIndex - 1;
        if (prev >= 0) {
          await state.playFromQueue(prev, true);
        } else {
          await state.playFromQueue(0, true);
        }
      },
      addToQueue: (song) => {
        useLibraryStore.getState().cacheSongs([song]);
        set((state) => ({ queue: [...state.queue, song] }));
      },
      addPlayNext: (song) => {
        useLibraryStore.getState().cacheSongs([song]);
        set((state) => {
          if (state.currentIndex < 0) {
            return { queue: [song], currentIndex: 0 };
          }
          const at = state.currentIndex + 1;
          const copy = [...state.queue];
          copy.splice(at, 0, song);
          return { queue: copy };
        });
      },
      moveQueueItem: (from, to) =>
        set((state) => {
          if (from === to || from < 0 || to < 0 || from >= state.queue.length || to >= state.queue.length) {
            return state;
          }
          const copy = [...state.queue];
          const [moved] = copy.splice(from, 1);
          copy.splice(to, 0, moved);

          let nextIndex = state.currentIndex;
          if (state.currentIndex === from) {
            nextIndex = to;
          } else if (from < state.currentIndex && to >= state.currentIndex) {
            nextIndex = state.currentIndex - 1;
          } else if (from > state.currentIndex && to <= state.currentIndex) {
            nextIndex = state.currentIndex + 1;
          }
          return { queue: copy, currentIndex: nextIndex };
        }),
      removeFromQueue: async (index) => {
        const state = get();
        if (index < 0 || index >= state.queue.length) {
          return;
        }

        const isCurrent = index === state.currentIndex;
        const nextQueue = state.queue.filter((_, idx) => idx !== index);
        const nextIndex = nextQueue.length === 0 ? -1 : Math.min(state.currentIndex, nextQueue.length - 1);

        if (isCurrent) {
          await stopAndRelease(state.sound);
          set({
            sound: null,
            queue: nextQueue,
            currentIndex: nextIndex,
            isPlaying: false,
            positionSec: 0,
            durationSec: 0,
          });
          if (nextIndex >= 0) {
            await get().playFromQueue(nextIndex, true);
          }
          return;
        }

        set({
          queue: nextQueue,
          currentIndex: index < state.currentIndex ? state.currentIndex - 1 : nextIndex,
        });
      },
      clearQueue: async () => {
        await stopAndRelease(get().sound);
        set({
          queue: [],
          currentIndex: -1,
          isPlaying: false,
          positionSec: 0,
          durationSec: 0,
          sound: null,
        });
      },
      setPlaybackRate: async (rate) => {
        if (!Number.isFinite(rate) || rate <= 0) {
          return;
        }
        const sound = get().sound;
        if (sound) {
          try {
            await sound.setRateAsync(rate, true);
          } catch {
            // no-op
          }
        }
        set({ playbackRate: rate });
      },
      cyclePlaybackRate: async () => {
        const rates = [0.75, 1, 1.25, 1.5];
        const state = get();
        const currentIndex = rates.findIndex((rate) => Math.abs(rate - state.playbackRate) < 0.001);
        const nextRate = rates[(currentIndex + 1) % rates.length];
        await get().setPlaybackRate(nextRate);
      },
      toggleShuffle: () => set((state) => ({ shuffleEnabled: !state.shuffleEnabled })),
      cycleRepeatMode: () =>
        set((state) => ({
          repeatMode:
            state.repeatMode === "off" ? "all" : state.repeatMode === "all" ? "one" : "off",
        })),
      setSleepTimer: (minutes) => {
        clearSleepTimerHandle();
        if (minutes <= 0 || !Number.isFinite(minutes)) {
          set({ sleepTimerEndsAt: null });
          return;
        }

        const timeoutMs = Math.max(1, Math.floor(minutes * 60 * 1000));
        const endsAt = Date.now() + timeoutMs;
        set({ sleepTimerEndsAt: endsAt });

        sleepTimerHandle = setTimeout(async () => {
          sleepTimerHandle = null;
          const sound = get().sound;
          if (sound) {
            try {
              await sound.pauseAsync();
            } catch {
              // no-op
            }
          }
          set({ isPlaying: false, sleepTimerEndsAt: null });
        }, timeoutMs);
      },
      clearSleepTimer: () => {
        clearSleepTimerHandle();
        set({ sleepTimerEndsAt: null });
      },
      playTrackEndBehavior: async () => {
        const state = get();
        if (state.repeatMode === "one") {
          await state.playFromQueue(state.currentIndex, true);
          return;
        }
        await state.skipNext();
      },
    }),
    {
      name: "player-store-v1",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        queue: state.queue,
        currentIndex: state.currentIndex,
        playbackRate: state.playbackRate,
        repeatMode: state.repeatMode,
        shuffleEnabled: state.shuffleEnabled,
      }),
      onRehydrateStorage: () => () => {
        usePlayerStore.setState({ hydrated: true });
      },
    }
  )
);
