import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { listaCompras, reporFaltantes } from "../api/shopping";
import { ItemEmFalta } from "../types";
import { useThemeColors } from "../theme/colors";

export function ShoppingListScreen() {
  const colors = useThemeColors();
  const [itens, setItens] = useState<ItemEmFalta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repondo, setRepondo] = useState(false);

  const carregar = useCallback(async () => {
    setItens(await listaCompras());
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      setLoading(true);
      carregar().finally(() => ativo && setLoading(false));
      return () => {
        ativo = false;
      };
    }, [carregar])
  );

  async function onRefresh() {
    setRefreshing(true);
    await carregar();
    setRefreshing(false);
  }

  async function reporTudo() {
    setRepondo(true);
    try {
      const resultado = await reporFaltantes();
      await carregar();
      Alert.alert("Reposicao em lote", resultado.detail);
    } finally {
      setRepondo(false);
    }
  }

  const porCategoria = itens.reduce<Record<string, ItemEmFalta[]>>((acc, item) => {
    (acc[item.categoria] ??= []).push(item);
    return acc;
  }, {});

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={Object.entries(porCategoria)}
          keyExtractor={([categoria]) => categoria}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={
            itens.length > 0 ? (
              <Pressable
                style={[styles.reporButton, { backgroundColor: colors.primary, opacity: repondo ? 0.7 : 1 }]}
                onPress={reporTudo}
                disabled={repondo}
              >
                {repondo ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.reporText}>Repor todos os itens em falta</Text>
                )}
              </Pressable>
            ) : null
          }
          renderItem={({ item: [categoria, lista] }) => (
            <View style={styles.grupo}>
              <Text style={[styles.categoria, { color: colors.textMuted }]}>{categoria}</Text>
              {lista.map((item) => (
                <View
                  key={item.id}
                  style={[styles.linha, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.nome, { color: colors.text }]}>
                      {item.nome} {item.zerado && <Text style={{ color: colors.zerado }}>(ZERADO)</Text>}
                    </Text>
                    <Text style={[styles.detalhe, { color: colors.textMuted }]}>
                      tem {item.qtd}, minimo {item.qtd_minima}
                    </Text>
                  </View>
                  <Text style={[styles.comprar, { color: colors.primary }]}>+{item.qtd_a_comprar}</Text>
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhum item em falta no momento.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  list: { paddingBottom: 24 },
  reporButton: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginBottom: 16 },
  reporText: { color: "#fff", fontWeight: "700" },
  grupo: { marginBottom: 16, gap: 8 },
  categoria: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  flex: { flex: 1 },
  nome: { fontSize: 15, fontWeight: "600" },
  detalhe: { fontSize: 12, marginTop: 2 },
  comprar: { fontSize: 16, fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
