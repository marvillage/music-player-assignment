import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import type { ThemeColors } from "../constants/theme";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  colors: ThemeColors;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = "Clear",
  cancelLabel = "Cancel",
  colors,
  onConfirm,
  onCancel,
}: Props) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onCancel} />
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      <View style={styles.actions}>
        <Pressable style={[styles.button, { borderColor: colors.border }]} onPress={onCancel}>
          <Text style={[styles.cancelText, { color: colors.text }]}>{cancelLabel}</Text>
        </Pressable>
        <Pressable style={[styles.button, { backgroundColor: colors.danger }]} onPress={onConfirm}>
          <Text style={styles.confirmText}>{confirmLabel}</Text>
        </Pressable>
      </View>
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    left: 20,
    padding: 16,
    position: "absolute",
    right: 20,
    top: "36%",
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    marginBottom: 6,
  },
  message: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  button: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 90,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  confirmText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
});
