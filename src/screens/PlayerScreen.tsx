import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheet } from "../components/BottomSheet";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Song } from "../types/music";
import { formatDuration } from "../utils/format";
import { shareSong } from "../utils/share";

type PlayerRoute = RouteProp<RootStackParamList, "Player">;
const PLAYBACK_SPEED_OPTIONS = [0.675, 0.75, 0.9, 1, 1.1, 1.25, 1.5] as const;
const formatPlaybackRateLabel = (rate: number) => `${rate}x`;

export const PlayerScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<PlayerRoute>();
  const { colors } = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [playlistPickerSong, setPlaylistPickerSong] = useState<Song | null>(null);
  const [sleepMenuVisible, setSleepMenuVisible] = useState(false);
  const [speedMenuVisible, setSpeedMenuVisible] = useState(false);
  const [now, setNow] = useState(Date.now());

  const song = usePlayerStore((state) => state.currentSong());
  const queue = usePlayerStore((state) => state.queue);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const positionSec = usePlayerStore((state) => state.positionSec);
  const durationSec = usePlayerStore((state) => state.durationSec);
  const shuffle = usePlayerStore((state) => state.shuffleEnabled);
  const repeat = usePlayerStore((state) => state.repeatMode);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const playSongNow = usePlayerStore((state) => state.playSongNow);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const jumpBy = usePlayerStore((state) => state.jumpBy);
  const skipNext = usePlayerStore((state) => state.skipNext);
  const skipPrevious = usePlayerStore((state) => state.skipPrevious);
  const addPlayNext = usePlayerStore((state) => state.addPlayNext);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const setPlaybackRate = usePlayerStore((state) => state.setPlaybackRate);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode);
  const sleepTimerEndsAt = usePlayerStore((state) => state.sleepTimerEndsAt);
  const setSleepTimer = usePlayerStore((state) => state.setSleepTimer);
  const clearSleepTimer = usePlayerStore((state) => state.clearSleepTimer);
  const downloaded = useLibraryStore((state) => state.downloaded);
  const downloadSong = useLibraryStore((state) => state.downloadSong);
  const removeDownload = useLibraryStore((state) => state.removeDownload);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const isFavorite = useLibraryStore((state) => state.isFavorite);
  const playlists = useLibraryStore((state) => state.playlists);
  const addSongToPlaylist = useLibraryStore((state) => state.addSongToPlaylist);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);

  useEffect(() => {
    const incoming = route.params?.song;
    const sourceQueue = route.params?.sourceQueue;
    const startIndex = route.params?.startIndex;
    if (incoming && sourceQueue && typeof startIndex === "number") {
      void setQueueAndPlay(sourceQueue, startIndex);
      return;
    }
    if (incoming) {
      void playSongNow(incoming);
    }
  }, [playSongNow, route.params, setQueueAndPlay]);

  useEffect(() => {
    if (!sleepTimerEndsAt) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sleepTimerEndsAt]);

  const sleepRemainingSec = sleepTimerEndsAt ? Math.max(0, Math.floor((sleepTimerEndsAt - now) / 1000)) : 0;
  const sleepLabel = sleepRemainingSec > 0 ? `${Math.floor(sleepRemainingSec / 60)}:${(sleepRemainingSec % 60).toString().padStart(2, "0")}` : null;

  const songActions = useMemo(() => {
    if (!song) {
      return [];
    }
    const favorite = isFavorite(song.id);
    const isDownloaded = Boolean(downloaded[song.id]);

    return [
      {
        id: "shuffle",
        label: shuffle ? "Shuffle: On" : "Shuffle: Off",
        icon: "shuffle-outline" as const,
        active: shuffle,
        onPress: toggleShuffle,
      },
      {
        id: "repeat",
        label:
          repeat === "off" ? "Repeat: Off" : repeat === "all" ? "Repeat: All Songs" : "Repeat: One Song",
        icon: "repeat-outline" as const,
        active: repeat !== "off",
        onPress: cycleRepeatMode,
      },
      {
        id: "next",
        label: "Play Next",
        icon: "arrow-forward-circle-outline" as const,
        onPress: () => addPlayNext(song),
      },
      {
        id: "queue",
        label: "Add to Playing Queue",
        icon: "document-text-outline" as const,
        onPress: () => addToQueue(song),
      },
      {
        id: "queue-screen",
        label: "View Queue",
        icon: "list-outline" as const,
        onPress: () => navigation.navigate("Queue"),
      },
      {
        id: "album",
        label: "Go to Album",
        icon: "disc-outline" as const,
        onPress: () =>
          navigation.navigate("AlbumDetails", {
            album: {
              id: song.albumId ?? song.id,
              name: song.albumName ?? "Album",
              artistName: song.artist,
              image: song.image,
              year: song.year,
            },
          }),
      },
      {
        id: "artist",
        label: "Go to Artist",
        icon: "person-outline" as const,
        onPress: () =>
          navigation.navigate("ArtistDetails", {
            artist: {
              id: song.artistId ?? song.id,
              name: song.artist,
              image: song.image,
            },
          }),
      },
      {
        id: "favorite",
        label: favorite ? "Remove from Favorites" : "Add to Favorites",
        icon: favorite ? ("heart-dislike-outline" as const) : ("heart-outline" as const),
        onPress: () => toggleFavorite(song),
      },
      {
        id: "playlist",
        label: "Add to Playlist",
        icon: "add-circle-outline" as const,
        onPress: () => setPlaylistPickerSong(song),
      },
      {
        id: "download",
        label: isDownloaded ? "Delete from Device" : "Download Offline",
        icon: isDownloaded ? ("trash-outline" as const) : ("download-outline" as const),
        onPress: () => {
          if (isDownloaded) {
            void removeDownload(song.id);
          } else {
            void downloadSong(song);
          }
        },
      },
      {
        id: "sleep",
        label: sleepTimerEndsAt ? "Sleep Timer Settings" : "Set Sleep Timer",
        icon: "timer-outline" as const,
        onPress: () => setSleepMenuVisible(true),
      },
      {
        id: "share",
        label: "Share Song",
        icon: "paper-plane-outline" as const,
        onPress: () => {
          void shareSong(song);
        },
      },
    ];
  }, [
    addPlayNext,
    addToQueue,
    cycleRepeatMode,
    createPlaylist,
    downloadSong,
    downloaded,
    isFavorite,
    navigation,
    removeDownload,
    song,
    shuffle,
    sleepTimerEndsAt,
    repeat,
    toggleShuffle,
    toggleFavorite,
  ]);

  const playlistActions = useMemo(() => {
    if (!playlistPickerSong) {
      return [];
    }
    return [
      {
        id: "create",
        label: "Create New Playlist",
        icon: "add-outline" as const,
        onPress: () => {
          const id = createPlaylist("New Playlist");
          addSongToPlaylist(id, playlistPickerSong);
        },
      },
      ...playlists.map((playlist) => ({
        id: playlist.id,
        label: playlist.name,
        icon: "musical-notes-outline" as const,
        onPress: () => addSongToPlaylist(playlist.id, playlistPickerSong),
      })),
    ];
  }, [addSongToPlaylist, createPlaylist, playlistPickerSong, playlists]);

  const speedActions = useMemo(
    () =>
      PLAYBACK_SPEED_OPTIONS.map((rate) => ({
        id: `speed-${rate}`,
        label: formatPlaybackRateLabel(rate),
        active: Math.abs(playbackRate - rate) < 0.001,
        showRadio: true,
        onPress: () => {
          void setPlaybackRate(rate);
        },
      })),
    [playbackRate, setPlaybackRate]
  );

  const sleepActions = [
    {
      id: "10",
      label: "Sleep in 10 min",
      icon: "timer-outline" as const,
      onPress: () => setSleepTimer(10),
    },
    {
      id: "20",
      label: "Sleep in 20 min",
      icon: "timer-outline" as const,
      onPress: () => setSleepTimer(20),
    },
    {
      id: "30",
      label: "Sleep in 30 min",
      icon: "timer-outline" as const,
      onPress: () => setSleepTimer(30),
    },
    {
      id: "45",
      label: "Sleep in 45 min",
      icon: "timer-outline" as const,
      onPress: () => setSleepTimer(45),
    },
    {
      id: "60",
      label: "Sleep in 60 min",
      icon: "timer-outline" as const,
      onPress: () => setSleepTimer(60),
    },
    {
      id: "off",
      label: "Turn Off Sleep Timer",
      icon: "close-circle-outline" as const,
      active: !sleepTimerEndsAt,
      onPress: clearSleepTimer,
    },
  ];

  if (!song) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No song selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={28} color={colors.text} />
        </Pressable>
      </View>

      <Image source={{ uri: song.image }} style={styles.cover} />
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={[styles.title, { color: colors.text }]}
      >
        {song.title}
      </Text>
      <Text numberOfLines={1} style={[styles.artist, { color: colors.textSecondary }]}>
        {song.artist}
      </Text>
      <View style={styles.songMetaActions}>
        <Pressable
          onPress={() => toggleFavorite(song)}
          hitSlop={8}
          style={[styles.metaActionButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Ionicons name={isFavorite(song.id) ? "heart" : "heart-outline"} size={22} color={colors.accent} />
          <Text style={[styles.metaActionLabel, { color: colors.textSecondary }]}>
            {isFavorite(song.id) ? "Liked" : "Like"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => addPlayNext(song)}
          hitSlop={8}
          style={[styles.metaActionButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Ionicons name="play-skip-forward-outline" size={22} color={colors.accent} />
          <Text style={[styles.metaActionLabel, { color: colors.textSecondary }]}>Play Next</Text>
        </Pressable>
        <Pressable
          onPress={() => addToQueue(song)}
          hitSlop={8}
          style={[styles.metaActionButton, { backgroundColor: colors.surfaceMuted }]}
        >
          <Ionicons name="list-circle-outline" size={22} color={colors.accent} />
          <Text style={[styles.metaActionLabel, { color: colors.textSecondary }]}>Add to Queue</Text>
        </Pressable>
      </View>

      <View style={[styles.sliderWrap, { borderTopColor: colors.border }]}>
        <Slider
          value={positionSec}
          minimumValue={0}
          maximumValue={Math.max(durationSec, 1)}
          onSlidingComplete={(value) => void seekTo(value)}
          minimumTrackTintColor={colors.accent}
          maximumTrackTintColor={colors.border}
          thumbTintColor={colors.accent}
        />
        <View style={styles.timeRow}>
          <Text style={[styles.time, { color: colors.text }]}>{formatDuration(positionSec)}</Text>
          <Text style={[styles.time, { color: colors.text }]}>{formatDuration(durationSec)}</Text>
        </View>
      </View>

      <View style={styles.mainControls}>
        <Pressable onPress={() => void skipPrevious()}>
          <Ionicons name="play-skip-back" size={34} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => void jumpBy(-10)}>
          <Ionicons name="play-back-circle-outline" size={34} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => void togglePlayPause()} style={[styles.playButton, { backgroundColor: colors.accent }]}>
          <Ionicons name={isPlaying ? "pause" : "play"} size={34} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={() => void jumpBy(10)}>
          <Ionicons name="play-forward-circle-outline" size={34} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => void skipNext()}>
          <Ionicons name="play-skip-forward" size={34} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.subControls}>
        <Pressable onPress={() => setSpeedMenuVisible(true)}>
          <Ionicons
            name="speedometer-outline"
            size={24}
            color={Math.abs(playbackRate - 1) > 0.001 ? colors.accent : colors.text}
          />
        </Pressable>
        <Pressable onPress={() => setSleepMenuVisible(true)}>
          <Ionicons name="timer-outline" size={24} color={sleepTimerEndsAt ? colors.accent : colors.text} />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Queue")}>
          <Ionicons name="tv-outline" size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={() => setMenuVisible(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </Pressable>
      </View>

      <Pressable onPress={() => navigation.navigate("Queue")} style={styles.lyrics}>
        <Ionicons name="chevron-up-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.lyricsText, { color: colors.text }]}>Queue ({queue.length})</Text>
        {sleepLabel ? (
          <Text style={[styles.sleepTimerText, { color: colors.textSecondary }]}>Sleep timer: {sleepLabel}</Text>
        ) : null}
      </Pressable>

      <BottomSheet
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        colors={colors}
        image={song.image}
        title={song.title}
        subtitle={song.artist}
        actions={songActions}
      />

      <BottomSheet
        visible={Boolean(playlistPickerSong)}
        onClose={() => setPlaylistPickerSong(null)}
        colors={colors}
        image={playlistPickerSong?.image}
        title="Add to Playlist"
        subtitle={playlistPickerSong ? `${playlistPickerSong.title} - ${playlistPickerSong.artist}` : undefined}
        actions={playlistActions}
      />

      <BottomSheet
        visible={sleepMenuVisible}
        onClose={() => setSleepMenuVisible(false)}
        colors={colors}
        title="Sleep Timer"
        subtitle={sleepLabel ? `Playback stops in ${sleepLabel}` : "No active sleep timer"}
        actions={sleepActions}
      />

      <BottomSheet
        visible={speedMenuVisible}
        onClose={() => setSpeedMenuVisible(false)}
        colors={colors}
        title="Playback Speed"
        subtitle={`Current: ${formatPlaybackRateLabel(playbackRate)}`}
        actions={speedActions}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  emptyWrap: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    marginTop: 8,
  },
  cover: {
    alignSelf: "center",
    borderRadius: 34,
    height: 380,
    marginBottom: 18,
    width: 380,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 46 / 1.5,
    lineHeight: 38,
    paddingHorizontal: 6,
    textAlign: "center",
  },
  artist: {
    fontFamily: "Poppins_500Medium",
    fontSize: 19 / 1.2,
    marginBottom: 8,
    textAlign: "center",
  },
  songMetaActions: {
    gap: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 6,
  },
  metaActionButton: {
    alignItems: "center",
    borderRadius: 14,
    flex: 1,
    minWidth: 96,
    paddingVertical: 9,
  },
  metaActionLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  sliderWrap: {
    borderTopWidth: 1,
    paddingTop: 8,
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -2,
  },
  time: {
    fontFamily: "Poppins_500Medium",
    fontSize: 17 / 1.2,
  },
  mainControls: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  playButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  subControls: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 24,
  },
  lyrics: {
    alignItems: "center",
    marginTop: 20,
  },
  lyricsText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 34 / 1.7,
    marginTop: 2,
  },
  sleepTimerText: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
});
