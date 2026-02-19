import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAlbumById, getAlbumSongs } from "../api/saavn";
import { SongRow } from "../components/SongRow";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Album, Song } from "../types/music";
import { formatDuration } from "../utils/format";

type ScreenRoute = RouteProp<RootStackParamList, "AlbumDetails">;

export const AlbumDetailsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ScreenRoute>();
  const { colors } = useTheme();

  const [album, setAlbum] = useState<Album>(route.params.album);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const cacheSongs = useLibraryStore((state) => state.cacheSongs);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const details = await getAlbumById(route.params.album.id);
        const fallbackAlbum = details.album ?? route.params.album;
        const list = details.songs.length ? details.songs : await getAlbumSongs(fallbackAlbum);
        if (!mounted) {
          return;
        }
        setAlbum(fallbackAlbum);
        setSongs(list);
        cacheSongs(list);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [cacheSongs, route.params.album]);

  const totalDurationSec = useMemo(
    () => songs.reduce((acc, item) => acc + item.durationSec, 0),
    [songs]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable>
            <Ionicons name="search-outline" size={26} color={colors.text} />
          </Pressable>
          <Pressable>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Image source={{ uri: album.image }} style={styles.hero} />
            <Text style={[styles.name, { color: colors.text }]}>{album.artistName}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              1 Album   |   {songs.length} Songs   |   {formatDuration(totalDurationSec)} mins
            </Text>
            <View style={styles.actions}>
              <Pressable style={[styles.primaryButton, { backgroundColor: colors.accent }]}>
                <Ionicons name="shuffle" size={18} color="#FFFFFF" />
                <Text style={styles.primaryLabel}>Shuffle</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => {
                  if (songs.length > 0) {
                    void setQueueAndPlay(songs, 0);
                    navigation.navigate("Player");
                  }
                }}
              >
                <Ionicons name="play" size={18} color={colors.accent} />
                <Text style={[styles.secondaryLabel, { color: colors.accent }]}>Play</Text>
              </Pressable>
            </View>
            <View style={[styles.songHeader, { borderTopColor: colors.border }]}>
              <Text style={[styles.songHeaderText, { color: colors.text }]}>Songs</Text>
              <Text style={[styles.songHeaderAction, { color: colors.accent }]}>See All</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            colors={colors}
            isActive={queue[currentIndex]?.id === item.id}
            isPlaying={isPlaying}
            onPress={() => {
              void setQueueAndPlay(songs, index);
              navigation.navigate("Player");
            }}
            onPlayPress={() => {
              void setQueueAndPlay(songs, index);
              navigation.navigate("Player");
            }}
            onMenuPress={() => {}}
          />
        )}
        ListFooterComponent={
          loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <View style={{ height: 120 }} />
          )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    gap: 12,
  },
  hero: {
    alignSelf: "center",
    borderRadius: 34,
    height: 200,
    marginBottom: 12,
    width: 200,
  },
  name: {
    fontFamily: "Poppins_700Bold",
    fontSize: 50 / 1.6,
    textAlign: "center",
  },
  meta: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 11,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 11,
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  secondaryLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  songHeader: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 16,
  },
  songHeaderText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 37 / 1.7,
  },
  songHeaderAction: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  loader: {
    paddingVertical: 24,
  },
});

