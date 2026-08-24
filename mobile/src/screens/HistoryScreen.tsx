import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { listarHistorico } from "../api/historico";
import { listarItens } from "../api/itens";
import { Item, Movimentacao, TipoMovimentacao } from "../types";
import { useThemeColors } from "../theme/colors";

const PERIODOS = [
  { label: "7 dias", dias: 7 },
  { label: "30 dias", dias: 30 },
  { label: "90 dias", dias: 90 },
  { label: "Tudo", dias: null as number | null },
];

const TIPO_LABEL: Record<TipoMovimentacao, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saida",
  AJUSTE: "Ajuste",
  CADASTRO: "Cadastro",
  EXCLUSAO: "Exclusao",
};

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function corTipo(tipo: TipoMovimentacao, colors: ReturnType<typeof useThemeColors>) {
  if (tipo === "ENTRADA" || tipo === "CADASTRO") return colors.ok;
  if (tipo === "SAIDA" || tipo === "EXCLUSAO") return colors.zerado;
  return colors.baixo;
}

export function HistoryScreen() {
  const colors = useThemeColors();
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [itemFiltro, setItemFiltro] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState(PERIODOS[1]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarItens().then(setItens);
  }, []);

  const carregar = useCallback(async () => {
    const params: { item?: number; data_inicio?: string } = {};
    if (itemFiltro) params.item = itemFiltro;
    if (periodo.dias) {
      const desde = new Date();
      desde.setDate(desde.getDate() - periodo.dias);
      params.data_inicio = desde.toISOString().slice(0, 10);
    }
    setMovs(await listarHistorico(params));
  }, [itemFiltro, periodo]);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        {PERIODOS.map((p) => (
          <Chip key={p.label} label={p.label} active={p.dias === periodo.dias} onPress={() => setPeriodo(p)} colors={colors} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
        <Chip label="Todos os itens" active={itemFiltro === null} onPress={() => setItemFiltro(null)} colors={colors} />
        {itens.map((item) => (
          <Chip
            key={item.id}
            label={item.nome}
            active={itemFiltro === item.id}
            onPress={() => setItemFiltro(item.id)}
            colors={colors}
          />
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={movs}
          keyExtractor={(m) => String(m.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.linha, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.tipoDot, { backgroundColor: corTipo(item.tipo, colors) }]} />
              <View style={styles.flex}>
                <Text style={[styles.item, { color: colors.text }]}>{item.item_nome}</Text>
                <Text style={[styles.detalhe, { color: colors.textMuted }]}>
                  {TIPO_LABEL[item.tipo]} · {formatarData(item.data_hora)}
                  {item.obs ? ` · ${item.obs}` : ""}
                </Text>
              </View>
              <Text style={[styles.qtd, { color: corTipo(item.tipo, colors) }]}>
                {item.tipo === "SAIDA" || item.tipo === "EXCLUSAO" ? "-" : "+"}
                {item.quantidade}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhuma movimentacao no periodo.</Text>
          }
        />
      )}
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={{ color: active ? "#fff" : colors.text, fontSize: 13, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  chipsRow: { flexGrow: 0, marginBottom: 10, paddingHorizontal: 16 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7, marginRight: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  linha: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  tipoDot: { width: 8, height: 8, borderRadius: 4 },
  flex: { flex: 1 },
  item: { fontSize: 14, fontWeight: "600" },
  detalhe: { fontSize: 12, marginTop: 2 },
  qtd: { fontSize: 15, fontWeight: "800" },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
