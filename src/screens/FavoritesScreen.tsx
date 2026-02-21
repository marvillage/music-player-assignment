import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "../components/EmptyState";
import { SongRow } from "../components/SongRow";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";

export const FavoritesScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const favorites = useLibraryStore((state) => state.favorites);
  const songCache = useLibraryStore((state) => state.songCache);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);

  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);

  const items = useMemo(
    () => favorites.map((id) => songCache[id]).filter(Boolean),
    [favorites, songCache]
  );

  if (items.length === 0) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 10) }]}
        edges={["left", "right", "bottom"]}
      >
        <EmptyState
          colors={colors}
          title="No Favorites Yet"
          message="Tap heart on any song option to add favorites."
          icon="heart-outline"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 10) }]}
      edges={["left", "right", "bottom"]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Favorites</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            colors={colors}
            isActive={queue[currentIndex]?.id === item.id}
            isPlaying={isPlaying}
            onPress={() => {
              void setQueueAndPlay(items, index);
              navigation.navigate("Player");
            }}
            onPlayPress={() => {
              void setQueueAndPlay(items, index);
              navigation.navigate("Player");
            }}
            onMenuPress={() => toggleFavorite(item)}
            showHeart
          />
        )}
        contentContainerStyle={styles.content}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 36 / 1.6,
  },
  content: {
    paddingBottom: 160,
  },
});
