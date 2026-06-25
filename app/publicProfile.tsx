import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  Dimensions,
  TouchableOpacity,
  Platform,
  Alert
} from 'react-native';
import { db } from '../firebaseConfig'; 
import { collection, getDocs, query, orderBy, where, doc, getDoc } from "firebase/firestore"; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

export default function PublicProfileScreen() {
  const router = useRouter();
  const { idUsuario } = useLocalSearchParams<{ idUsuario: string }>(); // Captura o ID vindo da rota

  const [perfilTarget, setPerfilTarget] = useState<any>(null);
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [listas, setListas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState<'reviews' | 'listas'>('reviews');

  const buscarDadosPublicos = async () => {
    if (!idUsuario) return;
    setCarregando(true);
    try {
      // 1. Busca os dados básicos do usuário alvo na coleção "usuarios"
      const userRef = doc(db, "usuarios", idUsuario);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setPerfilTarget(userSnap.data());
      } else {
        Alert.alert("Erro", "Usuário não encontrado.");
        router.back();
        return;
      }

      // 2. Busca as Avaliações/Reviews feitas por este usuário específico
      const qAvaliacoes = query(
        collection(db, "avaliacoes_jogos"), 
        where("userId", "==", idUsuario)
      );
      const snapshotAvaliacoes = await getDocs(qAvaliacoes);
      
      const listaAvaliacoes: any[] = [];
      const jogosFavoritos: any[] = [];

      snapshotAvaliacoes.forEach((doc) => {
        const data = doc.data();
        listaAvaliacoes.push({ id: doc.id, ...data });

        if (data.favorito) {
          jogosFavoritos.push({
            id: data.jogoId,
            name: data.nomeJogo,
            background_image: data.imagemJogo,
            docId: doc.id
          });
        }
      });

      // Ordena as avaliações por data manualmente como fallback seguro
      listaAvaliacoes.sort((a, b) => (b.dataPostagem?.seconds || 0) - (a.dataPostagem?.seconds || 0));
      setAvaliacoes(listaAvaliacoes);

      // 3. Busca as Listas criadas por este usuário específico
      const qListas = query(
        collection(db, "listas_jogos"), 
        where("userId", "==", idUsuario)
      );
      const snapshotListas = await getDocs(qListas);
      const listasJogos: any[] = [];
      
      snapshotListas.forEach((doc) => {
        listasJogos.push({ id: doc.id, ...doc.data() });
      });

      listasJogos.sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0));

      // Monta a lista automática de favoritos dele
      const listaAutoFavoritos = {
        id: 'auto_favoritos_publico',
        nome: 'Favoritos de ' + (userSnap.data().displayName || "Jogador"),
        descricao: 'Lista gerada automaticamente com os jogos favoritados nas reviews.',
        isAuto: true,
        jogos: jogosFavoritos
      };

      setListas([listaAutoFavoritos, ...listasJogos]);

    } catch (error) {
      console.error("Erro ao carregar perfil público: ", error);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDadosPublicos();
  }, [idUsuario]);

  const HeaderPerfilPublico = () => (
    <View style={styles.headerContainer}>
      {/* Botão de Voltar */}
      <TouchableOpacity style={styles.btnVoltar} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color="#007AFF" />
        <Text style={styles.btnVoltarTexto}>Voltar</Text>
      </TouchableOpacity>

      <Image 
        source={perfilTarget?.photoURL ? { uri: perfilTarget.photoURL } : require('../assets/images/perfil3.png')} 
        style={styles.fotoPerfil}
      />
      
      <Text style={styles.nomeUsuario}>{perfilTarget?.displayName || "Jogador do Gamind"}</Text>
      
      <View style={styles.myLocationBadge}>
        <Ionicons name="location" size={14} color="#007AFF" />
        <Text style={styles.myLocationText}>{perfilTarget?.cidade || "Localização oculta"}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{avaliacoes.length}</Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{(listas.length - 1) < 0 ? 0 : listas.length - 1}</Text>
          <Text style={styles.statLabel}>Listas</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, abaAtiva === 'reviews' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('reviews')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, abaAtiva === 'reviews' && styles.tabTextActive]}>Reviews</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, abaAtiva === 'listas' && styles.tabButtonActive]}
          onPress={() => setAbaAtiva('listas')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, abaAtiva === 'listas' && styles.tabTextActive]}>Listas e Favoritos</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    if (abaAtiva === 'reviews') {
      return (
        <View style={styles.cardAvaliacao}>
          <View style={styles.cardHeader}>
            <Text style={styles.nomeJogo}>{item.nomeJogo}</Text>
          </View>
          <View style={{ flexDirection: 'row', marginVertical: 8, gap: 2 }}>
            {[1, 2, 3, 4, 5].map((estrela) => (
              <Ionicons
                key={estrela}
                name={item.nota >= estrela ? "star" : "star-outline"}
                size={16}
                color="#FFD700"
              />
            ))}
          </View>
          {item.comentario ? <Text style={styles.comentario}>{item.comentario}</Text> : null}
        </View>
      );
    } else {
      const primeiroJogo = item.jogos && item.jogos.length > 0 ? item.jogos[0] : null;

      return (
        <View style={styles.cardListaWrapper}>
          <TouchableOpacity 
            style={styles.cardLista} 
            activeOpacity={0.8}
            onPress={() => {
              // Redireciona para ver os detalhes da lista dele (apenas leitura)
              router.push({ pathname: '/listDetails', params: { idLista: item.id } });
            }}
          >
            <View style={styles.listaInfo}>
              <Text style={styles.nomeLista} numberOfLines={1}>{item.nome}</Text>
              <Text style={styles.descLista} numberOfLines={2}>{item.descricao}</Text>
              <View style={styles.badgeQtdJogos}>
                <Ionicons name="game-controller" size={12} color="#fff" style={{ marginRight: 4 }}/>
                <Text style={styles.qtdJogosText}>{item.jogos?.length || 0} Jogos</Text>
              </View>
            </View>

            {primeiroJogo ? (
              <Image source={{ uri: primeiroJogo.background_image }} style={styles.miniPoster} />
            ) : (
              <View style={[styles.miniPoster, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
                 <Ionicons name="image-outline" size={24} color="#555" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={abaAtiva === 'reviews' ? avaliacoes : listas}
          keyExtractor={(item, index) => item.id || index.toString()}
          ListHeaderComponent={HeaderPerfilPublico} 
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {abaAtiva === 'reviews' && "Este usuário ainda não fez nenhuma avaliação."}
              {abaAtiva === 'listas' && "Este usuário não possui nenhuma lista pública."}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { alignItems: 'center', paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', marginBottom: 20, position: 'relative' },
  btnVoltar: { position: 'absolute', top: 20, left: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: '#2C2C2E' },
  btnVoltarTexto: { color: '#007AFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  fotoPerfil: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#007AFF', marginBottom: 15 },
  nomeUsuario: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  myLocationBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, marginTop: 6, borderWidth: 1, borderColor: '#262626' },
  myLocationText: { color: '#888', fontSize: 12, fontWeight: '600', marginLeft: 4 },
  statsContainer: { flexDirection: 'row', marginTop: 25, backgroundColor: '#111', borderRadius: 15, padding: 15, width: width - 40, justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 12 },
  divider: { width: 1, height: 30, backgroundColor: '#333' },
  cardAvaliacao: { backgroundColor: '#111', padding: 18, borderRadius: 15, marginHorizontal: 20, marginBottom: 15, borderWidth: 1, borderColor: '#1A1A1A' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nomeJogo: { fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1 },
  comentario: { color: '#BBB', fontSize: 14, lineHeight: 20, backgroundColor: '#1A1A1A', padding: 10, borderRadius: 8, marginTop: 5 },
  emptyText: { textAlign: 'center', color: '#444', marginTop: 40, paddingHorizontal: 20 },
  tabContainer: { flexDirection: 'row', width: width - 40, marginTop: 30, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 14, color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#007AFF' },
  cardListaWrapper: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, alignItems: 'center' },
  cardLista: { flex: 1, flexDirection: 'row', backgroundColor: '#111', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#1A1A1A', justifyContent: 'space-between', alignItems: 'center' },
  listaInfo: { flex: 1, paddingRight: 15 },
  nomeLista: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  descLista: { fontSize: 13, color: '#888', marginBottom: 10, lineHeight: 18 },
  badgeQtdJogos: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qtdJogosText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  miniPoster: { width: 60, height: 80, borderRadius: 8 }
});