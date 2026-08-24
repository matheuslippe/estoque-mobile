import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Item } from "../types";
import { useStatusStyle, useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { NivelBar } from "./NivelBar";
import { StatusBadge } from "./StatusBadge";

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  const letras = partes.length > 1 ? partes[0][0] + partes[1][0] : nome.slice(0, 2);
  return letras.toUpperCase();
}

export function ItemCard({ item, onPress }: { item: Item; onPress: () => void }) {
  const colors = useThemeColors();
  const statusStyle = useStatusStyle(item.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.avatar, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.avatarText, { color: statusStyle.fg, fontFamily: fonts.heading }]}>{iniciais(item.nome)}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={[styles.nome, { color: colors.text, fontFamily: fonts.semiBold }]} numberOfLines={1}>
            {item.nome}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.nivelRow}>
          <View style={styles.flex}>
            <NivelBar percentual={item.percentual} status={item.status} />
          </View>
          <Text style={[styles.qtd, { color: colors.textMuted }]}>
            {item.qtd} / {item.qtd_minima}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 18,
    padding: 12,
    shadowColor: "#2e2b25",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  avatar: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13 },
  body: { flex: 1, minWidth: 0, gap: 6 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nome: { fontSize: 15, flex: 1, minWidth: 0 },
  nivelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1 },
  qtd: { fontSize: 11.5 },
});
