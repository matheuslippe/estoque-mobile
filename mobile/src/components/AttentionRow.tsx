import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Item } from "../types";
import { useStatusStyle, useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { iconForItem } from "../theme/icons";
import { NivelBar } from "./NivelBar";
import { StatusBadge } from "./StatusBadge";

export function AttentionRow({ item, onPress }: { item: Item; onPress: () => void }) {
  const colors = useThemeColors();
  const statusStyle = useStatusStyle(item.status);
  const Icon = iconForItem(item.nome, item.categoria);
  const unidade = item.status === "zerado" ? "Zerado" : `${item.qtd} un.`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.icon, { backgroundColor: statusStyle.bg }]}>
        <Icon size={21} color={statusStyle.fg} strokeWidth={2.25} />
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.nome, { color: colors.text, fontFamily: fonts.semiBold }]} numberOfLines={1}>
            {item.nome}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {unidade} · mínimo {item.qtd_minima}
        </Text>
        <NivelBar percentual={item.percentual} status={item.status} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 18, padding: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0, gap: 5 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nome: { fontSize: 15, flex: 1, minWidth: 0 },
  meta: { fontSize: 12 },
});
