import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import { useMemo } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "../hooks/useTheme";
import type { MainTabParamList, RootStackParamList } from "./types";
import { HomeScreen } from "../screens/HomeScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { PlayerScreen } from "../screens/PlayerScreen";
import { ArtistDetailsScreen } from "../screens/ArtistDetailsScreen";
import { AlbumDetailsScreen } from "../screens/AlbumDetailsScreen";
import { QueueScreen } from "../screens/QueueScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { PlaylistsScreen } from "../screens/PlaylistsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { MiniPlayer } from "../components/MiniPlayer";
import { PlaylistDetailsScreen } from "../screens/PlaylistDetailsScreen";
import { HistoryScreen } from "../screens/HistoryScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "home",
  Favorites: "heart-outline",
  Playlists: "list",
  Settings: "settings-outline",
};

type MainTabsProps = NativeStackScreenProps<RootStackParamList, "MainTabs">;

const MainTabs = ({ navigation }: MainTabsProps) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.mainTabsRoot, { backgroundColor: colors.background }]}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: styles.tabLabel,
          tabBarStyle: {
            backgroundColor: "transparent",
            borderTopWidth: 0,
            elevation: 0,
            height: 74,
            paddingBottom: 10,
            paddingTop: 8,
            position: "absolute",
          },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={ICONS[route.name]} color={color} size={focused ? size + 1 : size} />
          ),
          tabBarBackground: () => (
            <BlurView
              intensity={isDark ? 30 : 70}
              tint={isDark ? "dark" : "light"}
              style={[styles.tabBlur, { backgroundColor: colors.tabBar }]}
            />
          ),
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Favorites" component={FavoritesScreen} />
        <Tab.Screen name="Playlists" component={PlaylistsScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>

      <View style={styles.miniPlayer}>
        <MiniPlayer colors={colors} onOpen={() => navigation.navigate("Player")} />
      </View>
    </View>
  );
};

export const RootNavigator = () => {
  const { colors, isDark } = useTheme();

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      dark: isDark,
      colors: {
        ...DefaultTheme.colors,
        background: colors.background,
        card: colors.surface,
        border: colors.border,
        text: colors.text,
        primary: colors.accent,
      },
    }),
    [colors, isDark]
  );

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
        <Stack.Screen name="ArtistDetails" component={ArtistDetailsScreen} />
        <Stack.Screen name="AlbumDetails" component={AlbumDetailsScreen} />
        <Stack.Screen name="Queue" component={QueueScreen} />
        <Stack.Screen name="PlaylistDetails" component={PlaylistDetailsScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  mainTabsRoot: {
    flex: 1,
  },
  tabLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    paddingBottom: 2,
  },
  tabBlur: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    flex: 1,
    overflow: "hidden",
  },
  miniPlayer: {
    bottom: 74,
    left: 0,
    position: "absolute",
    right: 0,
  },
});
