import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";

import { BottomSheet } from "../components/BottomSheet";
import type { SheetAction } from "../components/BottomSheet";
import { EmptyState } from "../components/EmptyState";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../stores/appStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Song } from "../types/music";
import { formatDurationLabel } from "../utils/format";
import { sharePlaylist, shareSong } from "../utils/share";

type ScreenRoute = RouteProp<RootStackParamList, "PlaylistDetails">;

const SMART_PLAYLISTS: Record<string, string> = {
  "smart-recent": "Recently Played",
  "smart-most-played": "Most Played",
  "smart-downloaded": "Downloaded",
};

export const PlaylistDetailsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ScreenRoute>();
  const { colors } = useTheme();

  const playlistId = route.params.playlistId;
  const playlist = useLibraryStore((state) => state.playlists.find((item) => item.id === playlistId));
  const songCache = useLibraryStore((state) => state.songCache);
  const downloaded = useLibraryStore((state) => state.downloaded);
  const isFavorite = useLibraryStore((state) => state.isFavorite);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const removeSongFromPlaylist = useLibraryStore((state) => state.removeSongFromPlaylist);
  const moveSongInPlaylist = useLibraryStore((state) => state.moveSongInPlaylist);

  const recentlyPlayed = useAppStore((state) => state.recentlyPlayed);
  const playCounts = useAppStore((state) => state.playCounts);

  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const addPlayNext = usePlayerStore((state) => state.addPlayNext);
  const addToQueue = usePlayerStore((state) => state.addToQueue);

  const [songSheet, setSongSheet] = useState<Song | null>(null);

  const songs = useMemo(() => {
    if (playlistId === "smart-recent") {
      return recentlyPlayed;
    }
    if (playlistId === "smart-most-played") {
      return Object.entries(playCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([songId]) => songCache[songId])
        .filter(Boolean)
        .slice(0, 100);
    }
    if (playlistId === "smart-downloaded") {
      return Object.keys(downloaded)
        .map((songId) => songCache[songId])
        .filter(Boolean);
    }
    if (!playlist) {
      return [];
    }
    return playlist.songIds.map((songId) => songCache[songId]).filter(Boolean);
  }, [downloaded, playCounts, playlist, playlistId, recentlyPlayed, songCache]);

  const isSmartPlaylist = playlistId in SMART_PLAYLISTS;
  const title = isSmartPlaylist ? SMART_PLAYLISTS[playlistId] : playlist?.name ?? "Playlist";
  const canReorder = Boolean(playlist && playlist.id !== "liked");
  const canRemoveSongs = Boolean(playlist);

  const songActions = useMemo(() => {
    if (!songSheet) {
      return [];
    }
    const favorite = isFavorite(songSheet.id);
    const actions: SheetAction[] = [
      {
        id: "next",
        label: "Play Next",
        icon: "play-skip-forward-outline" as const,
        onPress: () => addPlayNext(songSheet),
      },
      {
        id: "queue",
        label: "Add to Playing Queue",
        icon: "list-circle-outline" as const,
        onPress: () => addToQueue(songSheet),
      },
      {
        id: "favorite",
        label: favorite ? "Remove from Favorites" : "Add to Favorites",
        icon: favorite ? ("heart-dislike-outline" as const) : ("heart-outline" as const),
        onPress: () => toggleFavorite(songSheet),
      },
      {
        id: "share",
        label: "Share Song",
        icon: "share-social-outline" as const,
        onPress: () => {
          void shareSong(songSheet);
        },
      },
    ];

    if (canRemoveSongs && playlist) {
      actions.push({
        id: "remove",
        label: playlist.id === "liked" ? "Remove from Liked Songs" : "Remove from Playlist",
        icon: "trash-outline" as const,
        onPress: () => {
          if (playlist.id === "liked") {
            if (favorite) {
              toggleFavorite(songSheet);
            }
            return;
          }
          removeSongFromPlaylist(playlist.id, songSheet.id);
        },
      });
    }

    return actions;
  }, [addPlayNext, addToQueue, canRemoveSongs, isFavorite, playlist, removeSongFromPlaylist, songSheet, toggleFavorite]);

  const playFromList = (index: number) => {
    if (songs.length === 0) {
      return;
    }
    void setQueueAndPlay(songs, index);
    navigation.navigate("Player");
  };

  const renderRow = (item: Song, index: number, drag?: () => void, isDragging?: boolean) => (
    <ScaleDecorator>
      <Pressable
        onPress={() => playFromList(index)}
        onLongPress={drag}
        style={[
          styles.row,
          {
            backgroundColor: isDragging ? colors.surfaceMuted : colors.surface,
            borderColor: queue[currentIndex]?.id === item.id && isPlaying ? colors.accent : colors.border,
          },
        ]}
      >
        <Image source={{ uri: item.image }} style={styles.cover} />
        <View style={styles.info}>
          <Text numberOfLines={1} style={[styles.songTitle, { color: colors.text }]}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={[styles.songMeta, { color: colors.textSecondary }]}>
            {item.artist}   |   {formatDurationLabel(item.durationSec)}
          </Text>
        </View>
        <View style={styles.rowActions}>
          {canReorder ? (
            <Ionicons name="reorder-three-outline" size={22} color={colors.textSecondary} />
          ) : null}
          <Pressable onPress={() => setSongSheet(item)} hitSlop={8}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
          </Pressable>
        </View>
      </Pressable>
    </ScaleDecorator>
  );

  if (!playlist && !isSmartPlaylist) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <EmptyState colors={colors} title="Playlist Not Found" message="This playlist no longer exists." icon="alert-circle-outline" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
            {title}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: colors.textSecondary }]}>
            {songs.length} songs
          </Text>
        </View>
        <Pressable
          onPress={() =>
            void sharePlaylist(
              { id: playlistId, name: title },
              songs.length
            )
          }
        >
          <Ionicons name="share-social-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      {songs.length === 0 ? (
        <EmptyState colors={colors} title="No Songs Yet" message="Add songs from the 3-dot menu on any track." icon="musical-notes-outline" />
      ) : canReorder ? (
        <DraggableFlatList
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onDragEnd={({ from, to }) => moveSongInPlaylist(playlistId, from, to)}
          renderItem={({ item, getIndex, drag, isActive }) =>
            renderRow(item, getIndex() ?? 0, drag, isActive)
          }
        />
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => renderRow(item, index)}
        />
      )}

      <BottomSheet
        visible={Boolean(songSheet)}
        onClose={() => setSongSheet(null)}
        colors={colors}
        image={songSheet?.image}
        title={songSheet?.title}
        subtitle={songSheet?.artist}
        actions={songActions}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 10,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 20,
  },
  meta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
  listContent: {
    gap: 10,
    paddingBottom: 140,
  },
  row: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  cover: {
    borderRadius: 10,
    height: 56,
    marginRight: 10,
    width: 56,
  },
  info: {
    flex: 1,
    marginRight: 6,
  },
  songTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  songMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
  rowActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
});
