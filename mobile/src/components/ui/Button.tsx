import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useThemeColors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { radius } from "../../theme/tokens";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  const bg = variant === "primary" ? colors.primary : variant === "secondary" ? "transparent" : "transparent";
  const border = variant === "secondary" ? colors.borderStrong : "transparent";
  const fg = variant === "primary" ? colors.primaryText : variant === "secondary" ? colors.text : colors.primaryStrong;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === "secondary" ? 1 : 0, opacity: isDisabled ? 0.55 : pressed ? 0.8 : 1 },
        variant === "primary" && styles.shadow,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {Icon && <Icon size={18} color={fg} strokeWidth={2.5} />}
          <Text style={[styles.label, { color: fg, fontFamily: fonts.heading }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  shadow: {
    shadowColor: "#2e2b25",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 16 },
});
