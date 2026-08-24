import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";

export function LoginScreen() {
  const colors = useThemeColors();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!username.trim() || !password) return;
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch {
      setError("Usuário ou senha inválidos.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <View style={styles.container}>
        <View style={[styles.mark, { backgroundColor: colors.primary }]} />
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.heading }]}>dispensa.me</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Entre com sua conta para continuar</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="Usuário"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="Senha"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={handleSubmit}
          />

          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryText, fontFamily: fonts.heading }]}>Entrar</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 4 },
  mark: { width: 44, height: 44, borderRadius: 14, marginBottom: 18 },
  title: { fontSize: 34 },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 28 },
  form: { gap: 12 },
  input: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 14, fontSize: 15 },
  button: { borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonText: { fontSize: 16 },
  error: { fontSize: 13 },
});
