import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  FlatList, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  Modal,
  Platform,
  TextInput,
  Alert
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, getDocs, doc, getDoc, deleteDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import GameComponent from '../components/game'; // Importado para permitir a busca de novos jogos

export default function ListDetailsScreen() {
  const router = useRouter();
  const { idLista } = useLocalSearchParams();
  const [lista, setLista] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  
  // Modais existentes
  const [modalExcluirVisivel, setModalExcluirVisivel] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [modalEditarVisivel, setModalEditarVisivel] = useState(false);
  const [nomeEditado, setNomeEditado] = useState('');
  const [descricaoEditada, setDescricaoEditada] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [modalRemoverJogoVisivel, setModalRemoverJogoVisivel] = useState(false);
  const [jogoParaRemover, setJogoParaRemover] = useState<any>(null);
  const [removendoJogo, setRemovendoJogo] = useState(false);
  const [modalCompartilharVisivel, setModalCompartilharVisivel] = useState(false);
  
  // NOVO: Estados para adição de novos jogos
  const [modalAdicionarJogoVisivel, setModalAdicionarJogoVisivel] = useState(false);
  const [adicionandoJogo, setAdicionandoJogo] = useState(false);
  
  const linkCompartilhamento = `https://gamind.app/listDetails?idLista=${idLista}`;

  useEffect(() => {
    buscarLista();
  }, [idLista]);

  const buscarLista = async () => {
    if (!idLista) return;
    setCarregando(true);
    try {
      if (idLista === 'auto_favoritos') {
        const qAvaliacoes = query(collection(db, "avaliacoes_jogos"), orderBy("dataPostagem", "desc"));
        const snapshot = await getDocs(qAvaliacoes);
        const favs: any[] = [];
        snapshot.forEach(d => {
          const data = d.data();
          if (data.favorito) {
            favs.push({
              id: data.jogoId,
              name: data.nomeJogo,
              background_image: data.imagemJogo,
              docId: d.id
            });
          }
        });
        setLista({
          id: 'auto_favoritos',
          nome: '❤️ Meus Favoritos',
          descricao: 'Lista dos jogos que marquei como favorito.',
          isAuto: true,
          jogos: favs
        });
      } else {
        const docRef = doc(db, "listas_jogos", String(idLista));
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setLista({ id: docSnap.id, ...docSnap.data() });
        } else {
          router.back();
        }
      }
    } catch (error) {
      console.error("Erro ao buscar lista: ", error);
    } finally {
      setCarregando(false);
    }
  };

  // NOVO: Função para inserir um jogo selecionado no Firestore e atualizar a UI
  const handleAdicionarJogo = async (jogo: any) => {
    if (lista?.isAuto) {
      if (Platform.OS === 'web') window.alert("Não é possível adicionar jogos diretamente a uma lista automática.");
      else Alert.alert("Aviso", "Não é possível adicionar jogos diretamente a uma lista automática.");
      return;
    }

    // Verifica se o jogo já está na lista atual para evitar duplicatas
    const jogoJaExiste = lista?.jogos?.some((j: any) => j.id.toString() === jogo.id.toString());
    if (jogoJaExiste) {
      if (Platform.OS === 'web') window.alert("Este jogo já faz parte desta lista.");
      else Alert.alert("Atenção", "Este jogo já faz parte desta lista.");
      return;
    }

    setAdicionandoJogo(true);
    const novoJogoObjeto = {
      id: jogo.id.toString(),
      name: jogo.name,
      background_image: jogo.background_image
    };

    try {
      const docRef = doc(db, "listas_jogos", String(idLista));
      await updateDoc(docRef, {
        jogos: arrayUnion(novoJogoObjeto)
      });

      // Atualiza o estado local imediatamente
      setLista((prev: any) => ({
        ...prev,
        jogos: prev.jogos ? [...prev.jogos, novoJogoObjeto] : [novoJogoObjeto]
      }));

      setModalAdicionarJogoVisivel(false);
      if (Platform.OS === 'web') window.alert("Jogo adicionado com sucesso!");
      else Alert.alert("Sucesso", "Jogo adicionado com sucesso!");
    } catch (error) {
      console.error("Erro ao adicionar jogo à lista: ", error);
      if (Platform.OS === 'web') window.alert("Erro ao adicionar o jogo.");
      else Alert.alert("Erro", "Não foi possível adicionar o jogo.");
    } finally {
      setAdicionandoJogo(false);
    }
  };

  const confirmarExclusao = async () => {
    setExcluindo(true);
    try {
      await deleteDoc(doc(db, "listas_jogos", String(idLista)));
      setModalExcluirVisivel(false);
      router.back(); 
    } catch (error) {
      console.error("Erro ao excluir: ", error);
    } finally {
      setExcluindo(false);
    }
  };

  const abrirModalEdicao = () => {
    setNomeEditado(lista?.nome || '');
    setDescricaoEditada(lista?.descricao || '');
    setModalEditarVisivel(true);
  };

  const salvarEdicao = async () => {
    if (!nomeEditado.trim() || !descricaoEditada.trim()) return;
    setSalvandoEdicao(true);
    try {
      await updateDoc(doc(db, "listas_jogos", String(idLista)), {
        nome: nomeEditado,
        descricao: descricaoEditada
      });
      setLista((prev: any) => ({ ...prev, nome: nomeEditado, descricao: descricaoEditada }));
      setModalEditarVisivel(false);
    } catch (error) {
      console.error("Erro ao editar lista: ", error);
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const abrirModalRemoverJogo = (jogo: any) => {
    setJogoParaRemover(jogo);
    setModalRemoverJogoVisivel(true);
  };

  const confirmarRemocaoJogo = async () => {
    if (!jogoParaRemover) return;
    setRemovendoJogo(true);
    try {
      if (lista?.isAuto) {
        await updateDoc(doc(db, "avaliacoes_jogos", jogoParaRemover.docId), {
          favorito: false
        });
      } else {
        await updateDoc(doc(db, "listas_jogos", String(idLista)), {
          jogos: arrayRemove(jogoParaRemover)
        });
      }

      setLista((prev: any) => ({
        ...prev,
        jogos: prev.jogos.filter((j: any) => j.id !== jogoParaRemover.id)
      }));
      setModalRemoverJogoVisivel(false);
      setJogoParaRemover(null);
    } catch (error) {
      console.error("Erro ao remover jogo: ", error);
    } finally {
      setRemovendoJogo(false);
    }
  };

  const copiarLink = async () => {
    await Clipboard.setStringAsync(linkCompartilhamento);
    if (Platform.OS === 'web') window.alert("O link da sua lista já está na área de transferência.");
    else Alert.alert("Link Copiado!", "O link da sua lista já está na área de transferência.");
  };

  if (carregando) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setModalCompartilharVisivel(true)} style={{ marginRight: lista?.isAuto ? 0 : 20 }}>
            <Ionicons name="share-social-outline" size={24} color="#fff" />
          </TouchableOpacity>
          
          {!lista?.isAuto && (
            <>
              <TouchableOpacity onPress={abrirModalEdicao} style={{ marginRight: 20 }}>
                <Ionicons name="pencil-outline" size={24} color="#007AFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalExcluirVisivel(true)}>
                <Ionicons name="trash-outline" size={24} color="#ff4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.titulo}>{lista?.nome}</Text>
        <Text style={styles.descricao}>{lista?.descricao}</Text>
        <View style={styles.infoMetaRow}>
          <Text style={styles.contador}>{lista?.jogos?.length || 0} jogos na lista</Text>
          
          {/* NOVO: Botão de adicionar jogo inserido abaixo da descrição da lista */}
          {!lista?.isAuto && (
            <TouchableOpacity 
              style={styles.btnAdicionarJogoInline} 
              onPress={() => setModalAdicionarJogoVisivel(true)}
            >
              <Ionicons name="add" size={16} color="#fff" style={{ marginRight: 4 }} />
              <Text style={styles.btnAdicionarJogoTexto}>Adicionar Jogo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={lista?.jogos || []}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 50 }}
        columnWrapperStyle={lista?.jogos?.length > 2 ? { justifyContent: 'space-between' } : { gap: 10 }}
        renderItem={({ item }) => (
          <View style={styles.jogoCard}>
            <Image 
              source={{ uri: item.background_image || "https://via.placeholder.com/150" }} 
              style={styles.jogoPoster} 
            />
            <TouchableOpacity 
              style={styles.btnRemoverJogoCard} 
              onPress={() => abrirModalRemoverJogo(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.jogoNome} numberOfLines={2}>{item.name}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum jogo adicionado ainda.</Text>
        }
      />

      {/* MODAL NOVO: Adicionar Jogo Posterior */}
      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={modalAdicionarJogoVisivel} 
        onRequestClose={() => setModalAdicionarJogoVisivel(false)}
      >
        <View style={styles.modalOverlayBottom}>
          <View style={[styles.modalEditContent, { height: '80%' }]}>
            <View style={styles.modalEditHeader}>
              <Text style={styles.modalEditTitle}>Adicionar Jogo à Lista</Text>
              <TouchableOpacity onPress={() => setModalAdicionarJogoVisivel(false)}>
                <Ionicons name="close" size={26} color="#888" />
              </TouchableOpacity>
            </View>
            
            {adicionandoJogo ? (
              <View style={[styles.center, { flex: 1 }]}>
                <ActivityIndicator size="large" color="#007AFF" />
              </View>
            ) : (
              <View style={{ flex: 1, marginTop: 10 }}>
                <GameComponent onGamePress={handleAdicionarJogo} />
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal animationType="fade" transparent={true} visible={modalExcluirVisivel} onRequestClose={() => setModalExcluirVisivel(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalAlertContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="warning" size={32} color="#ff4444" />
            </View>
            <Text style={styles.modalAlertTitle}>Excluir Lista?</Text>
            <Text style={styles.modalAlertText}>
              Tem certeza que deseja excluir permanentemente a lista <Text style={{ color: '#fff', fontWeight: 'bold' }}>&quot;{lista?.nome}&quot;</Text>? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalExcluirVisivel(false)} disabled={excluindo}>
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnExcluirConfirmar} onPress={confirmarExclusao} disabled={excluindo}>
                {excluindo ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnExcluirText}>Sim, Excluir</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmação para remoção de jogo da lista */}
      <Modal animationType="fade" transparent={true} visible={modalRemoverJogoVisivel} onRequestClose={() => setModalRemoverJogoVisivel(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalAlertContent}>
            <View style={styles.iconCircle}>
              <Ionicons name="trash-bin-outline" size={30} color="#ff4444" />
            </View>
            <Text style={styles.modalAlertTitle}>Remover Jogo?</Text>
            <Text style={styles.modalAlertText}>
              Deseja remover <Text style={{ color: '#fff', fontWeight: 'bold' }}>&quot;{jogoParaRemover?.name}&quot;</Text> desta lista?
            </Text>
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.btnCancelar} onPress={() => setModalRemoverJogoVisivel(false)} disabled={removendoJogo}>
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnExcluirConfirmar} onPress={confirmarRemocaoJogo} disabled={removendoJogo}>
                {removendoJogo ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnExcluirText}>Remover</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para edição das informações da lista */}
      <Modal animationType="slide" transparent={true} visible={modalEditarVisivel} onRequestClose={() => setModalEditarVisivel(false)}>
        <View style={styles.modalOverlayBottom}>
          <View style={styles.modalEditContent}>
            <View style={styles.modalEditHeader}>
              <Text style={styles.modalEditTitle}>Editar Lista</Text>
              <TouchableOpacity onPress={() => setModalEditarVisivel(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Nome da Lista</Text>
            <TextInput style={styles.input} value={nomeEditado} onChangeText={setNomeEditado} />
            <Text style={styles.label}>Descrição</Text>
            <TextInput style={[styles.input, styles.textArea]} multiline value={descricaoEditada} onChangeText={setDescricaoEditada} />
            <TouchableOpacity style={styles.btnSalvar} onPress={salvarEdicao} disabled={salvandoEdicao || !nomeEditado.trim() || !descricaoEditada.trim()}>
              {salvandoEdicao ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnSalvarText}>Salvar Alterações</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para compartilhamento de link via QR Code */}
      <Modal animationType="fade" transparent={true} visible={modalCompartilharVisivel} onRequestClose={() => setModalCompartilharVisivel(false)}>
        <View style={styles.modalOverlayCenter}>
          <View style={styles.modalShareContent}>
            <View style={styles.modalShareHeader}>
              <Text style={styles.modalShareTitle}>Compartilhar Lista</Text>
              <TouchableOpacity onPress={() => setModalCompartilharVisivel(false)}>
                <Ionicons name="close" size={24} color="#888" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalShareText}>Escaneie o QR Code ou copie o link abaixo para enviar a lista &quot;{lista?.nome}&quot; para seus amigos.</Text>
            <View style={styles.qrCodeContainer}>
              <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(linkCompartilhamento)}&bgcolor=FFFFFF&color=000000` }} style={styles.qrCodeImage} />
            </View>
            <TouchableOpacity style={styles.linkContainer} onPress={copiarLink} activeOpacity={0.7}>
              <Ionicons name="link-outline" size={20} color="#007AFF" style={{ marginRight: 10 }} />
              <Text style={styles.linkText} numberOfLines={1}>{linkCompartilhamento}</Text>
              <Ionicons name="copy-outline" size={20} color="#888" style={{ marginLeft: 10 }} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPronto} onPress={() => setModalCompartilharVisivel(false)}>
              <Text style={styles.btnProntoText}>Pronto</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: Platform.OS === 'web' ? 20 : 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  infoContainer: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#1A1A1A', marginBottom: 15 },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  descricao: { fontSize: 15, color: '#BBB', lineHeight: 22, marginBottom: 15 },
  infoMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contador: { fontSize: 13, color: '#007AFF', fontWeight: 'bold' },
  
  // Estilização do novo botão de adição alinhado na metarow
  btnAdicionarJogoInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  btnAdicionarJogoTexto: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  jogoCard: { width: '31%', backgroundColor: '#111', borderRadius: 10, marginBottom: 15, overflow: 'hidden', borderWidth: 1, borderColor: '#1A1A1A', position: 'relative' },
  jogoPoster: { width: '100%', height: 140, resizeMode: 'cover' },
  jogoNome: { color: '#fff', fontSize: 11, fontWeight: 'bold', padding: 8, textAlign: 'center' },
  btnRemoverJogoCard: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: 4, zIndex: 10 },
  
  emptyText: { color: '#888', textAlign: 'center', marginTop: 40, fontSize: 16 },

  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalAlertContent: { width: '100%', backgroundColor: '#1A1A1A', borderRadius: 20, padding: 25, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  iconCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255, 68, 68, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalAlertTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  modalAlertText: { color: '#BBB', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 25 },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
  btnCancelar: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#333', alignItems: 'center' },
  btnCancelarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  btnExcluirConfirmar: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#ff4444', alignItems: 'center' },
  btnExcluirText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalEditContent: { backgroundColor: '#111', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderTopWidth: 1, borderTopColor: '#222' },
  modalEditHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalEditTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  label: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333', color: '#fff', borderRadius: 10, padding: 15, fontSize: 16, marginBottom: 20 },
  textArea: { height: 100, textAlignVertical: 'top' },
  btnSalvar: { backgroundColor: '#007AFF', paddingVertical: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnSalvarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalShareContent: { width: '100%', backgroundColor: '#1A1A1A', borderRadius: 20, padding: 25, borderWidth: 1, borderColor: '#333' },
  modalShareHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalShareTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  modalShareText: { color: '#BBB', fontSize: 14, textAlign: 'left', lineHeight: 20, marginBottom: 20 },
  qrCodeContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 15, alignSelf: 'center', marginBottom: 25 },
  qrCodeImage: { width: 180, height: 180 },
  linkContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 10, padding: 15, marginBottom: 20 },
  linkText: { flex: 1, color: '#007AFF', fontSize: 14 },
  btnPronto: { backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, alignItems: 'center', width: '100%' },
  btnProntoText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});