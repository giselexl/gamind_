import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
// ALTERADO: Importamos o provedor e o pop-up direto do pacote 'firebase/auth'
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../firebaseConfig";

export default function LoginScreen() {
  const [carregando, setCarregando] = useState(false);

  async function handleGoogleLogin() {
    setCarregando(true);
    try {
      // 1. Instancia o provedor do Google do Firebase
      const provider = new GoogleAuthProvider();
      
      // Configura opcionalmente para sempre pedir para selecionar a conta do Google
      provider.setCustomParameters({
        prompt: 'select_account'
      });

      // 2. Abre a janela de login do Google nativa do navegador
      const resultado = await signInWithPopup(auth, provider);
      
      console.log("Usuário logado via Google na Web com sucesso!", resultado.user.email);

    } catch (error: any) {
      console.error("Erro detalhado no login com Google (Web):", error);
      Alert.alert("Falha na Autenticação", "Não foi possível abrir a janela de login do Google.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Gamind_</Text>
      <Text style={styles.subtitulo}>Entre usando sua conta Google</Text>

      <TouchableOpacity style={styles.botaoGoogle} onPress={handleGoogleLogin} disabled={carregando}>
        {carregando ? (
          <ActivityIndicator color="#050505" />
        ) : (
          <Text style={styles.botaoTexto}>Entrar com o Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505", justifyContent: "center", alignItems: "center", padding: 20 },
  logo: { fontSize: 42, fontWeight: "bold", color: "#007AFF", marginBottom: 10 },
  subtitulo: { fontSize: 16, color: "#888", marginBottom: 40, textAlign: "center" },
  botaoGoogle: { width: "100%", backgroundColor: "#FFFFFF", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 10 },
  botaoTexto: { color: "#050505", fontSize: 16, fontWeight: "bold" },
});