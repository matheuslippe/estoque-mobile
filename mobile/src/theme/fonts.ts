import {
  useFonts as useFigtreeFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from "@expo-google-fonts/figtree";
import { Caprasimo_400Regular } from "@expo-google-fonts/caprasimo";

// Caprasimo (titulos, numeros grandes) + Figtree (corpo) — mesma dupla do
// mockup "Organic". Sao os unicos nomes de familia usados no app; nao
// misturar com a fonte padrao do sistema pra manter a identidade visual.
export const fonts = {
  heading: "Caprasimo_400Regular",
  regular: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semiBold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
  extraBold: "Figtree_800ExtraBold",
};

export function useAppFonts() {
  return useFigtreeFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    Caprasimo_400Regular,
  });
}
