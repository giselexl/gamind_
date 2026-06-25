import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, Alert, ActivityIndicator } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleCadastro = async () => {
    if (!nome || !email || !senha) {
      Alert.alert("Erro", "Por favor, preencha todos os campos.");
      return;
    }

    if (senha.length < 6) {
      Alert.alert("Senha muito curta", "A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setCarregando(true);
    try {
      // 1. Cria o usuário no Firebase Authentication
      const credencial = await createUserWithEmailAndPassword(auth, email, senha);
      const usuario = credencial.user;

      // 2. Atualiza o perfil local do Auth com o nome digitado
      await updateProfile(usuario, { displayName: nome });

      // 3. Cria o documento na coleção "usuarios" (Plural)
      await setDoc(doc(db, "usuarios", usuario.uid), {
        uid: usuario.uid,
        displayName: nome,
        email: email,
        photoURL: "", // Inicializa vazio para usar o placeholder local da tela de perfil
        cidade: "Guarulhos", // Cidade padrão segura para os testes iniciais
        ultimaAtividade: new Date()
      });

      Alert.alert("Sucesso!", "Sua conta foi criada com sucesso.");
      
      // Redireciona para a área logada do app
      router.replace('/profile');
    } catch (error: any) {
      console.error("Erro ao cadastrar:", error);
      
      // Tratamento de erros comuns do Firebase Auth
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert("Erro no cadastro", "Este e-mail já está em uso por outra conta.");
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert("Erro no cadastro", "O formato do e-mail digitado é inválido.");
      } else {
        Alert.alert("Erro no cadastro", "Não foi possível criar a conta. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Botão de Voltar para o Login */}
      <TouchableOpacity style={styles.btnVoltar} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
        <Text style={styles.btnVoltarTexto}>Voltar para o Login</Text>
      </TouchableOpacity>

      <Text style={styles.logo}>Gamind_</Text>
      <Text style={styles.subtitulo}>Crie sua conta nativa no app</Text>
      
      {/* Campo de Nome */}
      <TextInput 
        style={styles.input} 
        placeholder="Nome de Exibição" 
        placeholderTextColor="#666" 
        value={nome} 
        onChangeText={setNome} 
      />
      
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
        placeholder="Senha (mínimo 6 caracteres)" 
        placeholderTextColor="#666" 
        value={senha} 
        onChangeText={setSenha} 
        secureTextEntry 
        autoCapitalize="none"
        autoCorrect={false}
      />

      {/* Botão de Cadastrar */}
      <TouchableOpacity style={styles.botao} onPress={handleCadastro} disabled={carregando}>
        {carregando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.botaoTexto}>Criar Conta</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', justifyContent: 'center', padding: 25 },
  btnVoltar: { flexDirection: 'row', alignItems: 'center', position: 'absolute', top: 50, left: 20, gap: 5 },
  btnVoltarTexto: { color: '#007AFF', fontSize: 16 },
  logo: { fontSize: 42, fontWeight: 'bold', color: '#007AFF', marginBottom: 10, textAlign: 'center' },
  subtitulo: { fontSize: 16, color: '#888', marginBottom: 40, textAlign: 'center' },
  input: { 
    width: "100%",
    backgroundColor: '#111', 
    color: '#fff', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#222',
    fontSize: 16
  },
  botao: { 
    width: "100%",
    backgroundColor: '#007AFF', 
    padding: 15, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginTop: 10 
  },
  botaoTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});