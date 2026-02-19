import { Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";

type Props = {
  title: string;
  colors: ThemeColors;
  onSeeAll?: () => void;
};

export const SectionHeader = ({ title, colors, onSeeAll }: Props) => (
  <View style={styles.container}>
    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
    {onSeeAll ? (
      <Pressable onPress={onSeeAll}>
        <Text style={[styles.action, { color: colors.accent }]}>See All</Text>
      </Pressable>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 37 / 1.7,
  },
  action: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
});

