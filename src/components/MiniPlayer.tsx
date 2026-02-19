import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, Image } from "react-native";

import type { ThemeColors } from "../constants/theme";
import { usePlayerStore } from "../stores/playerStore";

type Props = {
  colors: ThemeColors;
  onOpen: () => void;
};

export const MiniPlayer = ({ colors, onOpen }: Props) => {
  const song = usePlayerStore((state) => state.currentSong());
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const togglePlayPause = usePlayerStore((state) => state.togglePlayPause);
  const skipNext = usePlayerStore((state) => state.skipNext);

  if (!song) {
    return null;
  }

  return (
    <Pressable onPress={onOpen} style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Image source={{ uri: song.image }} style={styles.cover} />
      <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
        {song.title} - {song.artist}
      </Text>
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          void togglePlayPause();
        }}
        hitSlop={8}
      >
        <Ionicons name={isPlaying ? "pause" : "play"} size={21} color={colors.accent} />
      </Pressable>
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          void skipNext();
        }}
        hitSlop={8}
        style={styles.next}
      >
        <Ionicons name="play-skip-forward" size={20} color={colors.accent} />
      </Pressable>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    height: 56,
    paddingHorizontal: 12,
  },
  cover: {
    borderRadius: 8,
    height: 38,
    width: 38,
  },
  title: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 17 / 1.2,
  },
  next: {
    marginLeft: 6,
  },
});

