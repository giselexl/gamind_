import React, { useCallback, useState, useEffect } from 'react';
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
import { collection, getDocs, query, orderBy, where, doc, deleteDoc, setDoc, getDoc, addDoc } from "firebase/firestore"; 
import { signOut, onAuthStateChanged } from "firebase/auth"; 
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

interface UsuarioProximo {
  id: string;
  displayName?: string;
  photoURL?: string;
  cidade?: string;
  gamertag?: string;
}

export default function ProfileScreen() {
  const router = useRouter();
  const [avaliacoes, setAvaliacoes] = useState<any[]>([]);
  const [listas, setListas] = useState<any[]>([]);
  const [usuariosProximos, setUsuariosProximos] = useState<UsuarioProximo[]>([]);
  const [idsSeguidos, setIdsSeguidos] = useState<string[]>([]); 
  const [carregando, setCarregando] = useState(true);
  const [carregandoComunidade, setCarregandoComunidade] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'reviews' | 'listas' | 'proximos'>('reviews');
  const [minhaCidade, setMinhaCidade] = useState<string>('Buscando localização...');
  const [usuarioAtual, setUsuarioAtual] = useState<any>(auth.currentUser);
  const [dadosFirestore, setDadosFirestore] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUsuarioAtual(user);
        const userRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          setDadosFirestore(docSnap.data());
        }
      } else {
        setUsuarioAtual(null);
        setDadosFirestore(null);
      }
    });
    return unsubscribe;
  }, []);

  const cityTextMapper = (text: string) => {
    if (!text || text.trim() === '') return 'Guarulhos';
    return text;
  };

  // FUNÇÃO CORRIGIDA: Ajustado de obtenerCidadeAtual para obterCidadeAtual
  const obterCidadeAtual = async (): Promise<string> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permissão de localização negada.');
        return 'Guarulhos'; 
      }

      const localizacao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      const { latitude, longitude } = localizacao.coords;

      const enderecoExpo = await Location.reverseGeocodeAsync({ latitude, longitude });
      let cidadeDetectada = enderecoExpo?.[0]?.city || enderecoExpo?.[0]?.subregion;

      if (!cidadeDetectada) {
        const resposta = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
        );
        const dados = await resposta.json();
        cidadeDetectada = dados?.address?.city || dados?.address?.town || dados?.address?.municipality;
      }

      return cidadeDetectada || 'Guarulhos';
    } catch (error) {
      console.error("Erro interno ao obter localização por GPS:", error);
      return 'Guarulhos'; 
    }
  };

  const salvarOuAtualizarUsuarioNoBanco = async (cidade: string) => {
    if (!usuarioAtual) return;
    try {
      const userRef = doc(db, "usuarios", usuarioAtual.uid);
      const docSnap = await getDoc(userRef);
      
      let nomeAtual = usuarioAtual.displayName || "Jogador do Gamind";
      let fotoAtual = usuarioAtual.photoURL || "";
      let bioAtual = "";

      if (docSnap.exists()) {
        const dados = docSnap.data();
        setDadosFirestore(dados);
        if (dados.displayName) nomeAtual = dados.displayName;
        if (dados.photoURL) fotoAtual = dados.photoURL; 
        if (dados.bio) bioAtual = dados.bio;
      }

      await setDoc(userRef, {
        uid: usuarioAtual.uid,
        displayName: nomeAtual,
        photoURL: fotoAtual,
        bio: bioAtual,
        email: usuarioAtual.email || "",
        cidade: cityTextMapper(cidade),
        ultimaAtividade: new Date()
      }, { merge: true }); 
      
    } catch (error) {
      console.error("Erro ao sincronizar usuário no Firestore:", error);
    }
  };

  const carregarDadosComunidadeESeguidos = async (cidadeDoUsuario: string) => {
    const uidVerificado = usuarioAtual?.uid || auth.currentUser?.uid;
    if (!uidVerificado) return;

    setCarregandoComunidade(true);
    try {
      const qSeguidos = query(
        collection(db, "seguidores"),
        where("followerId", "==", uidVerificado)
      );
      const snapshotSeguidos = await getDocs(qSeguidos);
      const seguidosIds = snapshotSeguidos.docs.map(doc => doc.data().followingId);
      setIdsSeguidos(seguidosIds);

      const qComunidade = query(
        collection(db, "usuarios"),
        where("cidade", "==", cityTextMapper(cidadeDoUsuario))
      );
      const snapshotComunidade = await getDocs(qComunidade);
      const listaUsuarios: UsuarioProximo[] = [];

      snapshotComunidade.forEach((doc) => {
        if (doc.id !== uidVerificado) {
          listaUsuarios.push({ id: doc.id, ...doc.data() as Omit<UsuarioProximo, 'id'> });
        }
      });

      setUsuariosProximos(listaUsuarios);
    } catch (error) {
      console.error("Erro ao buscar dados da comunidade:", error);
    } finally {
      setCarregandoComunidade(false);
    }
  };

  const handleToggleSeguir = async (usuarioAlvo: UsuarioProximo) => {
    if (!usuarioAtual) return;

    const nomeAlvo = usuarioAlvo.displayName || "Jogador";

    try {
      const q = query(
        collection(db, "seguidores"),
        where("followerId", "==", usuarioAtual.uid),
        where("followingId", "==", usuarioAlvo.id)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        snapshot.forEach(async (documento) => {
          await deleteDoc(documento.ref);
        });
        setIdsSeguidos(prev => prev.filter(id => id !== usuarioAlvo.id));
        
        if (Platform.OS === 'web') {
          window.alert(`Você deixou de seguir ${nomeAlvo}.`);
        } else {
          Alert.alert("Social", `Você deixou de seguir ${nomeAlvo}.`);
        }
      } else {
        await addDoc(collection(db, "seguidores"), {
          followerId: usuarioAtual.uid,
          followingId: usuarioAlvo.id,
          dataCriacao: new Date()
        });
        setIdsSeguidos(prev => [...prev, usuarioAlvo.id]);

        if (Platform.OS === 'web') {
          window.alert(`Você começou a seguir ${nomeAlvo}!`);
        } else {
          Alert.alert("Social", `Você começou a seguir ${nomeAlvo}!`);
        }
      }
    } catch (error) {
      console.error("Erro ao alterar estado de seguir:", error);
      Alert.alert("Erro", "Não foi possível processar a ação social.");
    }
  };

  const buscarDados = async () => {
    const uidVerificado = usuarioAtual?.uid || auth.currentUser?.uid;
    if (!uidVerificado) {
      setCarregando(false);
      return;
    }
    
    setCarregando(true);
    try {
      const cidadeDetectada = await obterCidadeAtual();
      setMinhaCidade(cidadeDetectada);
      await salvarOuAtualizarUsuarioNoBanco(cidadeDetectada);

      let snapshotAvaliacoes;
      try {
        const qAvaliacoes = query(
          collection(db, "avaliacoes_jogos"), 
          where("userId", "==", uidVerificado),
          orderBy("dataPostagem", "desc")
        );
        snapshotAvaliacoes = await getDocs(qAvaliacoes);
      } catch (e) {
        const qAvaliacoesFallback = query(
          collection(db, "avaliacoes_jogos"), 
          where("userId", "==", uidVerificado)
        );
        snapshotAvaliacoes = await getDocs(qAvaliacoesFallback);
      }

      const listaAvaliacoes: any[] = [];
      const jogosFavoritos: any[] = [];

      snapshotAvaliacoes.forEach((doc) => {
        const data = doc.data();
        listaAvaliacoes.push({ id: doc.id, ...data });

        if (data.favorito === true || data.favorito === "true") {
          jogosFavoritos.push({
            id: data.jogoId || doc.id,
            nomeJogo: data.nomeJogo || "Jogo Favorito",
            imagemJogo: data.imagemJogo || "",
            background_image: data.imagemJogo || "" 
          });
        }
      });

      listaAvaliacoes.sort((a, b) => (b.dataPostagem?.seconds || 0) - (a.dataPostagem?.seconds || 0));
      setAvaliacoes(listaAvaliacoes);

      let snapshotListas;
      try {
        const qListas = query(
          collection(db, "listas_jogos"), 
          where("userId", "==", uidVerificado),
          orderBy("dataCriacao", "desc")
        );
        snapshotListas = await getDocs(qListas);
      } catch (e) {
        const qListasFallback = query(
          collection(db, "listas_jogos"), 
          where("userId", "==", uidVerificado)
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
      await carregarDadosComunidadeESeguidos(cidadeDetectada);

    } catch (error) {
      console.error("Erro ao carregar dados do perfil: ", error);
    } finally {
      setCarregando(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buscarDados();
    }, [usuarioAtual])
  );

  const handleDeletarLista = (idLista: string, nomeLista: string) => {
    const mensagem = `Tem certeza que deseja excluir a lista "${nomeLista}"? Esta ação não pode ser desfeita.`;

    const prosseguirExclusao = async () => {
      try {
        await deleteDoc(doc(db, "listas_jogos", idLista));
        if (Platform.OS === 'web') window.alert("Lista excluída com sucesso!");
        else Alert.alert("Sucesso", "Lista excluída com sucesso!");
        buscarDados(); 
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
      setUsuarioAtual(null);
      router.replace('/(auth)/login');
    } catch (e) {
      console.error("Erro ao deslogar:", e);
    }
  };

  const HeaderPerfil = () => {
    const fotoUrlValida = dadosFirestore?.photoURL || usuarioAtual?.photoURL;

    return (
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.btnSair} onPress={handleSignOut} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={20} color="#FF453A" />
          <Text style={styles.btnSairTexto}>Sair</Text>
        </TouchableOpacity>

        {fotoUrlValida ? (
          <Image 
            source={{ uri: fotoUrlValida }} 
            style={styles.fotoPerfil}
          />
        ) : (
          <View style={styles.fotoPerfilFallback}>
            <Ionicons name="person" size={60} color="#444" />
          </View>
        )}
        
        <Text style={styles.nomeUsuario}>
          {dadosFirestore?.displayName || usuarioAtual?.displayName || "Usuário do Gamind"}
        </Text>
        
        <View style={styles.myLocationBadge}>
          <Ionicons name="navigate-circle" size={14} color="#007AFF" />
          <Text style={styles.myLocationText}>{minhaCidade}</Text>
        </View>

        <Text style={styles.bio}>
          {dadosFirestore?.bio || "Nenhuma descrição informada ainda."}
        </Text>
        
        <TouchableOpacity 
          style={styles.btnEditarPerfil} 
          onPress={() => router.push('/editProfile')}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color="#007AFF" style={{ marginRight: 5 }} />
          <Text style={styles.btnEditarPerfilTexto}>Editar Perfil</Text>
        </TouchableOpacity>

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
            <Text style={[styles.tabText, abaAtiva === 'listas' && styles.tabTextActive]}>Listas</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, abaAtiva === 'proximos' && styles.tabButtonActive]}
            onPress={() => setAbaAtiva('proximos')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, abaAtiva === 'proximos' && styles.tabTextActive]}>Perto de Mim</Text>
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
  };

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
    } else if (abaAtiva === 'listas') {
      const primeiroJogo = item.jogos && item.jogos.length > 0 ? item.jogos[0] : null;
      const urlImagem = primeiroJogo?.background_image || primeiroJogo?.imagemJogo;

      return (
        <View style={styles.cardListaWrapper}>
          <TouchableOpacity 
            style={styles.cardLista} 
            activeOpacity={0.8}
            onPress={() => {
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

            {urlImagem ? (
              <Image source={{ uri: urlImagem }} style={styles.miniPoster} />
            ) : (
              <View style={[styles.miniPoster, { backgroundColor: '#222', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="image-outline" size={24} color="#555" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    } else {
      const jaSigo = idsSeguidos.includes(item.id);

      return (
        <View style={styles.cardUsuarioWrapper}>
          {item.photoURL ? (
            <Image 
              source={{ uri: item.photoURL }} 
              style={styles.fotoMini}
            />
          ) : (
            <View style={styles.fotoMiniFallback}>
              <Ionicons name="person" size={22} color="#444" />
            </View>
          )}
          <View style={styles.infoUsuarioProximo}>
            <Text style={styles.nomeUsuarioProximo}>{item.displayName || "Jogador do Gamind"}</Text>
            <View style={styles.localizacaoBadge}>
              <Ionicons name="location" size={12} color="#007AFF" />
              <Text style={styles.textoLocalizacao}>{item.cidade || "Região próxima"}</Text>
            </View>
          </View>
          
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.btnSocialAction, jaSigo ? styles.btnSeguindoActive : styles.btnSeguirInactive]} 
              onPress={() => handleToggleSeguir(item)} 
              activeOpacity={0.7}
            >
              <Ionicons 
                name={jaSigo ? "person-remove" : "person-add"} 
                size={16} 
                color="#fff" 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.btnConectar} 
              onPress={() => {
                router.push({
                  pathname: '/publicProfile',
                  params: { idUsuario: item.id } 
                });
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="game-controller-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

  const obterDadosLista = () => {
    if (abaAtiva === 'reviews') return avaliacoes;
    if (abaAtiva === 'listas') return listas;
    
    const uidVerificado = usuarioAtual?.uid || auth.currentUser?.uid;
    return usuariosProximos.filter(usuario => usuario.id !== uidVerificado);
  };

  return (
    <View style={styles.container}>
      {carregando ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={obterDadosLista()}
          keyExtractor={(item, index) => item.id || index.toString()}
          ListHeaderComponent={HeaderPerfil} 
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={renderItem}
          ListEmptyComponent={
            carregandoComunidade ? (
              <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 20 }} />
            ) : (
              <Text style={styles.emptyText}>
                {abaAtiva === 'reviews' && "Nenhuma avaliação encontrada."}
                {abaAtiva === 'listas' && "Você ainda não criou nenhuma lista."}
                {abaAtiva === 'proximos' && `Nenhum outro jogador encontrado em ${minhaCidade} ainda.`}
              </Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#050505' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  headerContainer: { 
    alignItems: 'center', 
    paddingTop: 60, 
    paddingBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1A1A1A', 
    marginBottom: 20, 
    position: 'relative' 
  },
  btnSair: { 
    position: 'absolute', 
    top: 20, 
    right: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1C1C1E', 
    paddingVertical: 6, 
    paddingHorizontal: 12, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#2C2C2E' 
  },
  btnSairTexto: { 
    color: '#FF453A', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginLeft: 4 
  },
  fotoPerfil: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 3, 
    borderColor: '#007AFF', 
    marginBottom: 15 
  },
  fotoPerfilFallback: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    borderWidth: 3, 
    borderColor: '#007AFF', 
    backgroundColor: '#1C1C1E', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  nomeUsuario: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  myLocationBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1A1A1A', 
    paddingVertical: 4, 
    paddingHorizontal: 10, 
    borderRadius: 20, 
    marginTop: 6, 
    borderWidth: 1, 
    borderColor: '#262626' 
  },
  myLocationText: { 
    color: '#007AFF', 
    fontSize: 12, 
    fontWeight: '600', 
    marginLeft: 4 
  },
  bio: { 
    fontSize: 14, 
    color: '#888', 
    marginTop: 10, 
    paddingHorizontal: 20, 
    textAlign: 'center' 
  },
  btnEditarPerfil: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1C1C1E', 
    paddingVertical: 6, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    marginTop: 12, 
    borderWidth: 1, 
    borderColor: '#2C2C2E' 
  },
  btnEditarPerfilTexto: { 
    color: '#007AFF', 
    fontSize: 13, 
    fontWeight: 'bold' 
  },
  statsContainer: { 
    flexDirection: 'row', 
    marginTop: 25, 
    backgroundColor: '#111', 
    borderRadius: 15, 
    padding: 15, 
    width: width - 40, 
    justifyContent: 'space-around', 
    alignItems: 'center' 
  },
  statItem: { 
    alignItems: 'center' 
  },
  statNumber: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  statLabel: { 
    color: '#666', 
    fontSize: 12 
  },
  divider: { 
    width: 1, 
    height: 30, 
    backgroundColor: '#333' 
  },
  cardAvaliacao: { 
    backgroundColor: '#111', 
    padding: 18, 
    borderRadius: 15, 
    marginHorizontal: 20, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#1A1A1A' 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start' 
  },
  nomeJogo: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#fff', 
    flex: 1 
  },
  comentario: { 
    color: '#BBB', 
    fontSize: 14, 
    lineHeight: 20, 
    backgroundColor: '#1A1A1A', 
    padding: 10, 
    borderRadius: 8, 
    marginTop: 5 
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#444', 
    marginTop: 40, 
    paddingHorizontal: 20 
  },
  tabContainer: { 
    flexDirection: 'row', 
    width: width - 40, 
    marginTop: 30, 
    marginBottom: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1A1A1A' 
  },
  tabButton: { 
    flex: 1, 
    paddingVertical: 12, 
    alignItems: 'center' 
  },
  tabButtonActive: { 
    borderBottomWidth: 2, 
    borderBottomColor: '#007AFF' 
  },
  tabText: { 
    fontSize: 14, 
    color: '#666', 
    fontWeight: '600' 
  },
  tabTextActive: { 
    color: '#007AFF' 
  },
  btnCriarLista: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#111', 
    width: width - 40, 
    paddingVertical: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#1A1A1A', 
    borderStyle: 'dashed', 
    marginBottom: 15 
  },
  btnCriarListaTexto: { 
    color: '#007AFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 8 
  },
  cardListaWrapper: { 
    flexDirection: 'row', 
    marginHorizontal: 20, 
    marginBottom: 15, 
    alignItems: 'center' 
  },
  cardLista: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#111', 
    padding: 15, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: '#1A1A1A', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  listaInfo: { 
    flex: 1, 
    paddingRight: 15 
  },
  nomeLista: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 4 
  },
  descLista: { 
    fontSize: 13, 
    color: '#888', 
    marginBottom: 10, 
    lineHeight: 18 
  },
  badgeQtdJogos: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#222', 
    alignSelf: 'flex-start', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  qtdJogosText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
  miniPoster: { 
    width: 60, 
    height: 80, 
    borderRadius: 8 
  },
  cardUsuarioWrapper: { 
    flexDirection: 'row', 
    backgroundColor: '#111', 
    padding: 15, 
    borderRadius: 15, 
    marginHorizontal: 20, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#1A1A1A', 
    alignItems: 'center' 
  },
  fotoMini: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    borderWidth: 1, 
    borderColor: '#333' 
  },
  fotoMiniFallback: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    borderWidth: 1, 
    borderColor: '#333', 
    backgroundColor: '#1C1C1E', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  infoUsuarioProximo: { 
    flex: 1, 
    marginLeft: 15 
  },
  nomeUsuarioProximo: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  localizacaoBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  textoLocalizacao: { 
    color: '#888', 
    fontSize: 12, 
    marginLeft: 4 
  },
  actionButtonsContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  btnConectar: { 
    backgroundColor: '#1C1C1E', 
    padding: 10, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#2C2C2E' 
  },
  btnSocialAction: { 
    padding: 10, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    minWidth: 38 
  },
  btnSeguirInactive: { 
    backgroundColor: '#007AFF' 
  },
  btnSeguindoActive: { 
    backgroundColor: '#34C759' 
  } 
});