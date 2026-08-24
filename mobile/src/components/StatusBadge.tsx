import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { StatusItem } from "../types";
import { statusColor, useThemeColors } from "../theme/colors";

const LABEL: Record<StatusItem, string> = {
  ok: "OK",
  baixo: "Baixo",
  zerado: "Zerado",
};

export function StatusBadge({ status }: { status: StatusItem }) {
  const colors = useThemeColors();
  const color = statusColor(colors, status);
  return (
    <View style={[styles.badge, { backgroundColor: color + "22", borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "600" },
});
