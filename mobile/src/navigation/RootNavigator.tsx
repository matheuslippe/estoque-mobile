import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { House, Package, ShoppingCart, RotateCcwClock } from "lucide-react-native";
import { useAuth } from "../context/AuthContext";
import { useThemeColors } from "../theme/colors";
import { useAppColorScheme } from "../theme/scheme";
import { fonts } from "../theme/fonts";
import { LoginScreen } from "../screens/LoginScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { DespensaScreen } from "../screens/DespensaScreen";
import { ItemDetailScreen } from "../screens/ItemDetailScreen";
import { ShoppingListScreen } from "../screens/ShoppingListScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { InicioStackParamList, DespensaStackParamList, MainTabParamList } from "./types";

const InicioStack = createNativeStackNavigator<InicioStackParamList>();
const DespensaStack = createNativeStackNavigator<DespensaStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function InicioStackNavigator() {
  const colors = useThemeColors();
  return (
    <InicioStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.semiBold },
      }}
    >
      <InicioStack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
      <InicioStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: "Item" }} />
    </InicioStack.Navigator>
  );
}

function DespensaStackNavigator() {
  const colors = useThemeColors();
  return (
    <DespensaStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.semiBold },
      }}
    >
      <DespensaStack.Screen name="Despensa" component={DespensaScreen} options={{ headerShown: false }} />
      <DespensaStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: "Item" }} />
    </DespensaStack.Navigator>
  );
}

function MainTabs() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.semiBold, fontSize: 10.5 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 58 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom + 6,
        },
      }}
    >
      <Tabs.Screen
        name="InicioTab"
        component={InicioStackNavigator}
        options={{ title: "Início", tabBarIcon: ({ color, size }) => <House size={size} color={color} strokeWidth={2.4} /> }}
      />
      <Tabs.Screen
        name="DespensaTab"
        component={DespensaStackNavigator}
        options={{ title: "Despensa", tabBarIcon: ({ color, size }) => <Package size={size} color={color} strokeWidth={2.4} /> }}
      />
      <Tabs.Screen
        name="Compras"
        component={ShoppingListScreen}
        options={{ title: "Compras", tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} strokeWidth={2.4} /> }}
      />
      <Tabs.Screen
        name="Historico"
        component={HistoryScreen}
        options={{ title: "Histórico", tabBarIcon: ({ color, size }) => <RotateCcwClock size={size} color={color} strokeWidth={2.4} /> }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { loading, signedIn } = useAuth();
  const colors = useThemeColors();
  const scheme = useAppColorScheme();
  const navTheme = scheme === "dark" ? DarkTheme : DefaultTheme;

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={{ ...navTheme, colors: { ...navTheme.colors, background: colors.background } }}>
      {signedIn ? <MainTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}
