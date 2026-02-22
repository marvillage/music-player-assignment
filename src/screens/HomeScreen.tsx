import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getArtistById, getArtistSongs, searchAlbums, searchArtists, searchSongs } from "../api/saavn";
import { AlbumCard } from "../components/AlbumCard";
import { AppHeader } from "../components/AppHeader";
import { ArtistRow } from "../components/ArtistRow";
import { BottomSheet } from "../components/BottomSheet";
import { EmptyState } from "../components/EmptyState";
import { SectionHeader } from "../components/SectionHeader";
import { SongRow } from "../components/SongRow";
import { TopCategoryTabs } from "../components/TopCategoryTabs";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../stores/appStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Album, Artist, Song, SortOption } from "../types/music";
import { sortSongs } from "../utils/format";
import { shareAlbum, shareArtist, shareSong } from "../utils/share";

const HOME_TABS = ["Suggested", "Songs", "Artists", "Albums", "Folders"];
const ARTISTS_DISCOVERY_QUERY = "top artists";
const ALBUMS_DISCOVERY_QUERY = "top hindi albums";
const SONG_SORT_OPTIONS: SortOption[] = [
  "Ascending",
  "Descending",
  "Artist",
  "Album",
  "Year",
  "Date Added",
  "Date Modified",
  "Composer",
];

const uniqueById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const output: T[] = [];
  items.forEach((item) => {
    if (seen.has(item.id)) {
      return;
    }
    seen.add(item.id);
    output.push(item);
  });
  return output;
};

