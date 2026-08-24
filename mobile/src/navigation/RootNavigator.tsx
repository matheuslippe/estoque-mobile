import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useColorScheme } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useThemeColors } from "../theme/colors";
import { LoginScreen } from "../screens/LoginScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ItemDetailScreen } from "../screens/ItemDetailScreen";
import { ShoppingListScreen } from "../screens/ShoppingListScreen";
import { HistoryScreen } from "../screens/HistoryScreen";
import { EstoqueStackParamList, MainTabParamList } from "./types";

const EstoqueStack = createNativeStackNavigator<EstoqueStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

function EstoqueStackNavigator() {
  const colors = useThemeColors();
  return (
    <EstoqueStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <EstoqueStack.Screen name="Home" component={HomeScreen} options={{ title: "Estoque" }} />
      <EstoqueStack.Screen name="ItemDetail" component={ItemDetailScreen} options={{ title: "Item" }} />
    </EstoqueStack.Navigator>
  );
}

function MainTabs() {
  const colors = useThemeColors();
  const { logout } = useAuth();
  return (
    <Tabs.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="EstoqueTab" component={EstoqueStackNavigator} options={{ title: "Estoque", headerShown: false }} />
      <Tabs.Screen
        name="Compras"
        component={ShoppingListScreen}
        options={{
          title: "Compras",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      <Tabs.Screen
        name="Historico"
        component={HistoryScreen}
        options={{
          title: "Historico",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerRight: () => (
            <Pressable onPress={logout} hitSlop={10}>
              <Text style={{ color: colors.primary, fontWeight: "600" }}>Sair</Text>
            </Pressable>
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const { loading, signedIn } = useAuth();
  const colors = useThemeColors();
  const scheme = useColorScheme();
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
