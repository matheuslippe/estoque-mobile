import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CircleAlert, Package, ArrowDownToLine, Plus, Sparkles } from "lucide-react-native";
import { InicioStackParamList, MainTabParamList } from "../navigation/types";
import { listarItens, movimentarItem } from "../api/itens";
import { listarHistorico } from "../api/historico";
import { Item } from "../types";
import { useAuth } from "../context/AuthContext";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { usePrevisao } from "../hooks/usePrevisao";
import { StatCard } from "../components/StatCard";
import { AttentionRow } from "../components/AttentionRow";
import { NewItemSheet } from "../components/NewItemSheet";
import { criarItem } from "../api/itens";

type Props = NativeStackScreenProps<InicioStackParamList, "Dashboard">;

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const { username } = useAuth();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [itens, setItens] = useState<Item[]>([]);
  const [entradas7d, setEntradas7d] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [repondoId, setRepondoId] = useState<number | null>(null);

  const carregar = useCallback(async () => {
    const desde = new Date();
    desde.setDate(desde.getDate() - 7);
    const [itensData, historicoData] = await Promise.all([
      listarItens(),
      listarHistorico({ data_inicio: desde.toISOString().slice(0, 10) }),
    ]);
    setItens(itensData);
    setEntradas7d(historicoData.filter((m) => m.tipo === "ENTRADA").length);
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

  const emFalta = useMemo(() => itens.filter((i) => i.status === "zerado"), [itens]);
  const categorias = useMemo(() => new Set(itens.map((i) => i.categoria)).size, [itens]);
  const totalUnidades = useMemo(() => itens.reduce((soma, i) => soma + i.qtd, 0), [itens]);
  const precisamAtencao = useMemo(
    () =>
      itens
        .filter((i) => i.status !== "ok")
        .sort((a, b) => (a.status === b.status ? 0 : a.status === "zerado" ? -1 : 1))
        .slice(0, 4),
    [itens]
  );

  const { previsoes } = usePrevisao(itens);
  const previsao = previsoes[0];

  async function jaComprei() {
    if (!previsao) return;
    const faltante = Math.max(1, previsao.item.qtd_minima - previsao.item.qtd);
    setRepondoId(previsao.item.id);
    try {
      await movimentarItem(previsao.item.id, "ENTRADA", faltante);
      await carregar();
    } catch {
      Alert.alert("Nao foi possivel", "Tente novamente em instantes.");
    } finally {
      setRepondoId(null);
    }
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
      <View>
        <Text style={[styles.greeting, { color: colors.text, fontFamily: fonts.heading }]}>
          {saudacao()}{username ? `, ${username}` : ""}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {precisamAtencao.length === 0
            ? "Tudo em ordem por aqui."
            : `Tudo em ordem por aqui — ${precisamAtencao.length} ${precisamAtencao.length === 1 ? "item pede" : "itens pedem"} atenção.`}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatCard icon={CircleAlert} label="Em falta" value={emFalta.length} caption="itens a repor" tone="warning" />
        <StatCard icon={Package} label="Em estoque" value={totalUnidades} caption={`${categorias} categorias`} highlighted />
        <StatCard icon={ArrowDownToLine} label="Entradas" value={entradas7d} caption="últimos 7 dias" />
      </View>

      <Pressable
        onPress={() => setSheetVisible(true)}
        style={({ pressed }) => [styles.addButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
      >
        <Plus size={19} color={colors.primaryText} strokeWidth={2.5} />
        <Text style={[styles.addButtonText, { color: colors.primaryText, fontFamily: fonts.heading }]}>Adicionar item</Text>
      </Pressable>

      {previsao && (
        <View style={[styles.previsaoCard, { backgroundColor: colors.secondary }]}>
          <View style={styles.previsaoKicker}>
            <Sparkles size={13} color="rgba(255,255,255,0.85)" strokeWidth={2.5} />
            <Text style={styles.previsaoKickerText}>Previsão de consumo</Text>
          </View>
          <Text style={[styles.previsaoTitulo, { fontFamily: fonts.heading }]}>
            {previsao.item.nome} acaba em {previsao.analise.dias_restantes} dias
          </Text>
          <Text style={styles.previsaoTexto}>
            Vocês consomem {previsao.analise.consumo_diario.toFixed(1)} un./dia. Sobrou {previsao.item.qtd} de {previsao.item.qtd_minima} no mínimo.
          </Text>
          <View style={styles.previsaoActions}>
            <Pressable
              onPress={() => navigation.navigate("ItemDetail", { itemId: previsao.item.id })}
              style={[styles.previsaoBtnGhost]}
            >
              <Text style={styles.previsaoBtnGhostText}>Ver item</Text>
            </Pressable>
            <Pressable
              onPress={jaComprei}
              disabled={repondoId === previsao.item.id}
              style={[styles.previsaoBtnFill, { backgroundColor: colors.background, opacity: repondoId === previsao.item.id ? 0.6 : 1 }]}
            >
              {repondoId === previsao.item.id ? (
                <ActivityIndicator color={colors.secondary} size="small" />
              ) : (
                <Text style={[styles.previsaoBtnFillText, { color: colors.secondary, fontFamily: fonts.heading }]}>Já comprei</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: fonts.heading }]}>Precisa de atenção</Text>
        {precisamAtencao.length > 0 && (
          <Pressable onPress={() => tabNavigation.navigate("DespensaTab", { screen: "Despensa" })}>
            <Text style={[styles.verTudo, { color: colors.primaryStrong }]}>Ver tudo</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.list}>
        {precisamAtencao.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhum item precisa de atenção agora.</Text>
        ) : (
          precisamAtencao.map((item) => (
            <AttentionRow key={item.id} item={item} onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })} />
          ))
        )}
      </View>

      <NewItemSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSubmit={async (payload) => {
          await criarItem(payload);
          await carregar();
        }}
      />
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 20, paddingBottom: 40, gap: 18 },
  greeting: { fontSize: 27 },
  subtitle: { fontSize: 14, marginTop: 5 },
  statsRow: { flexDirection: "row", gap: 12 },
  addButton: {
    height: 52,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2e2b25",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 3,
  },
  addButtonText: { fontSize: 17 },
  previsaoCard: { borderRadius: 28, padding: 18, gap: 4 },
  previsaoKicker: { flexDirection: "row", alignItems: "center", gap: 8 },
  previsaoKickerText: { fontSize: 11.5, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: "rgba(255,255,255,0.75)" },
  previsaoTitulo: { fontSize: 22, color: "#fff", marginTop: 8, lineHeight: 27 },
  previsaoTexto: { fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 6 },
  previsaoActions: { flexDirection: "row", gap: 10, marginTop: 14 },
  previsaoBtnGhost: {
    flex: 1,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  previsaoBtnGhostText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  previsaoBtnFill: { flex: 1, height: 44, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  previsaoBtnFillText: { fontSize: 15 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { fontSize: 19 },
  verTudo: { fontSize: 13, fontWeight: "600" },
  list: { gap: 10 },
  empty: { fontSize: 14, textAlign: "center", paddingVertical: 16 },
});
