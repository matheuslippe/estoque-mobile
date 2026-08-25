import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
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

type Mode = "login" | "register";

function extrairErroRegistro(e: any): string {
  const data = e?.response?.data;
  if (data?.username?.[0]) return data.username[0];
  if (data?.password?.[0]) return data.password[0];
  return "Não foi possível criar a conta. Tente novamente.";
}

export function LoginScreen() {
  const colors = useThemeColors();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function trocarModo() {
    setMode((m) => (m === "login" ? "register" : "login"));
    setError(null);
    setConfirmPassword("");
  }

  async function handleSubmit() {
    if (!username.trim() || !password) return;
    if (mode === "register" && password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
    } catch (e: any) {
      setError(mode === "login" ? "Usuário ou senha inválidos." : extrairErroRegistro(e));
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
        <Image source={require("../../assets/android-icon-foreground.png")} style={styles.mark} resizeMode="contain" />
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.heading }]}>dispensa.me</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {mode === "login" ? "Entre com sua conta para continuar" : "Crie sua conta pra começar"}
        </Text>

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
            onSubmitEditing={mode === "login" ? handleSubmit : undefined}
          />
          {mode === "register" && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Confirmar senha"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onSubmitEditing={handleSubmit}
            />
          )}

          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={[styles.buttonText, { color: colors.primaryText, fontFamily: fonts.heading }]}>
                {mode === "login" ? "Entrar" : "Criar conta"}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={trocarModo} style={styles.switchLink} hitSlop={8}>
            <Text style={[styles.switchText, { color: colors.textMuted }]}>
              {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
              <Text style={{ color: colors.primaryStrong, fontWeight: "700" }}>
                {mode === "login" ? "Criar uma" : "Entrar"}
              </Text>
            </Text>
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
  mark: { width: 56, height: 56, marginBottom: 14, marginLeft: -6 },
  title: { fontSize: 34 },
  subtitle: { fontSize: 15, marginTop: 6, marginBottom: 28 },
  form: { gap: 12 },
  input: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 14, fontSize: 15 },
  button: { borderRadius: 999, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  buttonText: { fontSize: 16 },
  error: { fontSize: 13 },
  switchLink: { alignItems: "center", marginTop: 14 },
  switchText: { fontSize: 13.5 },
});
