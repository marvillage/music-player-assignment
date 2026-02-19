import { ScrollView, Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";

type Props = {
  items: string[];
  active: string;
  onChange: (item: string) => void;
  colors: ThemeColors;
};

export const TopCategoryTabs = ({ items, active, onChange, colors }: Props) => (
  <View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => {
        const selected = item === active;
        return (
          <Pressable key={item} onPress={() => onChange(item)} style={styles.tab}>
            <Text
              style={[
                styles.label,
                { color: selected ? colors.accent : colors.textSecondary, fontFamily: selected ? "Poppins_600SemiBold" : "Poppins_500Medium" },
              ]}
            >
              {item}
            </Text>
            <View style={[styles.indicator, { backgroundColor: selected ? colors.accent : "transparent" }]} />
          </Pressable>
        );
      })}
    </ScrollView>
    <View style={[styles.divider, { backgroundColor: colors.border }]} />
  </View>
);

const styles = StyleSheet.create({
  row: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  tab: {
    alignItems: "center",
    paddingBottom: 11,
  },
  label: {
    fontSize: 19 / 1.4,
  },
  indicator: {
    borderRadius: 10,
    height: 4,
    marginTop: 10,
    minWidth: 62,
  },
  divider: {
    height: 1,
    marginHorizontal: 20,
  },
});

