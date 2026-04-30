import React, { useState } from 'react';
import { StyleSheet,ImageBackground, Text, View, Image, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; 


export default function RateScreen() {
  const router = useRouter();
  const [nota, setNota] = useState(0); 
  const [favorito, setFavorito] = useState(false); 
  const [review, setReview] = useState(''); 

  // Função para validar e postar 
  const Postar = () => {
    if (nota === 0) {
      console.log("Nota selecionada:", nota);
      Alert.alert("Por favor, selecione uma nota antes de postar.");
      return;
    }
    
    // Se passar na validação volta pra home
    console.log("Postado!", { nota, favorito, review });
    Alert.alert("Sua avaliação foi enviada!");
    router.push('/');
  };

  return (
    <ScrollView style={styles.container}>
      <ImageBackground 
        source={require('../../assets/images/perfil3.png')} 
        style={styles.headerBackground}
        imageStyle={{ opacity: 0.7 }} 
        resizeMode="cover"
      >
        <View style={styles.posterContainer}>
          <Image 
            source={require('../../assets/images/perfil3.png')} 
            style={styles.posterImage} 
          />
        </View>
      </ImageBackground>

      <View style={styles.content}>
        <Text style={styles.titulo}>Weird Tales of Electric Frost from Golgatha for the Altar Of Melektaus</Text>

        {/* Estatísticas */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.statText}> 10h jogadas</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="trophy-outline" size={16} color="#666" />
            <Text style={styles.statText}> 15 conquistas</Text>
          </View>
        </View>

        {/* Review */}
        <TextInput
          style={styles.inputReview}
          placeholder="Escreva sua resenha detalhada..."
          multiline
          onChangeText={setReview}
          value={review}
        />

        {/* Rodapé  */}
        <View style={styles.actionRow}>
          {/* Botão de Favorito */}
          <TouchableOpacity onPress={() => setFavorito(!favorito)}>
            <Ionicons 
              name={favorito ? "heart" : "heart-outline"} 
              size={32} 
              color="red" 
            />
          </TouchableOpacity>

          {/* Nota*/}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((estrela) => (
              <TouchableOpacity key={estrela} onPress={() => setNota(estrela)}>
                <Ionicons 
                  name={nota >= estrela ? "star" : "star-outline"} 
                  size={28} 
                  color="gold" 
                />
              </TouchableOpacity>
            ))}
          </View>

          {/*Postar*/}
          <TouchableOpacity style={styles.btnPostar} onPress={Postar}>
            <Text style={styles.btnTexto}>Postar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerBackground: {
  width: '100%',    
  height: 300,      
  marginBottom: 60, 
  justifyContent: 'center',
  alignItems: 'center',
},
  backgroundImage: { width: '100%', height: '100%', opacity: 0.7 },
  posterContainer: {
    position: 'absolute',
    bottom: -50,
    alignSelf: 'center',
    borderRadius: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
  },
  posterImage: { width: 250, height: 300, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  content: { padding: 20, alignItems: 'center' },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 15 },
  statItem: { flexDirection: 'row', alignItems: 'center' },
  statText: { color: '#666', fontSize: 14 },
  inputReview: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 15,
    height: 120,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  actionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginTop: 25 
  },
  starsContainer: { flexDirection: 'row', gap: 5 },
  btnPostar: { backgroundColor: '#28a745', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  btnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});