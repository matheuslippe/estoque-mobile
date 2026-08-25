import React, { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCcw, Pencil, Trash2, Send } from "lucide-react-native";
import { listarHistorico } from "../api/historico";
import { listarItens } from "../api/itens";
import { Item, Movimentacao, TipoMovimentacao } from "../types";
import { useAuth } from "../context/AuthContext";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { TelegramLinkSheet } from "../components/TelegramLinkSheet";

const PERIODOS = [
  { label: "7 dias", dias: 7 },
  { label: "30 dias", dias: 30 },
  { label: "90 dias", dias: 90 },
  { label: "Tudo", dias: null as number | null },
];

const TIPO_LABEL: Record<TipoMovimentacao, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
  CADASTRO: "Cadastro",
  EXCLUSAO: "Exclusão",
};

const TIPO_ICON: Record<TipoMovimentacao, typeof ArrowDownToLine> = {
  ENTRADA: ArrowDownToLine,
  SAIDA: ArrowUpFromLine,
  AJUSTE: RefreshCcw,
  CADASTRO: Pencil,
  EXCLUSAO: Trash2,
};

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function HistoryScreen() {
  const colors = useThemeColors();
  const { logout } = useAuth();
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [itemFiltro, setItemFiltro] = useState<number | null>(null);
  const [periodo, setPeriodo] = useState(PERIODOS[1]);
  const [loading, setLoading] = useState(true);
  const [telegramVisible, setTelegramVisible] = useState(false);

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
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.heading }]}>Histórico</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setTelegramVisible(true)} hitSlop={10}>
            <Send size={18} color={colors.textMuted} strokeWidth={2.3} />
          </Pressable>
          <Pressable onPress={logout} hitSlop={10}>
            <Text style={[styles.sair, { color: colors.primaryStrong }]}>Sair</Text>
          </Pressable>
        </View>
      </View>

      <TelegramLinkSheet visible={telegramVisible} onClose={() => setTelegramVisible(false)} />

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
          renderItem={({ item }) => {
            const Icon = TIPO_ICON[item.tipo];
            const positivo = item.tipo === "ENTRADA" || item.tipo === "CADASTRO";
            const negativo = item.tipo === "SAIDA" || item.tipo === "EXCLUSAO";
            const cor = positivo ? colors.secondary : negativo ? colors.primaryStrong : colors.textMuted;
            return (
              <View style={[styles.linha, { backgroundColor: colors.surface }]}>
                <View style={[styles.iconWrap, { backgroundColor: cor + "1f" }]}>
                  <Icon size={17} color={cor} strokeWidth={2.5} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.item, { color: colors.text, fontFamily: fonts.semiBold }]}>{item.item_nome}</Text>
                  <Text style={[styles.detalhe, { color: colors.textMuted }]}>
                    {TIPO_LABEL[item.tipo]} · {formatarData(item.data_hora)}
                    {item.obs ? ` · ${item.obs}` : ""}
                  </Text>
                </View>
                <Text style={[styles.qtd, { color: cor, fontFamily: fonts.heading }]}>
                  {negativo ? "-" : "+"}
                  {item.quantidade}
                </Text>
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhuma movimentação no período.</Text>
          }
        />
      )}
    </SafeAreaView>
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
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface }]}
    >
      <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: 13, fontFamily: fonts.semiBold }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  title: { fontSize: 25 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  sair: { fontSize: 14, fontWeight: "600" },
  chipsRow: { flexGrow: 0, marginBottom: 10, paddingHorizontal: 20 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  list: { paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 },
  linha: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 12, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  item: { fontSize: 14.5 },
  detalhe: { fontSize: 12, marginTop: 2 },
  qtd: { fontSize: 16 },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
