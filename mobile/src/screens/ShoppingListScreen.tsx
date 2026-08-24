import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, Share2 } from "lucide-react-native";
import { listaCompras, reporFaltantes } from "../api/shopping";
import { listarItens, movimentarItem } from "../api/itens";
import { ItemEmFalta, Item } from "../types";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { usePrevisao } from "../hooks/usePrevisao";
import { Button } from "../components/ui/Button";

export function ShoppingListScreen() {
  const colors = useThemeColors();
  const [itensFalta, setItensFalta] = useState<ItemEmFalta[]>([]);
  const [todosItens, setTodosItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [repondo, setRepondo] = useState(false);
  const [noCarrinho, setNoCarrinho] = useState<Set<number>>(new Set());
  const [comprandoSugestao, setComprandoSugestao] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    const [falta, todos] = await Promise.all([listaCompras(), listarItens()]);
    setItensFalta(falta);
    setTodosItens(todos);
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
      setNoCarrinho(new Set());
      await carregar();
      Alert.alert("Reposição em lote", resultado.detail);
    } finally {
      setRepondo(false);
    }
  }

  function toggleCarrinho(id: number) {
    setNoCarrinho((atual) => {
      const novo = new Set(atual);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  }

  const { previsoes } = usePrevisao(todosItens);

  async function comprarSugestao(itemId: number, faltante: number) {
    setComprandoSugestao(itemId);
    try {
      await movimentarItem(itemId, "ENTRADA", faltante);
      await carregar();
    } catch {
      Alert.alert("Não foi possível", "Tente novamente em instantes.");
    } finally {
      setComprandoSugestao(null);
    }
  }

  const porCategoria = useMemo(
    () =>
      itensFalta.reduce<Record<string, ItemEmFalta[]>>((acc, item) => {
        (acc[item.categoria || "Outros"] ??= []).push(item);
        return acc;
      }, {}),
    [itensFalta]
  );

  const totalUnidades = itensFalta.reduce((soma, i) => soma + i.qtd_a_comprar, 0);

  async function compartilhar() {
    const linhas = itensFalta.map((i) => `- ${i.nome} (+${i.qtd_a_comprar})`).join("\n");
    await Share.share({
      message: itensFalta.length > 0 ? `Lista de compras:\n${linhas}` : "Lista de compras vazia.",
    });
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.heading }]}>Lista de compras</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {itensFalta.length} {itensFalta.length === 1 ? "item" : "itens"} · {totalUnidades} unidades a comprar
          </Text>
        </View>
        <Pressable onPress={compartilhar} style={[styles.iconButton, { backgroundColor: colors.surface }]}>
          <Share2 size={17} color={colors.textMuted} strokeWidth={2.5} />
        </Pressable>
      </View>

      {itensFalta.length > 0 && (
        <View>
          <Button label="Repor todos os itens em falta" onPress={reporTudo} loading={repondo} icon={Check} />
          <Text style={[styles.hint, { color: colors.textFaint }]}>
            Dá entrada de tudo de uma vez quando voltar do mercado
          </Text>
        </View>
      )}

      {Object.entries(porCategoria).map(([categoria, lista]) => (
        <View key={categoria} style={styles.grupo}>
          <Text style={[styles.categoria, { color: colors.textMuted }]}>{categoria}</Text>
          <View style={styles.grupoList}>
            {lista.map((item) => {
              const marcado = noCarrinho.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleCarrinho(item.id)}
                  style={[styles.linha, { backgroundColor: colors.surface }]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      marcado
                        ? { backgroundColor: colors.secondary }
                        : { borderWidth: 2, borderColor: colors.borderStrong },
                    ]}
                  >
                    {marcado && <Check size={14} color="#fff" strokeWidth={3} />}
                  </View>
                  <View style={styles.flex}>
                    <Text
                      style={[
                        styles.nome,
                        { color: marcado ? colors.textFaint : colors.text, fontFamily: fonts.semiBold },
                        marcado && styles.riscado,
                      ]}
                    >
                      {item.nome} {item.zerado && !marcado && <Text style={{ color: colors.primaryStrong, fontFamily: fonts.bold }}>ZERADO</Text>}
                    </Text>
                    <Text style={[styles.detalhe, { color: marcado ? colors.textFaint : colors.textMuted }]}>
                      {marcado ? "no carrinho" : `tem ${item.qtd}, mínimo ${item.qtd_minima}`}
                    </Text>
                  </View>
                  <Text style={[styles.comprar, { color: marcado ? colors.textFaint : colors.primaryStrong, fontFamily: fonts.heading }]}>
                    +{item.qtd_a_comprar}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {previsoes.length > 0 && (
        <View style={styles.grupo}>
          <Text style={[styles.categoria, { color: colors.textMuted }]}>Sugerido pela previsão</Text>
          <View style={styles.grupoList}>
            {previsoes.map(({ item, analise }) => {
              const faltante = Math.max(1, item.qtd_minima - item.qtd);
              const comprando = comprandoSugestao === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => comprarSugestao(item.id, faltante)}
                  disabled={comprando}
                  style={[styles.linha, { backgroundColor: colors.secondary + "22", opacity: comprando ? 0.6 : 1 }]}
                >
                  <View style={[styles.checkbox, { borderWidth: 2, borderColor: colors.secondary }]}>
                    {comprando && <ActivityIndicator size="small" color={colors.secondary} />}
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.nome, { color: colors.text, fontFamily: fonts.semiBold }]}>{item.nome}</Text>
                    <Text style={[styles.detalhe, { color: colors.textMuted }]}>
                      acaba em {analise.dias_restantes} dias no ritmo atual
                    </Text>
                  </View>
                  <Text style={[styles.comprar, { color: colors.secondary, fontFamily: fonts.heading }]}>+{faltante}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {itensFalta.length === 0 && previsoes.length === 0 && (
        <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhum item em falta no momento.</Text>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 20, paddingBottom: 40, gap: 20 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  title: { fontSize: 25 },
  subtitle: { fontSize: 13.5, marginTop: 5 },
  iconButton: { width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  hint: { textAlign: "center", fontSize: 12, marginTop: 9 },
  grupo: { gap: 11 },
  categoria: { fontSize: 11.5, fontFamily: fonts.bold, letterSpacing: 0.6, textTransform: "uppercase" },
  grupoList: { gap: 9 },
  linha: { flexDirection: "row", alignItems: "center", borderRadius: 18, padding: 14, gap: 13 },
  checkbox: { width: 24, height: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  nome: { fontSize: 15 },
  riscado: { textDecorationLine: "line-through" },
  detalhe: { fontSize: 12, marginTop: 3 },
  comprar: { fontSize: 18 },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
