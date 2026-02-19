import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";
import type { Album } from "../types/music";

type Props = {
  album: Album;
  colors: ThemeColors;
  onPress?: () => void;
  onMenuPress?: () => void;
  compact?: boolean;
};

export const AlbumCard = ({ album, colors, onPress, onMenuPress, compact }: Props) => (
  <Pressable onPress={onPress} style={[styles.container, compact && styles.compactContainer]}>
    <Image source={{ uri: album.image }} style={[styles.cover, compact && styles.compactCover]} />
    <View style={styles.row}>
      <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
        {album.name}
      </Text>
      {onMenuPress ? (
        <Pressable onPress={onMenuPress} hitSlop={8}>
          <Ionicons name="ellipsis-vertical" size={16} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
    <Text numberOfLines={1} style={[styles.meta, { color: colors.textSecondary }]}>
      {album.artistName} {album.year ? `| ${album.year}` : ""}
    </Text>
    {album.songCount ? (
      <Text style={[styles.meta, { color: colors.textSecondary }]}>{album.songCount} songs</Text>
    ) : null}
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    width: "47%",
  },
  compactContainer: {
    width: 170,
  },
  cover: {
    borderRadius: 22,
    height: 160,
    marginBottom: 8,
    width: "100%",
  },
  compactCover: {
    height: 150,
    width: 170,
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    flex: 1,
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18 / 1.1,
    marginRight: 8,
  },
  meta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
});

