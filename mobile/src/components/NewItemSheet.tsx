import React, { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useThemeColors } from "../theme/colors";

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
      setError(e?.response?.data?.nome?.[0] ?? "Nao foi possivel cadastrar o item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>Novo item</Text>

          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Nome"
            placeholderTextColor={colors.textMuted}
            value={nome}
            onChangeText={setNome}
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholder="Categoria (opcional)"
            placeholderTextColor={colors.textMuted}
            value={categoria}
            onChangeText={setCategoria}
          />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Quantidade</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
                value={qtd}
                onChangeText={setQtd}
              />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Minima</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                keyboardType="numeric"
                value={qtdMinima}
                onChangeText={setQtdMinima}
              />
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.cancel, { borderColor: colors.border }]}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={{ color: colors.text }}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Cadastrar</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  row: { flexDirection: "row", gap: 10 },
  flex: { flex: 1, gap: 4 },
  label: { fontSize: 12 },
  error: { color: "#DC2626", fontSize: 13 },
  actions: { flexDirection: "row", gap: 10, marginTop: 8 },
  button: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancel: { borderWidth: 1 },
  buttonText: { color: "#fff", fontWeight: "700" },
});
