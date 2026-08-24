import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { radius } from "../theme/tokens";

export function StatCard({
  icon: Icon,
  label,
  value,
  caption,
  highlighted,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  caption: string;
  highlighted?: boolean;
  tone?: "default" | "warning";
}) {
  const colors = useThemeColors();
  const bg = highlighted ? colors.secondary : colors.surface;
  const fg = highlighted ? "#ffffff" : tone === "warning" ? colors.primaryStrong : colors.text;
  const labelColor = highlighted ? "rgba(255,255,255,0.85)" : tone === "warning" ? colors.primaryStrong : colors.textMuted;
  const captionColor = highlighted ? "rgba(255,255,255,0.8)" : colors.textMuted;

  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <View style={styles.header}>
        <Icon size={15} color={labelColor} strokeWidth={2.5} />
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={[styles.value, { color: fg, fontFamily: fonts.heading }]}>{value}</Text>
      <Text style={[styles.caption, { color: captionColor }]}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 20,
    padding: 13,
    shadowColor: "#2e2b25",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 1,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: { fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.2 },
  value: { fontSize: 30, marginTop: 8 },
  caption: { fontSize: 12, marginTop: 4 },
});
