import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";
import type { Artist } from "../types/music";

type Props = {
  artist: Artist;
  colors: ThemeColors;
  onPress?: () => void;
  onMenuPress?: () => void;
};

export const ArtistRow = ({ artist, colors, onPress, onMenuPress }: Props) => (
  <Pressable onPress={onPress} style={styles.container}>
    <Image source={{ uri: artist.image }} style={styles.avatar} />
    <View style={styles.info}>
      <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
        {artist.name}
      </Text>
      <Text numberOfLines={1} style={[styles.meta, { color: colors.textSecondary }]}>
        {artist.albumCount ?? 1} Album   |   {artist.songCount ?? 0} Songs
      </Text>
    </View>
    <Pressable
      onPress={(event) => {
        event.stopPropagation();
        onMenuPress?.();
      }}
      hitSlop={8}
    >
      <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
    </Pressable>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  avatar: {
    borderRadius: 999,
    height: 64,
    width: 64,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 22 / 1.3,
    marginBottom: 2,
  },
  meta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
});
