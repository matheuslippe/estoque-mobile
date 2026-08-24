import React from "react";
import { StyleSheet, View } from "react-native";
import { StatusItem } from "../types";
import { useStatusStyle, useThemeColors } from "../theme/colors";
import { radius } from "../theme/tokens";

export function NivelBar({ percentual, status }: { percentual: number; status: StatusItem }) {
  const colors = useThemeColors();
  const style = useStatusStyle(status);
  return (
    <View style={[styles.track, { backgroundColor: colors.border }]}>
      <View style={[styles.fill, { width: `${Math.min(100, Math.max(3, percentual))}%`, backgroundColor: style.bar }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 5,
    borderRadius: radius.pill,
    overflow: "hidden",
    width: "100%",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
  },
});
