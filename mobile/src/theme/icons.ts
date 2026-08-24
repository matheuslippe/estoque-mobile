import {
  Package,
  Coffee,
  Droplet,
  Wheat,
  Milk,
  Refrigerator,
  Croissant,
  SprayCan,
  GlassWater,
  ScrollText,
  Snowflake,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";

// Icone por categoria/nome de item — usado nos avatares da lista de
// "precisa de atencao". Sem endpoint de categoria tipada no backend, entao
// isso e so uma pista visual por palavra-chave; o fallback (Package) cobre
// qualquer categoria que o usuario tenha criado livremente.
const RULES: [RegExp, LucideIcon][] = [
  [/caf[eé]/i, Coffee],
  [/(azeite|[oó]leo|leite|droplet)/i, Droplet],
  [/leite|iogurte|queijo/i, Milk],
  [/(arroz|feij[aã]o|gr[aã]o|farinha|macarr[aã]o|massa)/i, Wheat],
  [/(p[aã]o|padaria|bolo|biscoito)/i, Croissant],
  [/(sab[aã]o|detergente|limpeza|desinfetante)/i, SprayCan],
  [/(suco|refrigerante|bebida|[aá]gua|cerveja)/i, GlassWater],
  [/(papel|toalha|guardanapo)/i, ScrollText],
  [/(geladeira|congelador|freezer)/i, Refrigerator],
  [/(sorvete|congelado)/i, Snowflake],
];

export function iconForItem(nome: string, categoria: string): LucideIcon {
  const alvo = `${nome} ${categoria}`;
  for (const [pattern, Icon] of RULES) {
    if (pattern.test(alvo)) return Icon;
  }
  return Package;
}
