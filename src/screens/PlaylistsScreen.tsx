import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useLibraryStore } from "../stores/libraryStore";

export const PlaylistsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const playlists = useLibraryStore((state) => state.playlists);
  const favoritesCount = useLibraryStore((state) => state.favorites.length);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <Text style={[styles.title, { color: colors.text }]}>Playlists</Text>

      <Pressable style={[styles.queueCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate("Queue")}>
        <View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Playing Queue</Text>
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Reorder or remove songs</Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
      </Pressable>

      {playlists.map((playlist) => (
        <View
          key={playlist.id}
          style={[styles.playlistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{playlist.name}</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {playlist.id === "liked" ? favoritesCount : playlist.songIds.length} songs
            </Text>
          </View>
        </View>
      ))}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 36 / 1.6,
    marginBottom: 14,
  },
  queueCard: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  playlistCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
  },
  cardMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
});

