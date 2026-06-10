import React, { useEffect, useState } from 'react';
import Game from '../../components/game';
import {
  StyleSheet,
  ImageBackground,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
// ALTERADO: Importando também o objeto 'auth' de autenticação
import { db, auth } from '../../firebaseConfig';
// ALTERADO: Trocado 'serverTimestamp' por 'Timestamp' estável
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { useIsFocused } from '@react-navigation/native';

export default function RateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { id, name, background_image } = params;
  const [nota, setNota] = useState<number>(0);
  const [favorito, setFavorito] = useState<boolean>(false);
  const [review, setReview] = useState<string>('');
  const from = params.from ? String(params.from).trim() : "";
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) {
      router.setParams({ id: '', name: '', background_image: '', from: '' });
      setNota(0);
      setFavorito(false);
      setReview('');
    }
  }, [isFocused]);

  const Postar = async () => {
    if (nota === 0) {
      Alert.alert("Atenção", "Por favor, selecione uma nota antes de postar.");
      return;
    }

    // ADICIONADO: Capturando o usuário atualmente logado
    const usuarioAtual = auth.currentUser;

    if (!usuarioAtual) {
      Alert.alert("Erro de Sessão", "Você precisa estar conectado para avaliar um jogo.");
      router.replace('/(auth)/login');
      return;
    }

    try {
      // ALTERADO: Agora a postagem inclui o vínculo 'userId' essencial para o perfil filtrar
      await addDoc(collection(db, "avaliacoes_jogos"), {
        userId: usuarioAtual.uid, // Tag indispensável vinculada ao Google Auth
        userEmail: usuarioAtual.email,
        jogoId: id || "id_padrao",
        nomeJogo: name || "Weird Tales of Electric Frost",
        imagemJogo: background_image || null,
        nota: nota,
        favorito: favorito,
        comentario: review,
        dataPostagem: Timestamp.now(), // Timestamp imediato para evitar quebras de cache locais
      });

      Alert.alert("Sucesso!", "Sua avaliação foi salva!");
      router.setParams({ id: '', name: '', background_image: '', from: '' });
      router.push('/profile');
    } catch (error) {
      console.error("Erro ao salvar jogo com o ID de Usuário: ", error);
      Alert.alert("Erro", "Não conseguimos salvar sua avaliação.");
    }
  };

  // se não houver um jogo selecionado, exibe a tela de busca para escolher um jogo
  const hasSelectedGame = id && id !== "" && (from === "detail" || from === "search");
  if (!hasSelectedGame) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSearchOnly}>
          <Text style={styles.headerTitlePage}>Avaliar Jogo</Text>
        </View>
        <View style={styles.onGamePress}>
          <Game onGamePress={(item) => {
            router.setParams({
              id: item.id.toString(),
              name: item.name,
              background_image: item.background_image,
              from: "search"
            });
          }} />
        </View>
      </View>
    );
  }

  // se houver um jogo selecionado, exibe a tela de rate do jogo selecionado
  return (
    <ScrollView style={styles.container}>
      <ImageBackground
        source={background_image ? { uri: background_image as string } : require('../../assets/images/image-not-found.png')}
        style={styles.headerBackground}
        imageStyle={{ opacity: 0.4 }}
        resizeMode="cover"
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (from === "detail") {
              router.setParams({ id: '', name: '', background_image: '', from: '' });
              router.back();
            } else {
              router.setParams({ id: '', name: '', background_image: '', from: '' });
              setNota(0);
              setFavorito(false);
              setReview('');
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.posterContainer}>
          <Image
            source={background_image ? { uri: background_image as string } : require('../../assets/images/image-not-found.png')}
            style={styles.posterImage}
          />
        </View>
      </ImageBackground>

      <View style={styles.content}>
        <Text style={styles.titulo}>{name}</Text>

        {/* TODO: add real game stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#888" />
            <Text style={styles.statText}> 10h jogadas</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trophy-outline" size={16} color="#888" />
            <Text style={styles.statText}> 15 conquistas</Text>
          </View>
        </View>

        <TextInput
          style={styles.inputReview}
          placeholder="Escreva sua resenha detalhada..."
          placeholderTextColor="#555"
          multiline
          onChangeText={setReview}
          value={review}
        />

        <View style={styles.actionRow}>
          <TouchableOpacity onPress={() => setFavorito(!favorito)}>
            <Ionicons
              name={favorito ? "heart" : "heart-outline"}
              size={32}
              color="#ff4444"
            />
          </TouchableOpacity>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((estrela) => (
              <TouchableOpacity key={estrela} onPress={() => setNota(estrela)}>
                <Ionicons
                  name={nota >= estrela ? "star" : "star-outline"}
                  size={28}
                  color="#FFD700"
                />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.btnPostar} onPress={Postar}>
            <Text style={styles.btnTexto}>Postar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505'
  },
  onGamePress: {
    flex: 1, 
    paddingHorizontal: 20
  },
  headerSearchOnly: {
    paddingTop: Platform.OS === 'web' ? 30 : 60,       
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerTitlePage: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  headerBackground: {
    width: '100%',
    height: 250,
    marginBottom: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 20,
  },
  posterContainer: {
    position: 'absolute',
    bottom: -40,
    alignSelf: 'center',
    borderRadius: 12,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
  },
  posterImage: {
    width: 140,
    height: 185,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1A1A1A'
  },
  content: {
    padding: 20,
    alignItems: 'center'
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 10
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 15
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statText: {
    color: '#888',
    fontSize: 13
  },
  inputReview: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 15,
    padding: 15,
    height: 150,
    textAlignVertical: 'top',
    backgroundColor: '#111',
    color: '#fff',
    fontSize: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 25
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 5
  },
  btnPostar: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 25
  },
  btnTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});