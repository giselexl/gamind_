import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useColorScheme } from "@/hooks/use-color-scheme";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments(); // Identifica em qual pasta/tela o usuário está

  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Monitora o estado do usuário no Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCarregando(false);
    });

    return unsubscribe;
  }, []);

  // Controla o redirecionamento baseado no estado do login
  useEffect(() => {
    if (carregando) return;

    // Verifica se o usuário está atualmente nas telas de autenticação
    const noGrupoDeAuth = segments[0] === "(auth)";

    if (!usuario && !noGrupoDeAuth) {
      // Se não está logado e tenta ir para o app, joga para o login
      router.replace("/(auth)/login");
    } else if (usuario && noGrupoDeAuth) {
      // Se está logado e está na tela de login, joga para a Home
      router.replace("/(tabs)");
    }
  }, [usuario, carregando, segments, router]);

  if (carregando) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050505" }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
