import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  Image,
  Dimensions,
  Platform
} from 'react-native';
import { db, auth } from '../firebaseConfig'; 
import { doc, getDoc, updateDoc } from "firebase/firestore"; 
import { updateProfile } from "firebase/auth"; 
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export default function EditProfileScreen() {
  const router = useRouter();
  const usuarioAtual = auth.currentUser;

  const [nome, setNome] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [bio, setBio] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);

  useEffect(() => {
    const carregarDadosPerfil = async () => {
      if (!usuarioAtual) return;
      
      // Define os estados iniciais com os dados do Auth por segurança
      setNome(usuarioAtual.displayName || '');
      setFotoUrl(usuarioAtual.photoURL || '');

      try {
        // Busca os dados em tempo real do Firestore para garantir que temos a última foto salva
        const userRef = doc(db, "usuarios", usuarioAtual.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists()) {
          const dados = docSnap.data();
          if (dados.bio) setBio(dados.bio);
          if (dados.displayName) setNome(dados.displayName);
          
          // Se houver uma foto salva no Firestore (Base64 ou URL), ela tem prioridade total
          if (dados.photoURL) {
            setFotoUrl(dados.photoURL);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados para edição:", error);
      } finally {
        setCarregandoDados(false);
      }
    };

    carregarDadosPerfil();
  }, [usuarioAtual]);

  // Abre a galeria e converte localmente para Base64
  const selecionarImagem = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert("Precisamos de permissão para acessar suas fotos.");
      } else {
        Alert.alert("Permissão necessária", "Precisamos de permissão para acessar suas fotos.");
      }
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, 
      aspect: [1, 1],
      quality: 0.2, // Mantém a compactação para o Firestore aguentar com folga
      base64: true,
    });

    if (!resultado.canceled && resultado.assets[0].base64) {
      const formatoBase64 = `data:image/jpeg;base64,${resultado.assets[0].base64}`;
      setFotoUrl(formatoBase64);
    }
  };

  const handleSalvar = async () => {
    if (!usuarioAtual) return;
    
    // Correção do bug de validação do nome
    if (!nome.trim()) {
      if (Platform.OS === 'web') {
        window.alert("O nome de exibição não pode estar vazio.");
      } else {
        Alert.alert("Erro", "O nome de exibição não pode estar vazio.");
      }
      return;
    }

    setSalvando(true);
    try {
      // 1. Salva a string Base64 completa com prioridade máxima no Firestore
      const userRef = doc(db, "usuarios", usuarioAtual.uid);
      await updateDoc(userRef, {
        displayName: nome,
        photoURL: fotoUrl, // O Firestore suporta documentos de até 1MB
        bio: bio
      });

      // 2. Atualiza o Firebase Authentication de forma segura
      // Deixamos vazio no Auth para evitar estouro de limite de bytes por causa do Base64
      await updateProfile(usuarioAtual, {
        displayName: nome,
        photoURL: "" 
      });

      // 3. Alerta de Sucesso e Redirecionamento Seguro baseado na plataforma
      if (Platform.OS === 'web') {
        window.alert("Perfil atualizado com sucesso!");
        router.replace('/(tabs)/profile');
      } else {
        Alert.alert("Sucesso", "Perfil updated com sucesso!", [
          { text: "OK", onPress: () => router.replace('/(tabs)/profile') }
        ]);
      }
    } catch (error) {
      console.error("Erro ao salvar perfil no Firestore:", error);
      if (Platform.OS === 'web') {
        window.alert("Não foi possível atualizar o perfil.");
      } else {
        Alert.alert("Erro", "Não foi possível atualizar o perfil.");
      }
    } finally {
      setSalvando(false);
    }
  };

  if (carregandoDados) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.titulo}>Editar Perfil</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatarWrapper}>
          {fotoUrl ? (
            <Image 
              source={{ uri: fotoUrl }}
              style={styles.fotoPreview}
            />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={60} color="#444" />
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.btnTrocarFoto} onPress={selecionarImagem}>
          <Ionicons name="camera" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.btnTrocarFotoTexto}>Alterar Foto de Perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nome de Exibição</Text>
        <TextInput 
          style={styles.input}
          placeholder="Seu nome no app"
          placeholderTextColor="#444"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Descrição (Bio)</Text>
        <TextInput 
          style={[styles.input, styles.inputBio]}
          placeholder="Conte um pouco sobre você..."
          placeholderTextColor="#444"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity 
          style={styles.btnSalvar} 
          onPress={handleSalvar}
          disabled={salvando}
          activeOpacity={0.8}
        >
          {salvando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnSalvarTexto}>Salvar Alterações</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050505' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, marginBottom: 15 },
  btnVoltar: { padding: 4 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  
  avatarContainer: { alignItems: 'center', marginBottom: 25 },
  avatarWrapper: { position: 'relative', width: 120, height: 120, borderRadius: 60, overflow: 'hidden', borderWidth: 3, borderColor: '#007AFF' },
  fotoPreview: { width: '100%', height: '100%' },
  avatarFallback: { width: '100%', height: '100%', backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center' },
  btnTrocarFoto: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginTop: 12, borderWidth: 1, borderColor: '#2C2C2E' },
  btnTrocarFotoTexto: { color: '#fff', fontSize: 13, fontWeight: '600' },

  form: { paddingHorizontal: 20, gap: 15 },
  label: { color: '#888', fontSize: 14, fontWeight: '600', marginBottom: -5 },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#1A1A1A', fontSize: 16 },
  inputBio: { height: 100, textAlignVertical: 'top' },
  btnSalvar: { backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
  btnSalvarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});