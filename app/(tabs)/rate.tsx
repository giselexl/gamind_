import React, { useState } from 'react';
import { StyleSheet, ImageBackground, Text, View, Image, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router'; // Adicionado useLocalSearchParams
import { db } from '../../firebaseConfig'; 
import { collection, addDoc, serverTimestamp } from "firebase/firestore"; 

export default function RateScreen() {
  const router = useRouter();
  const { id, name, background_image } = useLocalSearchParams(); // Recebe os dados da API RAWG
  
  const [nota, setNota] = useState(0); 
  const [favorito, setFavorito] = useState(false); 
  const [review, setReview] = useState(''); 

  const Postar = async () => {
    if (nota === 0) {
      Alert.alert("Atenção", "Por favor, selecione uma nota antes de postar.");
      return;
    }

    try {
      await addDoc(collection(db, "avaliacoes_jogos"), {
        jogoId: id || "id_padrao", 
        nomeJogo: name || "Weird Tales of Electric Frost", 
        imagemJogo: background_image || null,
        nota: nota,
        favorito: favorito,
        comentario: review,
        dataPostagem: serverTimestamp(), 
      });

      Alert.alert("Sucesso!", "Sua avaliação foi salva!");
      router.push('/profile'); // Redireciona para o perfil para ver a lista
    } catch (error) {
      console.error("Erro ao salvar jogo: ", error);
      Alert.alert("Erro", "Não conseguimos salvar sua avaliação.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <ImageBackground 
        source={background_image ? { uri: background_image as string } : require('../../assets/images/perfil3.png')} 
        style={styles.headerBackground}
        imageStyle={{ opacity: 0.4 }} 
        resizeMode="cover"
      >
        <View style={styles.posterContainer}>
          <Image 
            source={background_image ? { uri: background_image as string } : require('../../assets/images/perfil3.png')} 
            style={styles.posterImage} 
          />
        </View>
      </ImageBackground>

      <View style={styles.content}>
        <Text style={styles.titulo}>{name || "Weird Tales of Electric Frost..."}</Text>

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
  container: { flex: 1, backgroundColor: '#050505' }, // Fundo Dark
  headerBackground: {
    width: '100%',    
    height: 250,      // Diminuído levemente o cabeçalho
    marginBottom: 50, 
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 180,       // Foto um pouco menor (era 250)
    height: 240,      // Altura proporcional (era 300)
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#1A1A1A' 
  },
  content: { padding: 20, alignItems: 'center' },
  titulo: { 
    fontSize: 22, 
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
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: '#888', fontSize: 13 },
  inputReview: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 15,
    padding: 15,
    height: 150,
    textAlignVertical: 'top',
    backgroundColor: '#111', // Cinza escuro para o input
    color: '#fff',
  },
  actionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginTop: 25 
  },
  starsContainer: { flexDirection: 'row', gap: 5 },
  btnPostar: { 
    backgroundColor: '#007AFF', // Azul para combinar com o tema
    paddingVertical: 10, 
    paddingHorizontal: 25, 
    borderRadius: 25 
  },
  btnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});