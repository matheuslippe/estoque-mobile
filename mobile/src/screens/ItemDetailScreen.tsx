import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import { Minus, Plus, Pencil, Trash2 } from "lucide-react-native";
import { ItemDetailParamList } from "../navigation/types";
import { ajustarItem, analiseItem, excluirItem, movimentarItem, obterItem } from "../api/itens";
import { AnaliseItem, Item } from "../types";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { StatusBadge } from "../components/StatusBadge";
import { NivelBar } from "../components/NivelBar";
import { Button } from "../components/ui/Button";

type Props = NativeStackScreenProps<ItemDetailParamList, "ItemDetail">;

export function ItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const colors = useThemeColors();
  const [item, setItem] = useState<Item | null>(null);
  const [analise, setAnalise] = useState<AnaliseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [ajusteVisivel, setAjusteVisivel] = useState(false);

  const carregar = useCallback(async () => {
    const [itemData, analiseData] = await Promise.all([obterItem(itemId), analiseItem(itemId)]);
    setItem(itemData);
    setAnalise(analiseData);
  }, [itemId]);

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

  async function movimentar(tipo: "ENTRADA" | "SAIDA") {
    if (!item) return;
    setBusy(true);
    try {
      const atualizado = await movimentarItem(item.id, tipo, 1);
      setItem(atualizado);
    } catch (e: any) {
      Alert.alert("Não foi possível", e?.response?.data?.detail ?? "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  function confirmarExclusao() {
    if (!item) return;
    Alert.alert("Excluir item", `Excluir "${item.nome}"? O histórico é mantido.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          await excluirItem(item.id);
          navigation.goBack();
        },
      },
    ]);
  }

  if (loading || !item) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const chartData = analise && analise.por_dia.length > 0
    ? {
        labels: analise.por_dia.map((p) => p.data.slice(5)),
        datasets: [{ data: analise.por_dia.map((p) => p.retiradas) }],
      }
    : null;

  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.nome, { color: colors.text, fontFamily: fonts.heading }]}>{item.nome}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={[styles.categoria, { color: colors.textMuted }]}>{item.categoria}</Text>

      <NivelBar percentual={item.percentual} status={item.status} />
      <Text style={[styles.qtdLinha, { color: colors.text }]}>
        {item.qtd} unidades <Text style={{ color: colors.textMuted }}>(mínimo {item.qtd_minima})</Text>
      </Text>

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => movimentar("SAIDA")}
          disabled={busy}
        >
          <Minus size={18} color={colors.text} strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: colors.text, fontFamily: fonts.semiBold }]}>Retirar</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => movimentar("ENTRADA")}
          disabled={busy}
        >
          <Plus size={18} color={colors.primaryText} strokeWidth={2.5} />
          <Text style={[styles.actionText, { color: colors.primaryText, fontFamily: fonts.semiBold }]}>Repor</Text>
        </Pressable>
      </View>

      <View style={styles.secondaryRow}>
        <Pressable style={styles.secondaryBtn} onPress={() => setAjusteVisivel(true)}>
          <Pencil size={14} color={colors.primaryStrong} strokeWidth={2.5} />
          <Text style={[styles.link, { color: colors.primaryStrong }]}>Ajustar item</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={confirmarExclusao}>
          <Trash2 size={14} color={colors.danger} strokeWidth={2.5} />
          <Text style={[styles.link, { color: colors.danger }]}>Excluir</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.heading }]}>Análise de consumo (30 dias)</Text>
        {!analise || analise.dias_obs === 0 ? (
          <Text style={{ color: colors.textMuted }}>Sem retiradas registradas no período.</Text>
        ) : (
          <>
            <View style={styles.statsRow}>
              <Stat label="Consumo/dia" value={analise.consumo_diario.toFixed(2)} colors={colors} />
              <Stat
                label="Dias restantes"
                value={analise.dias_restantes != null ? String(analise.dias_restantes) : "—"}
                colors={colors}
              />
              <Stat label="Total retirado" value={String(analise.consumo_total)} colors={colors} />
            </View>
            {chartData && (
              <BarChart
                data={chartData}
                width={Dimensions.get("window").width - 64}
                height={180}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
                withInnerLines={false}
                chartConfig={{
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 0,
                  color: () => colors.primary,
                  labelColor: () => colors.textMuted,
                  barPercentage: 0.6,
                }}
                style={{ marginTop: 12, borderRadius: 8 }}
              />
            )}
          </>
        )}
      </View>

      <AjustarModal
        visivel={ajusteVisivel}
        item={item}
        onClose={() => setAjusteVisivel(false)}
        onSalvo={(atualizado) => setItem(atualizado)}
      />
    </ScrollView>
  );
}

function Stat({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={statStyles.container}>
      <Text style={[statStyles.value, { color: colors.text, fontFamily: fonts.heading }]}>{value}</Text>
      <Text style={[statStyles.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function AjustarModal({
  visivel,
  item,
  onClose,
  onSalvo,
}: {
  visivel: boolean;
  item: Item;
  onClose: () => void;
  onSalvo: (item: Item) => void;
}) {
  const colors = useThemeColors();
  const [nome, setNome] = useState(item.nome);
  const [qtd, setQtd] = useState(String(item.qtd));
  const [qtdMinima, setQtdMinima] = useState(String(item.qtd_minima));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  React.useEffect(() => {
    if (visivel) {
      setNome(item.nome);
      setQtd(String(item.qtd));
      setQtdMinima(String(item.qtd_minima));
      setErro(null);
    }
  }, [visivel, item]);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const atualizado = await ajustarItem(item.id, {
        nome: nome.trim(),
        qtd: Number(qtd) || 0,
        qtd_minima: Number(qtdMinima) || 0,
      });
      onSalvo(atualizado);
      onClose();
    } catch (e: any) {
      setErro(e?.response?.data?.nome?.[0] ?? "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text, fontFamily: fonts.heading }]}>Ajustar item</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            value={nome}
            onChangeText={setNome}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flex, { backgroundColor: colors.background, color: colors.text }]}
              keyboardType="numeric"
              value={qtd}
              onChangeText={setQtd}
            />
            <TextInput
              style={[styles.input, styles.flex, { backgroundColor: colors.background, color: colors.text }]}
              keyboardType="numeric"
              value={qtdMinima}
              onChangeText={setQtdMinima}
            />
          </View>
          {erro && <Text style={{ color: colors.danger }}>{erro}</Text>}
          <View style={styles.row}>
            <Pressable style={[styles.modalButton, styles.flex, { backgroundColor: colors.background }]} onPress={onClose}>
              <Text style={{ color: colors.text, fontFamily: fonts.semiBold }}>Cancelar</Text>
            </Pressable>
            <View style={styles.flex}>
              <Button label="Salvar" onPress={salvar} loading={salvando} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 20, gap: 10, paddingBottom: 40 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  nome: { fontSize: 24, flexShrink: 1 },
  categoria: { fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  qtdLinha: { fontSize: 15, marginTop: 6 },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  actionButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 999, paddingVertical: 14 },
  actionText: { fontSize: 15 },
  secondaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  secondaryBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: { fontWeight: "600", fontSize: 14 },
  card: { borderRadius: 22, padding: 18, marginTop: 20, gap: 6 },
  cardTitle: { fontSize: 18, marginBottom: 4 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 12 },
  input: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  modalButton: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});

const statStyles = StyleSheet.create({
  container: { alignItems: "center", flex: 1 },
  value: { fontSize: 19 },
  label: { fontSize: 11, marginTop: 4, textAlign: "center" },
});
