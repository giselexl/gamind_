import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  Dimensions 
} from 'react-native';
import { db } from '../../firebaseConfig'; 
import { collection, getDocs, query, orderBy } from "firebase/firestore"; 

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarAvaliacoes = async () => {
      try {
        const q = query(collection(db, "avaliacoes_jogos"), orderBy("dataPostagem", "desc"));
        const querySnapshot = await getDocs(q);
        
        const lista: any[] = [];
        querySnapshot.forEach((doc) => {
          lista.push({ id: doc.id, ...doc.data() });
        });

        setAvaliacoes(lista);
      } catch (error) {
        console.error("Erro ao buscar dados: ", error);
      } finally {
        setCarregando(false);
      }
    };

    buscarAvaliacoes();
  }, []);

  // Componente que fica no topo da lista (Seu Perfil)
  const HeaderPerfil = () => (
    <View style={styles.headerContainer}>
      <Image 
        source={require('../../assets/images/perfil3.png')} 
        style={styles.fotoPerfil}
      />
      <Text style={styles.nomeUsuario}>Estriquinóia Pirulito</Text>
      <Text style={styles.bio}>Adoro pregos, parafusos e jogos eletrônicos!</Text>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{avaliacoes.length}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {avaliacoes.filter(a => a.favorito).length}
          </Text>
          <Text style={styles.statLabel}>Favoritos</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Atividade Recente</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={avaliacoes}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={HeaderPerfil} // Coloca o perfil no topo da lista
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <View style={styles.cardAvaliacao}>
              <View style={styles.cardHeader}>
                <Text style={styles.nomeJogo}>{item.nomeJogo}</Text>
                <Text style={styles.data}>
                  {item.dataPostagem?.toDate().toLocaleDateString('pt-BR')}
                </Text>
              </View>
              
              <Text style={styles.nota}>
                {"⭐".repeat(item.nota)}
                <Text style={{ color: '#444' }}>{"⭐".repeat(5 - item.nota)}</Text>
              </Text>

              {item.comentario ? (
                <Text style={styles.comentario}>{item.comentario}</Text>
              ) : null}

              {item.favorito && (
                <View style={styles.favBadge}>
                  <Text style={styles.favText}>❤ Favorito</Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nenhuma avaliação encontrada.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#050505', // Mesmo fundo da Home
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
    marginBottom: 20,
  },
  fotoPerfil: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#007AFF',
    marginBottom: 15,
  },
  nomeUsuario: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  bio: {
    fontSize: 14,
    color: '#888',
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 25,
    backgroundColor: '#111',
    borderRadius: 15,
    padding: 15,
    width: width - 40,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: '#333',
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    marginLeft: 20,
    marginTop: 30,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF', // Cor destaque para combinar com as estrelas da home
  },
  cardAvaliacao: {
    backgroundColor: '#111', // Card em cinza bem escuro
    padding: 18,
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nomeJogo: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#fff',
    flex: 1,
  },
  data: {
    fontSize: 10,
    color: '#555',
  },
  nota: { 
    fontSize: 14, 
    marginVertical: 8 
  },
  comentario: { 
    color: '#BBB', 
    fontSize: 14, 
    lineHeight: 20,
    backgroundColor: '#1A1A1A',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  favBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#900', // Vermelho escuro para não brilhar demais
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  favText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#444',
    marginTop: 40,
  }
});