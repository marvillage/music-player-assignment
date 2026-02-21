import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";

type Props = {
  colors: ThemeColors;
  onSearchPress?: () => void;
};

export const AppHeader = ({ colors, onSearchPress }: Props) => (
  <View style={styles.container}>
    <View style={styles.left}>
      <Ionicons name="musical-notes" size={30} color={colors.accent} />
      <Text style={[styles.title, { color: colors.text }]}>Mume</Text>
    </View>
    <Pressable onPress={onSearchPress} hitSlop={10}>
      <Ionicons name="search" size={28} color={colors.text} />
    </Pressable>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  left: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 37 / 1.5,
  },
});
