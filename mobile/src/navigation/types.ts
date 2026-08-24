import { NavigatorScreenParams } from "@react-navigation/native";

// ItemDetail e montada em duas stacks diferentes (Inicio e Despensa) com os
// mesmos parametros — esse tipo compartilhado deixa a tela tipada sem
// depender de qual stack a hospeda.
export type ItemDetailParamList = {
  ItemDetail: { itemId: number };
};

export type InicioStackParamList = ItemDetailParamList & {
  Dashboard: undefined;
};

export type DespensaStackParamList = ItemDetailParamList & {
  Despensa: undefined;
};

export type MainTabParamList = {
  InicioTab: NavigatorScreenParams<InicioStackParamList>;
  DespensaTab: NavigatorScreenParams<DespensaStackParamList>;
  Compras: undefined;
  Historico: undefined;
};