export const HomeScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const addPlayNext = usePlayerStore((state) => state.addPlayNext);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const queue = usePlayerStore((state) => state.queue);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const downloaded = useLibraryStore((state) => state.downloaded);
  const downloadSong = useLibraryStore((state) => state.downloadSong);
  const removeDownload = useLibraryStore((state) => state.removeDownload);
  const cacheSongs = useLibraryStore((state) => state.cacheSongs);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const isFavorite = useLibraryStore((state) => state.isFavorite);
  const playlists = useLibraryStore((state) => state.playlists);
  const addSongToPlaylist = useLibraryStore((state) => state.addSongToPlaylist);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);
  const toggleFollowAlbum = useLibraryStore((state) => state.toggleFollowAlbum);
  const isFollowingAlbum = useLibraryStore((state) => state.isFollowingAlbum);
  const recentlyPlayed = useAppStore((state) => state.recentlyPlayed);

  const [activeTab, setActiveTab] = useState("Suggested");
  const [songSort, setSongSort] = useState<SortOption>("Ascending");
  const [sortVisible, setSortVisible] = useState(false);
  const [songSheet, setSongSheet] = useState<Song | null>(null);
  const [playlistPickerSong, setPlaylistPickerSong] = useState<Song | null>(null);
  const [artistSheet, setArtistSheet] = useState<Artist | null>(null);
  const [albumSheet, setAlbumSheet] = useState<Album | null>(null);

  const [suggestedSongs, setSuggestedSongs] = useState<Song[]>([]);
  const [suggestedArtists, setSuggestedArtists] = useState<Artist[]>([]);
  const [mostPlayed, setMostPlayed] = useState<Song[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(false);

  const [songs, setSongs] = useState<Song[]>([]);
  const [songsPage, setSongsPage] = useState(1);
  const [songsTotal, setSongsTotal] = useState(0);
  const [songsHasMore, setSongsHasMore] = useState(true);
  const [songsLoading, setSongsLoading] = useState(false);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsPage, setArtistsPage] = useState(1);
  const [artistsTotal, setArtistsTotal] = useState(0);
  const [artistsHasMore, setArtistsHasMore] = useState(true);
  const [artistsLoading, setArtistsLoading] = useState(false);

  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsPage, setAlbumsPage] = useState(1);
  const [albumsTotal, setAlbumsTotal] = useState(0);
  const [albumsHasMore, setAlbumsHasMore] = useState(true);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const loadingSuggestedRef = useRef(false);
  const songsLoadingRef = useRef(false);
  const artistsLoadingRef = useRef(false);
  const albumsLoadingRef = useRef(false);
  const songsInitRef = useRef(false);
  const artistsInitRef = useRef(false);
  const albumsInitRef = useRef(false);

  const downloadedSongs = useMemo(
    () => songs.filter((song) => Boolean(downloaded[song.id])),
    [songs, downloaded]
  );

  const sortedSongs = useMemo(() => sortSongs(songs, songSort), [songs, songSort]);
  const recentList = suggestedSongs.length > 0 ? suggestedSongs : recentlyPlayed;

  const loadSuggested = useCallback(async () => {
    if (loadingSuggestedRef.current) {
      return;
    }
    loadingSuggestedRef.current = true;
    setLoadingSuggested(true);
    try {
      const [globalSongsResult, localSongsResult, mostPlayedSeedResult, globalArtistsResult] = await Promise.allSettled([
        searchSongs("top hits", 1),
        searchSongs("english songs", 1),
        searchSongs("hindi songs", 1),
        searchArtists(ARTISTS_DISCOVERY_QUERY, 1),
      ]);
      const globalSongs = globalSongsResult.status === "fulfilled" ? globalSongsResult.value.items : [];
      const localSongs = localSongsResult.status === "fulfilled" ? localSongsResult.value.items : [];
      const mostPlayedSeed = mostPlayedSeedResult.status === "fulfilled" ? mostPlayedSeedResult.value.items : [];
      const globalArtists = globalArtistsResult.status === "fulfilled" ? globalArtistsResult.value.items : [];

      const mixedSuggested = uniqueById([...globalSongs, ...localSongs]).slice(0, 10);
      const mixedMostPlayed = uniqueById([...mostPlayedSeed, ...globalSongs, ...localSongs]).slice(0, 10);
      const fallbackArtistsByName = new Map<string, Artist>();
      [...mixedSuggested, ...mixedMostPlayed]
        .filter((song) => song.artist.trim().length > 0)
        .forEach((song) => {
          const key = song.artist.toLowerCase();
          if (fallbackArtistsByName.has(key)) {
            return;
          }
          fallbackArtistsByName.set(key, {
            id: song.artistId ?? `derived-${song.id}`,
            name: song.artist,
            image: song.image,
          });
        });
      const fallbackArtists = [...fallbackArtistsByName.values()];

      setSuggestedSongs(mixedSuggested.length > 0 ? mixedSuggested : recentlyPlayed.slice(0, 10));
      setMostPlayed(mixedMostPlayed.length > 0 ? mixedMostPlayed : recentlyPlayed.slice(0, 10));
      setSuggestedArtists((globalArtists.length > 0 ? globalArtists : fallbackArtists).slice(0, 10));
      cacheSongs([...mixedSuggested, ...mixedMostPlayed]);
    } finally {
      loadingSuggestedRef.current = false;
      setLoadingSuggested(false);
    }
  }, [cacheSongs, recentlyPlayed]);

  const loadSongs = useCallback(
    async (page: number) => {
      if (songsLoadingRef.current) {
        return;
      }
      songsLoadingRef.current = true;
      setSongsLoading(true);
      try {
        const response = await searchSongs("top songs", page);
        const mergedItems = uniqueById(response.items);
        cacheSongs(mergedItems);
        setSongsTotal(response.total);
        setSongsHasMore(response.hasMore);
        setSongsPage(page);
        setSongs((prev) => (page === 1 ? mergedItems : uniqueById([...prev, ...mergedItems])));
      } finally {
        songsLoadingRef.current = false;
        setSongsLoading(false);
      }
    },
    [cacheSongs]
  );

  const enrichArtistsWithStats = useCallback(async (items: Artist[]): Promise<Artist[]> => {
    const missingStats = items.filter((item) => item.albumCount === undefined || item.songCount === undefined);
    if (missingStats.length === 0) {
      return items;
    }

    const detailResults = await Promise.allSettled(missingStats.map((item) => getArtistById(item.id)));
    const detailById = new Map<string, Artist>();
    detailResults.forEach((result, index) => {
      if (result.status !== "fulfilled" || !result.value) {
        return;
      }
      detailById.set(missingStats[index].id, result.value);
    });

    return items.map((item) => {
      const detail = detailById.get(item.id);
      if (!detail) {
        return item;
      }
      return {
        ...item,
        albumCount: item.albumCount ?? detail.albumCount ?? 0,
        songCount: item.songCount ?? detail.songCount ?? 0,
      };
    });
  }, []);

  const loadArtists = useCallback(
    async (page: number) => {
      if (artistsLoadingRef.current) {
        return;
      }
      artistsLoadingRef.current = true;
      setArtistsLoading(true);
      try {
        const response = await searchArtists(ARTISTS_DISCOVERY_QUERY, page);
        const mergedItems = uniqueById(response.items);
        const enrichedItems = await enrichArtistsWithStats(mergedItems);
        setArtistsTotal(response.total);
        setArtistsHasMore(response.hasMore);
        setArtistsPage(page);
        setArtists((prev) => (page === 1 ? enrichedItems : uniqueById([...prev, ...enrichedItems])));
      } finally {
        artistsLoadingRef.current = false;
        setArtistsLoading(false);
      }
    },
    [enrichArtistsWithStats]
  );

  const loadAlbums = useCallback(
    async (page: number) => {
      if (albumsLoadingRef.current) {
        return;
      }
      albumsLoadingRef.current = true;
      setAlbumsLoading(true);
      try {
        const response = await searchAlbums(ALBUMS_DISCOVERY_QUERY, page);
        const mergedItems = uniqueById(response.items);
        setAlbumsTotal(response.total);
        setAlbumsHasMore(response.hasMore);
        setAlbumsPage(page);
        setAlbums((prev) => (page === 1 ? mergedItems : uniqueById([...prev, ...mergedItems])));
      } finally {
        albumsLoadingRef.current = false;
        setAlbumsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadSuggested();
  }, [loadSuggested]);

  useEffect(() => {
    if (activeTab === "Songs" && !songsInitRef.current) {
      songsInitRef.current = true;
      void loadSongs(1);
      return;
    }
    if (activeTab === "Artists" && !artistsInitRef.current) {
      artistsInitRef.current = true;
      void loadArtists(1);
      return;
    }
    if (activeTab === "Albums" && !albumsInitRef.current) {
      albumsInitRef.current = true;
      void loadAlbums(1);
      return;
    }
    if (activeTab === "Folders" && !songsInitRef.current) {
      songsInitRef.current = true;
      void loadSongs(1);
    }
  }, [activeTab, loadAlbums, loadArtists, loadSongs]);

  const playFromList = async (list: Song[], index: number) => {
    await setQueueAndPlay(list, index);
    navigation.navigate("Player");
  };

  const isSongActive = (song: Song) => queue[currentIndex]?.id === song.id;
  const fetchArtistSongs = useCallback(
    async (artist: Artist): Promise<Song[]> => {
      try {
        const response = await getArtistSongs(artist.id, 1);
        const items = uniqueById(response.items);
        if (items.length > 0) {
          cacheSongs(items);
        }
        return items;
      } catch {
        return [];
      }
    },
    [cacheSongs]
  );

  const songActions = useMemo(() => {
    if (!songSheet) {
      return [];
    }
    const isDownloaded = Boolean(downloaded[songSheet.id]);
    const favorite = isFavorite(songSheet.id);
    return [
      {
        id: "next",
        label: "Play Next",
        icon: "arrow-forward-circle-outline" as const,
        onPress: () => addPlayNext(songSheet),
      },
      {
        id: "queue",
        label: "Add to Playing Queue",
        icon: "document-text-outline" as const,
        onPress: () => addToQueue(songSheet),
      },
      {
        id: "album",
        label: "Go to Album",
        icon: "disc-outline" as const,
        onPress: () => {
          navigation.navigate("AlbumDetails", {
            album: {
              id: songSheet.albumId ?? songSheet.id,
              name: songSheet.albumName ?? "Album",
              artistName: songSheet.artist,
              image: songSheet.image,
              year: songSheet.year,
            },
          });
        },
      },
      {
        id: "artist",
        label: "Go to Artist",
        icon: "person-outline" as const,
        onPress: () => {
          navigation.navigate("ArtistDetails", {
            artist: {
              id: songSheet.artistId ?? songSheet.id,
              name: songSheet.artist,
              image: songSheet.image,
            },
          });
        },
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
        label: isDownloaded ? "Delete from Device" : "Download Offline",
        icon: isDownloaded ? ("trash-outline" as const) : ("download-outline" as const),
        onPress: () => {
          if (isDownloaded) {
            void removeDownload(songSheet.id);
          } else {
            void downloadSong(songSheet);
          }
        },
      },
      {
        id: "share",
        label: "Share Song",
        icon: "paper-plane-outline" as const,
        onPress: () => {
          void shareSong(songSheet);
        },
      },
    ];
  }, [
    addPlayNext,
    addToQueue,
    downloaded,
    downloadSong,
    isFavorite,
    navigation,
    removeDownload,
    songSheet,
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

  const artistActions = useMemo(() => {
    if (!artistSheet) {
      return [];
    }
    return [
      {
        id: "play",
        label: "Play",
        icon: "play-circle-outline" as const,
        onPress: () => {
          void (async () => {
            const artistSongs = await fetchArtistSongs(artistSheet);
            if (artistSongs.length > 0) {
              await setQueueAndPlay(artistSongs, 0);
              navigation.navigate("Player");
              return;
            }
            navigation.navigate("ArtistDetails", { artist: artistSheet });
          })();
        },
      },
      {
        id: "next",
        label: "Play Next",
        icon: "arrow-forward-circle-outline" as const,
        onPress: () => {
          void (async () => {
            const artistSongs = await fetchArtistSongs(artistSheet);
            if (artistSongs[0]) {
              addPlayNext(artistSongs[0]);
            }
          })();
        },
      },
      {
        id: "queue",
        label: "Add to Playing Queue",
        icon: "document-text-outline" as const,
        onPress: () => {
          void (async () => {
            const artistSongs = await fetchArtistSongs(artistSheet);
            artistSongs.forEach((song) => addToQueue(song));
          })();
        },
      },
      {
        id: "playlist",
        label: "Add to Playlist",
        icon: "add-circle-outline" as const,
        onPress: () => {
          void (async () => {
            const artistSongs = await fetchArtistSongs(artistSheet);
            if (artistSongs[0]) {
              setPlaylistPickerSong(artistSongs[0]);
            }
          })();
        },
      },
      {
        id: "share",
        label: "Share",
        icon: "paper-plane-outline" as const,
        onPress: () => {
          void shareArtist(artistSheet);
        },
      },
    ];
  }, [addPlayNext, addToQueue, artistSheet, fetchArtistSongs, navigation, setQueueAndPlay]);

  const albumActions = useMemo(() => {
    if (!albumSheet) {
      return [];
    }
    const following = isFollowingAlbum(albumSheet.id);
    return [
      {
        id: "follow",
        label: following ? "Unfollow Album" : "Follow Album",
        icon: following ? ("checkmark-circle-outline" as const) : ("add-circle-outline" as const),
        onPress: () => toggleFollowAlbum(albumSheet.id),
      },
      {
        id: "open",
        label: "Go to Album",
        icon: "disc-outline" as const,
        onPress: () => navigation.navigate("AlbumDetails", { album: albumSheet }),
      },
      {
        id: "share",
        label: "Share Album",
        icon: "share-social-outline" as const,
        onPress: () => {
          void shareAlbum(albumSheet);
        },
      },
    ];
  }, [albumSheet, isFollowingAlbum, navigation, toggleFollowAlbum]);

  const renderSuggested = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageBottomPad}>
      <View style={styles.sectionWrap}>
        <SectionHeader title="Recently Played" colors={colors} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
          {recentList.map((song, index) => (
            <Pressable key={song.id} style={styles.squareItem} onPress={() => void playFromList(recentList, index)}>
              <Image source={{ uri: song.image }} style={styles.squareCover} />
              <Text numberOfLines={2} style={[styles.squareLabel, { color: colors.text }]}>
                {song.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionWrap}>
        <SectionHeader title="Artists" colors={colors} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
          {suggestedArtists.map((artist) => (
            <Pressable
              key={artist.id}
              style={styles.circleItem}
              onPress={() => navigation.navigate("ArtistDetails", { artist })}
            >
              <Image source={{ uri: artist.image }} style={styles.circleCover} />
              <Text numberOfLines={1} style={[styles.squareLabel, { color: colors.text }]}>
                {artist.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionWrap}>
        <SectionHeader title="Most Played" colors={colors} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
          {mostPlayed.map((song, index) => (
            <Pressable key={song.id} style={styles.squareItem} onPress={() => void playFromList(mostPlayed, index)}>
              <Image source={{ uri: song.image }} style={styles.squareCover} />
              <Text numberOfLines={2} style={[styles.squareLabel, { color: colors.text }]}>
                {song.title}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loadingSuggested ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </ScrollView>
  );

  const renderSongs = () => (
    <FlatList
      data={sortedSongs}
      keyExtractor={(item) => item.id}
      onEndReachedThreshold={0.5}
      onEndReached={() => {
        if (songsHasMore && !songsLoading) {
          void loadSongs(songsPage + 1);
        }
      }}
      ListHeaderComponent={
        <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.count, { color: colors.text }]}>{songsTotal || songs.length} songs</Text>
          <Pressable onPress={() => setSortVisible(true)} style={styles.sortRow}>
            <Text style={[styles.sortText, { color: colors.accent }]}>{songSort}</Text>
            <Ionicons name="swap-vertical" size={16} color={colors.accent} />
          </Pressable>
        </View>
      }
      renderItem={({ item, index }) => (
        <SongRow
          song={item}
          colors={colors}
          isActive={isSongActive(item)}
          isPlaying={isPlaying}
          onPress={() => void playFromList(sortedSongs, index)}
          onPlayPress={() => void playFromList(sortedSongs, index)}
          onMenuPress={() => setSongSheet(item)}
        />
      )}
      ListFooterComponent={
        songsLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View style={styles.pageBottomPad} />
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );

  const renderArtists = () => (
    <FlatList
      data={artists}
      keyExtractor={(item) => item.id}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (artistsHasMore && !artistsLoading) {
          void loadArtists(artistsPage + 1);
        }
      }}
      ListHeaderComponent={
        <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.count, { color: colors.text }]}>{artistsTotal || artists.length} artists</Text>
          <Text style={[styles.sortText, { color: colors.accent }]}>Date Added</Text>
        </View>
      }
      renderItem={({ item }) => (
        <ArtistRow
          artist={item}
          colors={colors}
          onPress={() => navigation.navigate("ArtistDetails", { artist: item })}
          onMenuPress={() => setArtistSheet(item)}
        />
      )}
      ListFooterComponent={
        artistsLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View style={styles.pageBottomPad} />
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );

  const renderAlbums = () => (
    <FlatList
      data={albums}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={styles.gridList}
      columnWrapperStyle={styles.gridRow}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (albumsHasMore && !albumsLoading) {
          void loadAlbums(albumsPage + 1);
        }
      }}
      ListHeaderComponent={
        <View style={[styles.listHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.count, { color: colors.text }]}>{albumsTotal || albums.length} albums</Text>
          <Text style={[styles.sortText, { color: colors.accent }]}>Date Modified</Text>
        </View>
      }
      renderItem={({ item }) => (
        <AlbumCard
          album={item}
          colors={colors}
          onPress={() => navigation.navigate("AlbumDetails", { album: item })}
          onMenuPress={() => setAlbumSheet(item)}
        />
      )}
      ListFooterComponent={
        albumsLoading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <View style={styles.pageBottomPad} />
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );

  const renderFolders = () => {
    if (downloadedSongs.length === 0) {
      return (
        <EmptyState
          colors={colors}
          title="No Offline Songs"
          message="Download songs from the song options menu to access them here."
          icon="download-outline"
        />
      );
    }
    return (
      <FlatList
        data={downloadedSongs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            colors={colors}
            isActive={isSongActive(item)}
            isPlaying={isPlaying}
            onPress={() => void playFromList(downloadedSongs, index)}
            onPlayPress={() => void playFromList(downloadedSongs, index)}
            onMenuPress={() => setSongSheet(item)}
          />
        )}
        contentContainerStyle={styles.pageBottomPad}
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}
      edges={["left", "right", "bottom"]}
    >
      <AppHeader colors={colors} onSearchPress={() => navigation.navigate("Search")} />
      <TopCategoryTabs items={HOME_TABS} active={activeTab} onChange={setActiveTab} colors={colors} />

      <View style={styles.content}>
        {activeTab === "Suggested" && renderSuggested()}
        {activeTab === "Songs" && renderSongs()}
        {activeTab === "Artists" && renderArtists()}
        {activeTab === "Albums" && renderAlbums()}
        {activeTab === "Folders" && renderFolders()}
      </View>

      <BottomSheet
        visible={sortVisible}
        onClose={() => setSortVisible(false)}
        colors={colors}
        actions={SONG_SORT_OPTIONS.map((option) => ({
          id: option,
          label: option,
          active: option === songSort,
          showRadio: true,
          onPress: () => setSongSort(option),
        }))}
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
        subtitle={playlistPickerSong ? `${playlistPickerSong.title} - ${playlistPickerSong.artist}` : undefined}
        actions={playlistActions}
      />

      <BottomSheet
        visible={Boolean(artistSheet)}
        onClose={() => setArtistSheet(null)}
        colors={colors}
        image={artistSheet?.image}
        title={artistSheet?.name}
        subtitle={
          artistSheet
            ? `${(artistSheet.albumCount ?? 0).toString()} Album   |   ${(artistSheet.songCount ?? 0).toString()} Songs`
            : undefined
        }
        actions={artistActions}
      />

      <BottomSheet
        visible={Boolean(albumSheet)}
        onClose={() => setAlbumSheet(null)}
        colors={colors}
        image={albumSheet?.image}
        title={albumSheet?.name}
        subtitle={albumSheet?.artistName}
        actions={albumActions}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  sectionWrap: {
    marginTop: 18,
    paddingHorizontal: 20,
  },
  hRow: {
    gap: 14,
    paddingRight: 20,
  },
  squareItem: {
    width: 168,
  },
  squareCover: {
    borderRadius: 22,
    height: 168,
    marginBottom: 8,
    width: 168,
  },
  squareLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18 / 1.2,
    lineHeight: 22,
  },
  circleItem: {
    width: 168,
  },
  circleCover: {
    borderRadius: 999,
    height: 168,
    marginBottom: 8,
    width: 168,
  },
  listHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 12,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  count: {
    fontFamily: "Poppins_700Bold",
    fontSize: 23 / 1.3,
  },
  sortRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  sortText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  loaderWrap: {
    paddingVertical: 24,
  },
  pageBottomPad: {
    paddingBottom: 156,
  },
  gridList: {
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  gridRow: {
    justifyContent: "space-between",
  },
});
