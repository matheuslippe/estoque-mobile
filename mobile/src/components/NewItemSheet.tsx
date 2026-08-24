import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { Button } from "./ui/Button";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { nome: string; categoria: string; qtd: number; qtd_minima: number }) => Promise<void>;
}

export function NewItemSheet({ visible, onClose, onSubmit }: Props) {
  const colors = useThemeColors();
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [qtd, setQtd] = useState("0");
  const [qtdMinima, setQtdMinima] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setNome("");
    setCategoria("");
    setQtd("0");
    setQtdMinima("1");
    setError(null);
  }

  async function handleSubmit() {
    if (!nome.trim()) {
      setError("Informe o nome do item.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        nome: nome.trim(),
        categoria: categoria.trim(),
        qtd: Number(qtd) || 0,
        qtd_minima: Number(qtdMinima) || 1,
      });
      reset();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.nome?.[0] ?? "Não foi possível cadastrar o item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.heading }]}>Novo item</Text>

          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Nome"
            placeholderTextColor={colors.textFaint}
            value={nome}
            onChangeText={setNome}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Categoria (opcional)"
            placeholderTextColor={colors.textFaint}
            value={categoria}
            onChangeText={setCategoria}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Quantidade</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                keyboardType="numeric"
                value={qtd}
                onChangeText={setQtd}
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Mínima</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                keyboardType="numeric"
                value={qtdMinima}
                onChangeText={setQtdMinima}
              />
            </View>
          </View>

          {error && <Text style={{ color: colors.danger, fontSize: 13 }}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable
              style={[styles.cancelButton, { backgroundColor: colors.background }]}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={{ color: colors.text, fontFamily: fonts.semiBold }}>Cancelar</Text>
            </Pressable>
            <View style={styles.flex}>
              <Button label="Cadastrar" onPress={handleSubmit} loading={submitting} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, gap: 12 },
  title: { fontSize: 20, marginBottom: 4 },
  input: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1, gap: 5 },
  label: { fontSize: 12 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelButton: { flex: 1, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
});
