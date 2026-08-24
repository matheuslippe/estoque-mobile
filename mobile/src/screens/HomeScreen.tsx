import React, { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { EstoqueStackParamList } from "../navigation/types";
import { criarItem, listarItens } from "../api/itens";
import { Item } from "../types";
import { useThemeColors } from "../theme/colors";
import { ItemCard } from "../components/ItemCard";
import { NewItemSheet } from "../components/NewItemSheet";

type Props = NativeStackScreenProps<EstoqueStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const colors = useThemeColors();
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busca, setBusca] = useState("");
  const [sheetVisible, setSheetVisible] = useState(false);

  const carregar = useCallback(async () => {
    const data = await listarItens();
    setItens(data);
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

  const filtrados = busca.trim()
    ? itens.filter((i) => i.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : itens;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <TextInput
          style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Buscar item..."
          placeholderTextColor={colors.textMuted}
          value={busca}
          onChangeText={setBusca}
        />
        <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} onPress={() => setSheetVisible(true)}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

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
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
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
          await carregar();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  headerRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  search: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 15 },
  addButton: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  addButtonText: { color: "#fff", fontSize: 22, fontWeight: "700", marginTop: -2 },
  list: { paddingBottom: 24 },
  empty: { textAlign: "center", marginTop: 40, fontSize: 14 },
});
