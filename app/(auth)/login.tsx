import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert } from "react-native";
import { auth } from "../../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleEmailLogin() {
    if (!email || !senha) {
      Alert.alert("Erro", "Por favor, preencha o e-mail e a senha.");
      return;
    }

    setCarregando(true);
    try {
      // Realiza a autenticação direta com o Firebase
      await signInWithEmailAndPassword(auth, email, senha);
      
      console.log("Usuário logado com sucesso!");
      
      // Redireciona para as abas principais (perfil)
      router.replace("/profile");
    } catch (error: any) {
      console.error("Erro na autenticação:", error);
      
      // Tratamento de erros amigável para o usuário
      if (error.code === "auth/invalid-credential" || error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        Alert.alert("Falha na Autenticação", "E-mail ou senha incorretos.");
      } else {
        Alert.alert("Erro", "Ocorreu um erro ao tentar entrar. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Gamind_</Text>
      <Text style={styles.subtitulo}>Entre na sua conta para continuar</Text>

      {/* Campo de E-mail */}
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
      />

      {/* Campo de Senha */}
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor="#666"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Botão de Entrar */}
      <TouchableOpacity style={styles.botaoEntrar} onPress={handleEmailLogin} disabled={carregando}>
        {carregando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.botaoTexto}>Entrar</Text>
        )}
      </TouchableOpacity>

      {/* Link para a Tela de Cadastro */}
      <TouchableOpacity style={styles.linkCadastro} onPress={() => router.push("/register")}>
        <Text style={styles.linkTexto}>Não tem uma conta? <Text style={styles.linkDestaque}>Cadastre-se</Text></Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505", justifyContent: "center", padding: 25 },
  logo: { fontSize: 42, fontWeight: "bold", color: "#007AFF", marginBottom: 10, textAlign: "center" },
  subtitulo: { fontSize: 16, color: "#888", marginBottom: 40, textAlign: "center" },
  input: {
    width: "100%",
    backgroundColor: "#111",
    color: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#222",
    fontSize: 16,
  },
  botaoEntrar: {
    width: "100%",
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  botaoTexto: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  linkCadastro: { marginTop: 25, alignItems: "center" },
  linkTexto: { color: "#888", fontSize: 14 },
  linkDestaque: { color: "#007AFF", fontWeight: "bold" },
});