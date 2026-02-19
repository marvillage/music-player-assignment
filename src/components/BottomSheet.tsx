import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";

export type SheetAction = {
  id: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  image?: string;
  colors: ThemeColors;
  actions: SheetAction[];
  onClose: () => void;
};

export const BottomSheet = ({ visible, title, subtitle, image, colors, actions, onClose }: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose} />
    <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
      <View style={[styles.grabber, { backgroundColor: colors.border }]} />
      {(title || subtitle) && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          {image ? <Image source={{ uri: image }} style={styles.image} /> : null}
          <View style={styles.headerText}>
            {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
            {subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
          </View>
        </View>
      )}
      {actions.map((action) => (
        <Pressable
          key={action.id}
          onPress={() => {
            action.onPress();
            onClose();
          }}
          style={[styles.actionRow, { borderBottomColor: colors.border }]}
        >
          {action.icon ? <Ionicons name={action.icon} size={23} color={action.active ? colors.accent : colors.text} /> : <View style={styles.actionSpacer} />}
          <Text style={[styles.actionLabel, { color: action.active ? colors.accent : colors.text }]}>
            {action.label}
          </Text>
          {action.active ? <Ionicons name="radio-button-on" size={18} color={colors.accent} /> : null}
        </Pressable>
      ))}
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    bottom: 0,
    left: 0,
    maxHeight: "82%",
    paddingBottom: 20,
    position: "absolute",
    right: 0,
  },
  grabber: {
    alignSelf: "center",
    borderRadius: 99,
    height: 4,
    marginVertical: 8,
    width: 72,
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    marginHorizontal: 24,
    paddingBottom: 14,
    paddingTop: 6,
  },
  image: {
    borderRadius: 14,
    height: 54,
    marginRight: 12,
    width: 54,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 25 / 1.3,
  },
  subtitle: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  actionRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  actionSpacer: {
    width: 23,
  },
  actionLabel: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 28 / 1.6,
    marginLeft: 14,
  },
});

