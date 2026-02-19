import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useEffect } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { usePlayerStore } from "../stores/playerStore";
import { formatDuration } from "../utils/format";

type PlayerRoute = RouteProp<RootStackParamList, "Player">;

export const PlayerScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<PlayerRoute>();
  const { colors } = useTheme();

  const song = usePlayerStore((state) => state.currentSong());
  const queue = usePlayerStore((state) => state.queue);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const positionSec = usePlayerStore((state) => state.positionSec);
  const durationSec = usePlayerStore((state) => state.durationSec);
  const shuffle = usePlayerStore((state) => state.shuffleEnabled);
  const repeat = usePlayerStore((state) => state.repeatMode);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const playSongNow = usePlayerStore((state) => state.playSongNow);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const seekTo = usePlayerStore((state) => state.seekTo);
  const jumpBy = usePlayerStore((state) => state.jumpBy);
  const skipNext = usePlayerStore((state) => state.skipNext);
  const skipPrevious = usePlayerStore((state) => state.skipPrevious);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);
  const cycleRepeatMode = usePlayerStore((state) => state.cycleRepeatMode);

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
        <Pressable>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={28} color={colors.text} />
        </Pressable>
      </View>

      <Image source={{ uri: song.image }} style={styles.cover} />
      <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
        {song.title}
      </Text>
      <Text numberOfLines={1} style={[styles.artist, { color: colors.textSecondary }]}>
        {song.artist}
      </Text>

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
        <Pressable onPress={toggleShuffle}>
          <Ionicons name="shuffle" size={26} color={shuffle ? colors.accent : colors.text} />
        </Pressable>
        <Pressable onPress={cycleRepeatMode}>
          <Ionicons
            name={repeat === "one" ? "repeat-outline" : "repeat"}
            size={26}
            color={repeat === "off" ? colors.text : colors.accent}
          />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Queue")}>
          <Ionicons name="list" size={26} color={colors.text} />
        </Pressable>
        <Pressable>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </Pressable>
      </View>

      <Pressable onPress={() => navigation.navigate("Queue")} style={styles.lyrics}>
        <Ionicons name="chevron-up-outline" size={20} color={colors.textSecondary} />
        <Text style={[styles.lyricsText, { color: colors.text }]}>Queue ({queue.length})</Text>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
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
    textAlign: "center",
  },
  artist: {
    fontFamily: "Poppins_500Medium",
    fontSize: 19 / 1.2,
    marginBottom: 14,
    textAlign: "center",
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
});

