import { NavigatorScreenParams } from "@react-navigation/native";

export type EstoqueStackParamList = {
  Home: undefined;
  ItemDetail: { itemId: number };
};

export type MainTabParamList = {
  EstoqueTab: NavigatorScreenParams<EstoqueStackParamList>;
  Compras: undefined;
  Historico: undefined;
};
