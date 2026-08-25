import React, { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, Search } from "lucide-react-native";
import { DespensaStackParamList } from "../navigation/types";
import { criarItem, listarItens } from "../api/itens";
import { Item } from "../types";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { ItemCard } from "../components/ItemCard";
import { NewItemSheet } from "../components/NewItemSheet";

type Props = NativeStackScreenProps<DespensaStackParamList, "Despensa">;

export function DespensaScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const carregar = useCallback(async () => {
    setItens(await listarItens());
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

  const categorias = useMemo(
    () => Array.from(new Set(itens.map((i) => i.categoria).filter(Boolean))).sort(),
    [itens]
  );

  const filtrados = useMemo(() => {
    let lista = itens;
    if (categoria) lista = lista.filter((i) => i.categoria === categoria);
    if (busca.trim()) {
      const alvo = busca.trim().toLowerCase();
      lista = lista.filter((i) => i.nome.toLowerCase().includes(alvo));
    }
    return [...lista].sort((a, b) => a.percentual - b.percentual);
  }, [itens, categoria, busca]);

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <ItemCard item={item} onPress={() => navigation.navigate("ItemDetail", { itemId: item.id })} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 9 }} />}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.text, fontFamily: fonts.heading }]}>Despensa</Text>
                <Pressable
                  onPress={() => setSheetVisible(true)}
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                >
                  <Plus size={18} color={colors.primaryText} strokeWidth={2.5} />
                </Pressable>
              </View>

              <View style={[styles.search, { backgroundColor: colors.surface }]}>
                <Search size={17} color={colors.textFaint} strokeWidth={2.5} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Buscar item..."
                  placeholderTextColor={colors.textFaint}
                  value={busca}
                  onChangeText={setBusca}
                />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
                <Chip label="Todos" active={categoria === null} onPress={() => setCategoria(null)} colors={colors} />
                {categorias.map((c) => (
                  <Chip key={c} label={c} active={categoria === c} onPress={() => setCategoria(c)} colors={colors} />
                ))}
              </ScrollView>

              <View style={styles.sectionRow}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                  {filtrados.length} {filtrados.length === 1 ? "item" : "itens"} · por nível
                </Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textMuted }]}>Nenhum item cadastrado ainda.</Text>
          }
        />
      )}

      <NewItemSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSubmit={async (payload) => {
          await criarItem(payload);
          // O item ja foi criado com sucesso aqui — se so a atualizacao da
          // lista falhar (rede, etc), isso nao deve aparecer como erro de
          // cadastro no sheet.
          carregar().catch(() => {});
        }}
      />
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
      <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: 13, fontFamily: fonts.semiBold }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 26, flex: 1 },
  addButton: { width: 36, height: 36, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  search: { flexDirection: "row", alignItems: "center", gap: 9, height: 44, borderRadius: 999, paddingHorizontal: 16 },
  searchInput: { flex: 1, fontSize: 14.5, padding: 0 },
  chipsRow: { flexGrow: 0 },
  chip: { paddingHorizontal: 15, paddingVertical: 7, borderRadius: 999, marginRight: 8 },
  sectionRow: { flexDirection: "row" },
  sectionLabel: { fontSize: 11.5, fontFamily: fonts.bold, letterSpacing: 0.6, textTransform: "uppercase" },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
