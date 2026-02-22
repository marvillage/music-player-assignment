import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheet } from "../components/BottomSheet";
import { getAlbumById, getAlbumSongs } from "../api/saavn";
import { SongRow } from "../components/SongRow";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Album, Song } from "../types/music";
import { formatDuration } from "../utils/format";
import { formatCountLabel, formatSongByline } from "../utils/display";
import { buildAlbumFromSong, buildArtistFromSong } from "../utils/navigation";
import { showSetAsRingtoneHint, showSongDetails } from "../utils/songMenu";
import { shareAlbum, shareSong } from "../utils/share";

type ScreenRoute = RouteProp<RootStackParamList, "AlbumDetails">;

export const AlbumDetailsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ScreenRoute>();
  const { colors } = useTheme();

  const [album, setAlbum] = useState<Album>(route.params.album);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [songSheet, setSongSheet] = useState<Song | null>(null);
  const [playlistPickerSong, setPlaylistPickerSong] = useState<Song | null>(null);
  const [albumMenuVisible, setAlbumMenuVisible] = useState(false);

  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const addPlayNext = usePlayerStore((state) => state.addPlayNext);
  const cacheSongs = useLibraryStore((state) => state.cacheSongs);
  const downloaded = useLibraryStore((state) => state.downloaded);
  const downloadSong = useLibraryStore((state) => state.downloadSong);
  const removeDownload = useLibraryStore((state) => state.removeDownload);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const isFavorite = useLibraryStore((state) => state.isFavorite);
  const toggleBlacklistSong = useLibraryStore((state) => state.toggleBlacklistSong);
  const isBlacklistedSong = useLibraryStore((state) => state.isBlacklistedSong);
  const playlists = useLibraryStore((state) => state.playlists);
  const addSongToPlaylist = useLibraryStore((state) => state.addSongToPlaylist);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);
  const toggleFollowAlbum = useLibraryStore((state) => state.toggleFollowAlbum);
  const isFollowingAlbum = useLibraryStore((state) => state.isFollowingAlbum);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        let fallbackAlbum = route.params.album;
        let list: Song[] = [];

        try {
          const details = await getAlbumById(route.params.album.id);
          fallbackAlbum = details.album ?? route.params.album;
          list = details.songs;
        } catch {
          // Fall back to search-based lookup when detail endpoint fails.
        }

        if (list.length === 0) {
          list = await getAlbumSongs(fallbackAlbum);
        }

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

  const playAndOpenPlayer = (list: Song[], startIndex: number) => {
    if (list.length === 0) {
      return;
    }
    void setQueueAndPlay(list, startIndex);
    navigation.navigate("Player");
  };

  const shuffleAndPlay = () => {
    if (songs.length === 0) {
      return;
    }
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playAndOpenPlayer(shuffled, 0);
  };

  const albumActions = useMemo(() => {
    if (songs.length === 0) {
      return [];
    }
    const following = isFollowingAlbum(album.id);
    return [
      {
        id: "play",
        label: "Play Album",
        icon: "play-outline" as const,
        onPress: () => playAndOpenPlayer(songs, 0),
      },
      {
        id: "shuffle",
        label: "Shuffle Play",
        icon: "shuffle-outline" as const,
        onPress: shuffleAndPlay,
      },
      {
        id: "queue-all",
        label: "Add Album to Queue",
        icon: "list-circle-outline" as const,
        onPress: () => songs.forEach((song) => addToQueue(song)),
      },
      {
        id: "download-all",
        label: "Download All Songs",
        icon: "download-outline" as const,
        onPress: () =>
          songs.forEach((song) => {
            if (!downloaded[song.id]) {
              void downloadSong(song);
            }
          }),
      },
      {
        id: "favorite-all",
        label: "Add All to Favorites",
        icon: "heart-outline" as const,
        onPress: () =>
          songs.forEach((song) => {
            if (!isFavorite(song.id)) {
              toggleFavorite(song);
            }
          }),
      },
      {
        id: "follow-album",
        label: following ? "Unfollow Album" : "Follow Album",
        icon: following ? ("checkmark-circle-outline" as const) : ("add-circle-outline" as const),
        onPress: () => toggleFollowAlbum(album.id),
      },
      {
        id: "share-album",
        label: "Share Album",
        icon: "share-social-outline" as const,
        onPress: () => {
          void shareAlbum(album);
        },
      },
    ];
  }, [addToQueue, album, downloadSong, downloaded, isFavorite, isFollowingAlbum, songs, toggleFavorite, toggleFollowAlbum]);

  const songActions = useMemo(() => {
    if (!songSheet) {
      return [];
    }
    const favorite = isFavorite(songSheet.id);
    const isDownloaded = Boolean(downloaded[songSheet.id]);
    const blacklisted = isBlacklistedSong(songSheet.id);
    return [
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
        id: "album",
        label: "Go to Album",
        icon: "disc-outline" as const,
        onPress: () => {
          const album = buildAlbumFromSong(songSheet);
          if (!album) {
            return;
          }
          navigation.navigate("AlbumDetails", { album });
        },
      },
      {
        id: "artist",
        label: "Go to Artist",
        icon: "person-outline" as const,
        onPress: () => navigation.navigate("ArtistDetails", { artist: buildArtistFromSong(songSheet) }),
      },
      {
        id: "favorite",
        label: favorite ? "Remove from Favorites" : "Add to Favorites",
        icon: favorite ? ("heart-dislike-outline" as const) : ("heart-outline" as const),
        onPress: () => toggleFavorite(songSheet),
      },
      {
        id: "playlist",
        label: "Add to Playlist",
        icon: "add-circle-outline" as const,
        onPress: () => setPlaylistPickerSong(songSheet),
      },
      {
        id: "download",
        label: "Download Offline",
        icon: "download-outline" as const,
        onPress: () => {
          void downloadSong(songSheet);
        },
      },
      {
        id: "details",
        label: "Details",
        icon: "information-circle-outline" as const,
        onPress: () => showSongDetails(songSheet),
      },
      {
        id: "ringtone",
        label: "Set as Ringtone",
        icon: "call-outline" as const,
        onPress: () => showSetAsRingtoneHint(songSheet),
      },
      {
        id: "blacklist",
        label: blacklisted ? "Remove from Blacklist" : "Add to Blacklist",
        icon: blacklisted ? ("close-circle-outline" as const) : ("ban-outline" as const),
        active: blacklisted,
        onPress: () => toggleBlacklistSong(songSheet),
      },
      {
        id: "delete-device",
        label: "Delete from Device",
        icon: "trash-outline" as const,
        onPress: () => {
          if (isDownloaded) {
            void removeDownload(songSheet.id);
          }
        },
      },
      {
        id: "share-song",
        label: "Share Song",
        icon: "share-social-outline" as const,
        onPress: () => {
          void shareSong(songSheet);
        },
      },
    ];
  }, [
    addPlayNext,
    addToQueue,
    downloadSong,
    downloaded,
    isBlacklistedSong,
    isFavorite,
    navigation,
    removeDownload,
    songSheet,
    toggleBlacklistSong,
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate("Search")}>
            <Ionicons name="search-outline" size={26} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => setAlbumMenuVisible(true)}>
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
            <Text style={[styles.name, { color: colors.text }]}>{album.name}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {formatCountLabel(1, "Album")}   |   {formatCountLabel(songs.length, "Song")}   |   {formatDuration(totalDurationSec)} mins
            </Text>
            <View style={styles.actions}>
              <Pressable style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={shuffleAndPlay}>
                <Ionicons name="shuffle" size={18} color="#FFFFFF" />
                <Text style={styles.primaryLabel}>Shuffle</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => playAndOpenPlayer(songs, 0)}
              >
                <Ionicons name="play" size={18} color={colors.accent} />
                <Text style={[styles.secondaryLabel, { color: colors.accent }]}>Play</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => toggleFollowAlbum(album.id)}
              >
                <Ionicons
                  name={isFollowingAlbum(album.id) ? "checkmark-circle-outline" : "add-circle-outline"}
                  size={18}
                  color={colors.text}
                />
                <Text style={[styles.secondaryLabel, { color: colors.text }]}>
                  {isFollowingAlbum(album.id) ? "Following" : "Follow"}
                </Text>
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
            onMenuPress={() => setSongSheet(item)}
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

      <BottomSheet
        visible={albumMenuVisible}
        onClose={() => setAlbumMenuVisible(false)}
        colors={colors}
        image={album.image}
        title={album.name}
        subtitle={album.artistName}
        actions={albumActions}
      />

      <BottomSheet
        visible={Boolean(songSheet)}
        onClose={() => setSongSheet(null)}
        colors={colors}
        image={songSheet?.image}
        title={songSheet?.title}
        subtitle={songSheet?.artist}
        actions={songActions}
      />

      <BottomSheet
        visible={Boolean(playlistPickerSong)}
        onClose={() => setPlaylistPickerSong(null)}
        colors={colors}
        image={playlistPickerSong?.image}
        title="Add to Playlist"
        subtitle={playlistPickerSong ? formatSongByline(playlistPickerSong.title, playlistPickerSong.artist) : undefined}
        actions={playlistActions}
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
