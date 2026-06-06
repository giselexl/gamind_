import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  Alert,
  Modal,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import GameComponent from '../components/game';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function CreateListScreen() {
  const router = useRouter();
  const [nomeLista, setNomeLista] = useState('');
  const [descricaoLista, setDescricaoLista] = useState('');
  
  const [modalVisivel, setModalVisivel] = useState(false);
  const [jogoSelecionado, setJogoSelecionado] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);

  const handleSelecionarJogo = (jogo: any) => {
    if (!nomeLista.trim() || !descricaoLista.trim()) {
      Alert.alert("Atenção", "Preencha o nome e a descrição da lista primeiro.");
      return;
    }
    setJogoSelecionado(jogo);
    setModalVisivel(true);
  };

  const handleCriarLista = async () => {
    setSalvando(true);
    try {
      await addDoc(collection(db, "listas_jogos"), {
        nome: nomeLista,
        descricao: descricaoLista,
        dataCriacao: serverTimestamp(),
        jogos: [{
          id: jogoSelecionado.id.toString(),
          name: jogoSelecionado.name,
          background_image: jogoSelecionado.background_image
        }]
      });

      setModalVisivel(false);
      Alert.alert("Sucesso!", "Lista criada com sucesso!");
      router.back();
    } catch (error) {
      console.error("Erro ao criar lista: ", error);
      Alert.alert("Erro", "Não foi possível criar a lista.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Lista</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Nome da Lista</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Jogos para zerar nas férias"
          placeholderTextColor="#555"
          value={nomeLista}
          onChangeText={setNomeLista}
        />

        <Text style={styles.label}>Descrição</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Sobre o que é essa lista?"
          placeholderTextColor="#555"
          multiline
          value={descricaoLista}
          onChangeText={setDescricaoLista}
        />

        <View style={styles.divisor} />

        <Text style={styles.labelSub}>Adicione o primeiro jogo:</Text>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20 }}>
        <GameComponent onGamePress={handleSelecionarJogo} />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisivel}
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <TouchableOpacity style={styles.closeModal} onPress={() => setModalVisivel(false)}>
              <Ionicons name="close" size={24} color="#888" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Confirmar Criação</Text>
            
            <Text style={styles.modalText}>
              Certeza que deseja criar a lista <Text style={{ color: '#fff', fontWeight: 'bold' }}>"{nomeLista}"</Text> e inserir o jogo abaixo?
            </Text>

            {jogoSelecionado && (
              <View style={styles.gamePreview}>
                <Image 
                  source={{ uri: jogoSelecionado.background_image || "https://via.placeholder.com/150" }} 
                  style={styles.gamePreviewImage} 
                />
                <Text style={styles.gamePreviewName} numberOfLines={2}>
                  {jogoSelecionado.name}
                </Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.btnConfirmar} 
              onPress={handleCriarLista}
              disabled={salvando}
            >
              <Text style={styles.btnConfirmarTexto}>
                {salvando ? "Criando..." : "Sim, Criar Lista"}
              </Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A'
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  content: { padding: 20 },
  label: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  labelSub: { color: '#007AFF', fontSize: 16, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    color: '#fff',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  divisor: { height: 1, backgroundColor: '#1A1A1A', marginVertical: 10 },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  closeModal: { alignSelf: 'flex-end', marginBottom: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
  modalText: { color: '#BBB', fontSize: 16, lineHeight: 24, marginBottom: 20 },
  gamePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050505',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    marginBottom: 25,
  },
  gamePreviewImage: { width: 60, height: 80, borderRadius: 8, marginRight: 15 },
  gamePreviewName: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 },
  btnConfirmar: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnConfirmarTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});