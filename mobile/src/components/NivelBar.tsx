import React from "react";
import { StyleSheet, View } from "react-native";
import { StatusItem } from "../types";
import { statusColor, useThemeColors } from "../theme/colors";

export function NivelBar({ percentual, status }: { percentual: number; status: StatusItem }) {
  const colors = useThemeColors();
  const color = statusColor(colors, status);
  return (
    <View style={[styles.track, { backgroundColor: colors.border }]}>
      <View style={[styles.fill, { width: `${Math.min(100, Math.max(0, percentual))}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
