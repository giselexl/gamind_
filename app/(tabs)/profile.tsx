import React, { useCallback, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  ActivityIndicator, 
  Image, 
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { db, auth } from '../../firebaseConfig'; 
import { collection, getDocs, query, orderBy, where, doc, deleteDoc } from "firebase/firestore"; 
import { signOut } from "firebase/auth"; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const router = useRouter();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [listas, setListas] = useState<any[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'reviews' | 'listas'>('reviews');

  const usuarioAtual = auth.currentUser;

  const buscarDados = async () => {
    if (!usuarioAtual) return;
    
    setCarregando(true);
    try {
      let snapshotAvaliacoes;
      try {
        const qAvaliacoes = query(
          collection(db, "avaliacoes_jogos"), 
          where("userId", "==", usuarioAtual.uid),
          orderBy("dataPostagem", "desc")
        );
        snapshotAvaliacoes = await getDocs(qAvaliacoes);
      } catch (indexError) {
        const qAvaliacoesFallback = query(
          collection(db, "avaliacoes_jogos"), 
          where("userId", "==", usuarioAtual.uid)
        );
        snapshotAvaliacoes = await getDocs(qAvaliacoesFallback);
      }

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

      listaAvaliacoes.sort((a, b) => (b.dataPostagem?.seconds || 0) - (a.dataPostagem?.seconds || 0));
      setAvaliacoes(listaAvaliacoes);

      let snapshotListas;
      try {
        const qListas = query(
          collection(db, "listas_jogos"), 
          where("userId", "==", usuarioAtual.uid),
          orderBy("dataCriacao", "desc")
        );
        snapshotListas = await getDocs(qListas);
      } catch (indexError) {
        const qListasFallback = query(
          collection(db, "listas_jogos"), 
          where("userId", "==", usuarioAtual.uid)
        );
        snapshotListas = await getDocs(qListasFallback);
      }

      const listasJogos: any[] = [];
      snapshotListas.forEach((doc) => {
        listasJogos.push({ id: doc.id, ...doc.data() });
      });

      listasJogos.sort((a, b) => (b.dataCriacao?.seconds || 0) - (a.dataCriacao?.seconds || 0));

      const listaAutoFavoritos = {
        id: 'auto_favoritos',
        nome: 'Meus Favoritos',
        descricao: 'Lista gerada automaticamente com os jogos favoritados nas suas reviews.',
        isAuto: true,
        jogos: jogosFavoritos
      };

      setListas([listaAutoFavoritos, ...listasJogos]);

    } catch (error) {
      console.error("Erro geral ao buscar dados estruturados: ", error);
    } finally {
      setCarregando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [usuarioAtual])
  );

  // Função para Deletar uma Lista Personalizada (Firestore)
  const handleDeletarLista = (idLista: string, nomeLista: string) => {
    const mensagem = `Tem certeza que deseja excluir a lista "${nomeLista}"? Esta ação não pode ser desfeita.`;

    const prosseguirExclusao = async () => {
      try {
        await deleteDoc(doc(db, "listas_jogos", idLista));
        if (Platform.OS === 'web') window.alert("Lista excluída com sucesso!");
        else Alert.alert("Sucesso", "Lista excluída com sucesso!");
        buscarDados(); // Recarrega a lista na tela
      } catch (error) {
        console.error("Erro ao deletar lista:", error);
        Alert.alert("Erro", "Não foi possível excluir esta lista.");
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(mensagem)) prosseguirExclusao();
    } else {
      Alert.alert("Excluir Lista", mensagem, [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir", style: "destructive", onPress: prosseguirExclusao }
      ]);
    }
  };

  const handleSignOut = () => {
    const mensagemConfirmacao = "Tem certeza que deseja encerrar sua sessão?";
    if (Platform.OS === 'web') {
      if (window.confirm(mensagemConfirmacao)) executarSignOut();
    } else {
      Alert.alert("Sair do app", mensagemConfirmacao, [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: executarSignOut }
      ]);
    }
  };

  const executarSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch (e) {
      console.error("Erro ao deslogar:", e);
    }
  };

  const HeaderPerfil = () => (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.btnSair} onPress={handleSignOut} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#FF453A" />
        <Text style={styles.btnSairTexto}>Sair</Text>
      </TouchableOpacity>

      <Image 
        source={usuarioAtual?.photoURL ? { uri: usuarioAtual.photoURL } : require('../../assets/images/perfil3.png')} 
        style={styles.fotoPerfil}
      />
      
      <Text style={styles.nomeUsuario}>{usuarioAtual?.displayName || "Usuário do Gamind"}</Text>
      <Text style={styles.bio}>Adoro pregos, parafusos e jogos eletrônicos!</Text>
      
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
          <Text style={[styles.tabText, abaAtiva === 'listas' && styles.tabTextActive]}>Minhas Listas</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'listas' && (
        <TouchableOpacity 
          style={styles.btnCriarLista} 
          onPress={() => router.push('/createList')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={22} color="#007AFF" />
          <Text style={styles.btnCriarListaTexto}>Criar Nova Lista</Text>
        </TouchableOpacity>
      )}
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
              if (item.isAuto) {
                if (Platform.OS === 'web') window.alert("Esta lista é gerada dinamicamente com seus favoritos e não pode ser editada.");
                else Alert.alert("Lista Automática", "Esta lista junta todos os jogos favoritados e não pode ser alterada manualmente.");
                return;
              }
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

          {/* Botão de Excluir apenas para listas criadas pelo usuário (não-automáticas) */}
          {!item.isAuto && (
            <TouchableOpacity 
              style={styles.btnExcluirListaCard} 
              onPress={() => handleDeletarLista(item.id, item.nome)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF453A" />
            </TouchableOpacity>
          )}
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
          ListHeaderComponent={HeaderPerfil} 
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {abaAtiva === 'reviews' ? "Nenhuma avaliação encontrada." : "Você ainda não criou nenhuma lista."}
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
  btnSair: { position: 'absolute', top: 20, right: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: '#2C2C2E' },
  btnSairTexto: { color: '#FF453A', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  fotoPerfil: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#007AFF', marginBottom: 15 },
  nomeUsuario: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  bio: { fontSize: 14, color: '#888', marginTop: 5 },
  statsContainer: { flexDirection: 'row', marginTop: 25, backgroundColor: '#111', borderRadius: 15, padding: 15, width: width - 40, justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 12 },
  divider: { width: 1, height: 30, backgroundColor: '#333' },
  cardAvaliacao: { backgroundColor: '#111', padding: 18, borderRadius: 15, marginHorizontal: 20, marginBottom: 15, borderWidth: 1, borderColor: '#1A1A1A' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nomeJogo: { fontSize: 16, fontWeight: 'bold', color: '#fff', flex: 1 },
  comentario: { color: '#BBB', fontSize: 14, lineHeight: 20, backgroundColor: '#1A1A1A', padding: 10, borderRadius: 8, marginTop: 5 },
  emptyText: { textAlign: 'center', color: '#444', marginTop: 40 },
  tabContainer: { flexDirection: 'row', width: width - 40, marginTop: 30, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#007AFF' },
  tabText: { fontSize: 16, color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#007AFF' },
  btnCriarLista: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', width: width - 40, paddingVertical: 15, borderRadius: 12, borderWidth: 1, borderColor: '#1A1A1A', borderStyle: 'dashed', marginBottom: 15 },
  btnCriarListaTexto: { color: '#007AFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  cardListaWrapper: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, alignItems: 'center', gap: 10 },
  cardLista: { flex: 1, flexDirection: 'row', backgroundColor: '#111', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#1A1A1A', justifyContent: 'space-between', alignItems: 'center' },
  listaInfo: { flex: 1, paddingRight: 15 },
  nomeLista: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  descLista: { fontSize: 13, color: '#888', marginBottom: 10, lineHeight: 18 },
  badgeQtdJogos: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  qtdJogosText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  miniPoster: { width: 60, height: 80, borderRadius: 8 },
  btnExcluirListaCard: { backgroundColor: '#1C1C1E', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2E', justifyContent: 'center', alignItems: 'center' }
});