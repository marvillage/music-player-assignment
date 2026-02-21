import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";
import type { Song } from "../types/music";
import { formatDurationLabel } from "../utils/format";

type Props = {
  song: Song;
  colors: ThemeColors;
  isActive?: boolean;
  isPlaying?: boolean;
  onPress?: () => void;
  onPlayPress?: () => void;
  onMenuPress?: () => void;
  showHeart?: boolean;
};

export const SongRow = ({
  song,
  colors,
  isActive,
  isPlaying,
  onPress,
  onPlayPress,
  onMenuPress,
  showHeart = false,
}: Props) => (
  <Pressable onPress={onPress} style={styles.container}>
    <Image source={{ uri: song.image }} style={styles.cover} />
    <View style={styles.info}>
      <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
        {song.title}
      </Text>
      <Text numberOfLines={1} style={[styles.meta, { color: colors.textSecondary }]}>
        {song.artist}   |   {formatDurationLabel(song.durationSec)}
      </Text>
    </View>

    <View style={styles.actions}>
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onPlayPress?.();
        }}
        style={[styles.playButton, { backgroundColor: isActive && isPlaying ? "transparent" : colors.accentSoft }]}
        hitSlop={8}
      >
        <Ionicons
          name={isActive && isPlaying ? "pause" : "play"}
          size={18}
          color={isActive && isPlaying ? colors.accent : colors.accent}
        />
      </Pressable>

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onMenuPress?.();
        }}
        hitSlop={8}
      >
        <Ionicons name={showHeart ? "heart-outline" : "ellipsis-vertical"} size={18} color={colors.text} />
      </Pressable>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  cover: {
    borderRadius: 16,
    height: 64,
    width: 64,
  },
  info: {
    flex: 1,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 32 / 1.8,
    marginBottom: 2,
  },
  meta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  playButton: {
    alignItems: "center",
    borderRadius: 999,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
});
