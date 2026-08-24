import React from "react";
import { StyleSheet, Text } from "react-native";
import { StatusItem } from "../types";
import { STATUS_LABEL, useStatusStyle } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { radius } from "../theme/tokens";

export function StatusBadge({ status }: { status: StatusItem }) {
  const style = useStatusStyle(status);
  return (
    <Text style={[styles.badge, { backgroundColor: style.bg, color: style.fg }]}>{STATUS_LABEL[status]}</Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
});
