import React, { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Send } from "lucide-react-native";
import { requestTelegramLink, telegramLinkStatus } from "../api/telegram";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { Button } from "./ui/Button";

export function TelegramLinkSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useThemeColors();
  const [carregando, setCarregando] = useState(true);
  const [vinculado, setVinculado] = useState(false);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [minutos, setMinutos] = useState(15);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setCodigo(null);
    setErro(null);
    setCarregando(true);
    telegramLinkStatus()
      .then(setVinculado)
      .catch(() => setErro("Não foi possível checar o status."))
      .finally(() => setCarregando(false));
  }, [visible]);

  async function gerarCodigo() {
    setGerando(true);
    setErro(null);
    try {
      const resultado = await requestTelegramLink();
      setCodigo(resultado.code);
      setMinutos(resultado.expires_in_minutes);
    } catch {
      setErro("Não foi possível gerar o código.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primary }]}>
            <Send size={22} color={colors.primaryText} strokeWidth={2.3} />
          </View>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.heading }]}>Telegram</Text>

          {carregando ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
          ) : vinculado && !codigo ? (
            <>
              <Text style={[styles.body, { color: colors.textMuted }]}>
                Seu Telegram já está vinculado. Códigos de redefinição de senha chegam no seu privado.
              </Text>
              <Pressable onPress={gerarCodigo}>
                <Text style={[styles.link, { color: colors.primaryStrong }]}>Vincular outro Telegram</Text>
              </Pressable>
            </>
          ) : codigo ? (
            <>
              <Text style={[styles.body, { color: colors.textMuted }]}>
                Envie esse código pro bot do dispensa.me no privado do Telegram (não no grupo da família):
              </Text>
              <Text style={[styles.codigo, { color: colors.primary, fontFamily: fonts.heading }]}>{codigo}</Text>
              <Text style={[styles.hint, { color: colors.textFaint }]}>Vale por {minutos} minutos.</Text>
            </>
          ) : (
            <Text style={[styles.body, { color: colors.textMuted }]}>
              Vincule seu Telegram pra poder recuperar a senha se esquecer — o código de reset chega no seu
              privado, não no grupo da família.
            </Text>
          )}

          {erro && <Text style={{ color: colors.danger, fontSize: 13 }}>{erro}</Text>}

          {!carregando && !codigo && (
            <Button
              label={vinculado ? "Fechar" : "Gerar código"}
              onPress={vinculado ? onClose : gerarCodigo}
              loading={gerando}
            />
          )}
          {codigo && <Button label="Fechar" onPress={onClose} variant="secondary" />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 12, alignItems: "center" },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20 },
  body: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  link: { fontSize: 13.5, fontWeight: "700" },
  codigo: { fontSize: 40, letterSpacing: 4, marginTop: 4 },
  hint: { fontSize: 12 },
});
