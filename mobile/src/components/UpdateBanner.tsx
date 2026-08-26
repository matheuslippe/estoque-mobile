import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { RefreshCw } from "lucide-react-native";
import { useThemeColors } from "../theme/colors";
import { fonts } from "../theme/fonts";
import { radius, spacing } from "../theme/tokens";

// O expo-updates baixa o bundle novo sozinho no launch (checkAutomatically =
// ON_LOAD, o padrao), mas so aplica no cold start seguinte. Sem este aviso o
// usuario abriria o app depois de um `eas update` e continuaria vendo a versao
// antiga sem entender por que — que foi exatamente a confusao que motivou
// ligar o OTA. Quando ha um bundle baixado e pendente, mostramos uma barra
// tocavel que aplica na hora via reloadAsync().
export function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [aplicando, setAplicando] = useState(false);

  const aplicar = useCallback(async () => {
    setAplicando(true);
    try {
      await Updates.reloadAsync();
    } catch {
      // Se o reload falhar (raro), a atualizacao entra no proximo cold start
      // de qualquer jeito — nao vale prender a UI num estado de erro.
      setAplicando(false);
    }
  }, []);

  // Updates.isEnabled e false no Expo Go e em dev build — sem isso a barra
  // apareceria em desenvolvimento sem ter o que aplicar.
  if (!Updates.isEnabled || !isUpdatePending) {
    return null;
  }

  return (
    <View style={[styles.wrapper, { top: insets.top + spacing[2] }]} pointerEvents="box-none">
      <Pressable
        onPress={aplicar}
        disabled={aplicando}
        accessibilityRole="button"
        accessibilityLabel="Atualizar o app agora"
        style={({ pressed }) => [
          styles.banner,
          { backgroundColor: colors.primary, opacity: pressed || aplicando ? 0.85 : 1 },
        ]}
      >
        {aplicando ? (
          <ActivityIndicator size="small" color={colors.primaryText} />
        ) : (
          <RefreshCw size={16} color={colors.primaryText} strokeWidth={2.5} />
        )}
        <Text style={[styles.texto, { color: colors.primaryText }]}>
          {aplicando ? "Atualizando..." : "Nova versao pronta — toque pra atualizar"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    zIndex: 10,
    elevation: 10,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.pill,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  texto: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
});
