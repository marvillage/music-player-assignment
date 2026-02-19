import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";

type Props = {
  colors: ThemeColors;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export const EmptyState = ({ colors, title, message, icon = "alert-circle-outline" }: Props) => (
  <View style={styles.container}>
    <View style={[styles.emojiWrap, { backgroundColor: colors.accentSoft }]}>
      <Ionicons name={icon} size={84} color={colors.accent} />
    </View>
    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
    <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  emojiWrap: {
    alignItems: "center",
    borderRadius: 999,
    height: 170,
    justifyContent: "center",
    marginBottom: 18,
    width: 170,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 37 / 1.6,
    marginBottom: 4,
  },
  message: {
    fontFamily: "Poppins_400Regular",
    fontSize: 17 / 1.2,
    textAlign: "center",
  },
});

