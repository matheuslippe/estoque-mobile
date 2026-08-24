// O app so tem a paleta clara desenhada de verdade por enquanto (o mockup
// "Organic" nao trouxe uma versao escura — ver docs/ROADMAP.md). Por
// pedido do usuario, o tema fica fixo em claro mesmo em celulares com o
// sistema no modo escuro, ate desenharmos o modo escuro de verdade.
//
// Pra reativar deteccao automatica do sistema, troque o `return "light"`
// abaixo por `return useColorScheme()` (importado de "react-native").

export function useAppColorScheme(): "light" | "dark" {
  return "light";
}
