import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Item } from "../types";
import { useThemeColors } from "../theme/colors";
import { StatusBadge } from "./StatusBadge";
import { NivelBar } from "./NivelBar";

export function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.nome, { color: colors.text }]} numberOfLines={1}>
          {item.nome}
        </Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={[styles.categoria, { color: colors.textMuted }]}>{item.categoria}</Text>
      <NivelBar percentual={item.percentual} status={item.status} />
      <Text style={[styles.qtd, { color: colors.textMuted }]}>
        {item.qtd} un. (min. {item.qtd_minima})
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  nome: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  categoria: { fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  qtd: { fontSize: 13 },
});
