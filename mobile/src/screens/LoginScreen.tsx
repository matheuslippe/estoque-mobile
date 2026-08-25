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
import { requestPasswordReset } from "../api/auth";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";

type Mode = "login" | "register" | "forgot-request" | "forgot-confirm";

function extrairErroRegistro(e: any): string {
  const data = e?.response?.data;
  if (data?.username?.[0]) return data.username[0];
  if (data?.password?.[0]) return data.password[0];
  return "Não foi possível criar a conta. Tente novamente.";
}

function extrairErroReset(e: any): string {
  const data = e?.response?.data;
  if (data?.code?.[0]) return data.code[0];
  if (data?.new_password?.[0]) return data.new_password[0];
  return "Não foi possível redefinir a senha. Tente novamente.";
}

export function LoginScreen() {
  const colors = useThemeColors();
  const { login, register, confirmPasswordReset } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function irPara(novoModo: Mode) {
    setMode(novoModo);
    setError(null);
    setInfo(null);
    setPassword("");
    setConfirmPassword("");
    setCode("");
    setNewPassword("");
    setConfirmNewPassword("");
  }

  async function handleSubmit() {
    if (mode === "forgot-request") {
      if (!username.trim()) return;
      setSubmitting(true);
      setError(null);
      try {
        await requestPasswordReset(username.trim());
        setInfo("Se o usuário existir, o código chegou no Telegram da família.");
        setMode("forgot-confirm");
      } catch {
        setError("Não foi possível enviar o código. Tente novamente.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === "forgot-confirm") {
      if (!code.trim() || !newPassword) return;
      if (newPassword !== confirmNewPassword) {
        setError("As senhas não coincidem.");
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await confirmPasswordReset(username.trim(), code.trim(), newPassword);
      } catch (e: any) {
        setError(extrairErroReset(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

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

  const titulos: Record<Mode, string> = {
    login: "Entre com sua conta para continuar",
    register: "Crie sua conta pra começar",
    "forgot-request": "Informe seu usuário pra receber um código",
    "forgot-confirm": "Digite o código e a nova senha",
  };

  const botaoLabel: Record<Mode, string> = {
    login: "Entrar",
    register: "Criar conta",
    "forgot-request": "Enviar código",
    "forgot-confirm": "Redefinir senha",
  };

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <View style={styles.container}>
        <Image source={require("../../assets/android-icon-foreground.png")} style={styles.mark} resizeMode="contain" />
        <Text style={[styles.title, { color: colors.text, fontFamily: fonts.heading }]}>dispensa.me</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{titulos[mode]}</Text>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            placeholder="Usuário"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            editable={mode !== "forgot-confirm"}
            value={username}
            onChangeText={setUsername}
          />

          {(mode === "login" || mode === "register") && (
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
              placeholder="Senha"
              placeholderTextColor={colors.textFaint}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={mode === "login" ? handleSubmit : undefined}
            />
          )}
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

          {mode === "forgot-confirm" && (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="Código recebido no Telegram"
                placeholderTextColor={colors.textFaint}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="Nova senha"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
                placeholder="Confirmar nova senha"
                placeholderTextColor={colors.textFaint}
                secureTextEntry
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                onSubmitEditing={handleSubmit}
              />
            </>
          )}

          {info && !error && <Text style={[styles.info, { color: colors.secondary }]}>{info}</Text>}
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
                {botaoLabel[mode]}
              </Text>
            )}
          </Pressable>

          {mode === "login" && (
            <Pressable onPress={() => irPara("forgot-request")} style={styles.switchLink} hitSlop={8}>
              <Text style={[styles.switchText, { color: colors.primaryStrong, fontWeight: "700" }]}>
                Esqueceu a senha?
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => irPara(mode === "login" ? "register" : "login")}
            style={styles.switchLink}
            hitSlop={8}
          >
            <Text style={[styles.switchText, { color: colors.textMuted }]}>
              {mode === "login" && "Não tem conta? "}
              {mode === "register" && "Já tem conta? "}
              {(mode === "forgot-request" || mode === "forgot-confirm") && "Lembrou a senha? "}
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
  info: { fontSize: 13 },
  switchLink: { alignItems: "center", marginTop: 14 },
  switchText: { fontSize: 13.5 },
});
