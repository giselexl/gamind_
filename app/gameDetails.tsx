import React, { useEffect, useState } from 'react';
import {
    StyleSheet,
    ImageBackground,
    Text,
    View,
    Image,
    TouchableOpacity,
    ScrollView,
    Platform,
    ActivityIndicator,
    Modal,
    FlatList,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { getGameDetails } from '../services/gameApi';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion, where, getDoc } from "firebase/firestore";

interface Review {
    id: string;
    userId: string;
    userName: string;
    userPhoto?: string; // Adicionado para suportar a foto de perfil
    nota: number;
    comentario: string;
    dataCriacao: any;
}

export default function GameDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [expanded, setExpanded] = useState<boolean>(false);
    const { id, name, background_image } = params;
    const [description, setDescription] = useState<string>("");
    const [loadingDetails, setLoadingDetails] = useState<boolean>(true);
    const [modalListasVisivel, setModalListasVisivel] = useState(false);
    const [minhasListas, setMinhasListas] = useState<any[]>([]);
    const [carregandoListas, setCarregandoListas] = useState(false);
    
    // Estados para o Sistema Social de Reviews
    const [reviewsSeguidos, setReviewsSeguidos] = useState<Review[]>([]);
    const [carregandoReviews, setCarregandoReviews] = useState(false);

    useEffect(() => {
        async function loadDetails() {
            if (!id) return;

            setLoadingDetails(true);
            const data = await getGameDetails(Number(id));

            if (data && data.description_raw) {
                setDescription(data.description_raw);
            } else if (data && data.description) {
                setDescription(data.description.replace(/<[^>]*>?/gm, ''));
            } else {
                setDescription("Nenhuma descrição disponível para este jogo.");
            }
            setLoadingDetails(false);
        }

        loadDetails();
        loadReviewsDosSeguidos();
    }, [id]);

    // Função que busca as reviews e cruza com os dados atualizados do perfil do usuário
    const loadReviewsDosSeguidos = async () => {
        const usuarioAtual = auth.currentUser;
        if (!usuarioAtual || !id) return;

        setCarregandoReviews(true);
        try {
            // 1. Buscar quem o usuário atual segue
            const qSeguidos = query(
                collection(db, "seguidores"),
                where("followerId", "==", usuarioAtual.uid)
            );
            const snapshotSeguidos = await getDocs(qSeguidos);
            const idsSeguidos = snapshotSeguidos.docs.map(doc => doc.data().followingId);

            if (idsSeguidos.length === 0) {
                setReviewsSeguidos([]);
                setCarregandoReviews(false);
                return;
            }

            // 2. Buscar as reviews deste jogo específico
            const qReviews = query(
                collection(db, "avaliacoes_jogos"),
                where("jogoId", "==", id.toString())
            );
            const snapshotReviews = await getDocs(qReviews);
            
            // 3. Criar um mapa/dicionário com os dados do perfil de cada usuário seguido para evitar múltiplas leituras repetidas
            const dadosUsuariosSeguidos: { [key: string]: { name: string, photo: string } } = {};
            
            for (const idSeguido of idsSeguidos) {
                const userDocRef = doc(db, "usuarios", idSeguido);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const uData = userDocSnap.data();
                    dadosUsuariosSeguidos[idSeguido] = {
                        name: uData.displayName || "Jogador do Gamind",
                        photo: uData.photoURL || ""
                    };
                }
            }

            const reviewsTemp: Review[] = [];
            snapshotReviews.forEach(docSnap => {
                const data = docSnap.data();
                
                // 4. Filtrar apenas se a review pertence a alguém da lista de seguidos
                if (idsSeguidos.includes(data.userId)) {
                    const notaTratada = typeof data.nota === 'string' ? parseFloat(data.nota) : data.nota;
                    
                    // Recupera os dados do dicionário que criamos acima
                    const infoPerfil = dadosUsuariosSeguidos[data.userId] || { name: data.userName || data.displayName || "Usuário", photo: "" };

                    reviewsTemp.push({
                        id: docSnap.id,
                        userId: data.userId,
                        userName: infoPerfil.name,
                        userPhoto: infoPerfil.photo,
                        nota: notaTratada || 0,
                        comentario: data.comentario || "",
                        dataCriacao: data.dataPostagem || data.dataCriacao
                    });
                }
            });

            setReviewsSeguidos(reviewsTemp);
        } catch (error) {
            console.error("Erro ao buscar reviews de seguidos:", error);
        } finally {
            setCarregandoReviews(false);
        }
    };

    const abrirTelaAvaliacao = () => {
        router.push({
            pathname: "/rate",
            params: { id, name, background_image, from: "detail" }
        });
    };

    const abrirModalListas = async () => {
        setModalListasVisivel(true);
        setCarregandoListas(true);
        try {
            const usuarioAtual = auth.currentUser;
            if (!usuarioAtual) {
                Alert.alert("Erro", "Você precisa estar logado para ver suas listas.");
                setModalListasVisivel(false);
                return;
            }

            const q = query(
                collection(db, "listas_jogos"),
                where("userId", "==", usuarioAtual.uid),
                orderBy("dataCriacao", "desc")
            );

            const snapshot = await getDocs(q);
            const listasTemp: any[] = [];
            snapshot.forEach(doc => {
                listasTemp.push({ id: doc.id, ...doc.data() });
            });
            setMinhasListas(listasTemp);
        } catch (error) {
            console.error("Erro ao buscar listas: ", error);
        } finally {
            setCarregandoListas(false);
        }
    };

    const adicionarJogoNaLista = async (lista: any) => {
        try {
            const listaRef = doc(db, "listas_jogos", lista.id);
            await updateDoc(listaRef, {
                jogos: arrayUnion({
                    id: id?.toString(),
                    name: name,
                    background_image: background_image
                })
            });
            Alert.alert("Sucesso!", `Jogo adicionado à lista "${lista.nome}"!`);
            setModalListasVisivel(false);
        } catch (error) {
            console.error("Erro ao adicionar na lista: ", error);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
                <Stack.Screen options={{ headerShown: false }} />

                <ImageBackground
                    source={background_image ? { uri: String(background_image) } : require('../assets/images/image-not-found.png')}
                    style={styles.headerBackground}
                    imageStyle={{ opacity: 0.35 }}
                    resizeMode="cover"
                >
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.posterContainer}>
                        <Image
                            source={background_image ? { uri: String(background_image) } : require('../assets/images/image-not-found.png')}
                            style={styles.posterImage}
                            resizeMode="cover"
                        />
                    </View>
                </ImageBackground>

                <View style={styles.content}>
                    <Text style={styles.titulo}>
                        {name ? String(name) : "Nome do Jogo"}
                    </Text>

                    <TouchableOpacity
                        style={styles.descriptionContainer}
                        onPress={() => setExpanded(!expanded)}
                        activeOpacity={0.8}
                    >
                        {loadingDetails ? (
                            <ActivityIndicator size="small" color="#007AFF" style={{ paddingVertical: 20 }} />
                        ) : (
                            <Text style={styles.descriptionText} numberOfLines={expanded ? undefined : 3}>
                                {description}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.actionButtonsRow}>
                        <TouchableOpacity style={styles.btnAvaliar} onPress={abrirTelaAvaliacao} activeOpacity={0.8}>
                            <Ionicons name="star" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.btnTexto}>Avaliar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.btnLista} onPress={abrirModalListas} activeOpacity={0.8}>
                            <Ionicons name="list" size={18} color="#fff" style={{ marginRight: 6 }} />
                            <Text style={styles.btnTexto}>Na Lista</Text>
                        </TouchableOpacity>
                    </View>

                    {/* SEÇÃO SOCIAL: Reviews de quem você segue */}
                    <View style={styles.socialSection}>
                        <Text style={styles.socialTitle}>Reviews de quem você segue</Text>
                        
                        {carregandoReviews ? (
                            <ActivityIndicator size="small" color="#007AFF" style={{ marginTop: 15 }} />
                        ) : reviewsSeguidos.length > 0 ? (
                            reviewsSeguidos.map((review) => (
                                <View key={review.id} style={styles.reviewCard}>
                                    <View style={styles.reviewHeader}>
                                        <View style={styles.userDataRow}>
                                            {review.userPhoto ? (
                                                <Image source={{ uri: review.userPhoto }} style={styles.avatarMini} />
                                            ) : (
                                                <View style={styles.avatarMiniFallback}>
                                                    <Ionicons name="person" size={14} color="#666" />
                                                </View>
                                            )}
                                            <Text style={styles.reviewUser}>{review.userName}</Text>
                                        </View>
                                        <Text style={styles.reviewNota}>⭐ {review.nota.toFixed(1)}</Text>
                                    </View>
                                    {review.comentario ? (
                                        <Text style={styles.reviewComment}>{review.comentario}</Text>
                                    ) : null}
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptySocialText}>Nenhum amigo que você segue avaliou este jogo ainda.</Text>
                        )}
                    </View>

                </View>
                <View style={{ height: 60 }} />
            </ScrollView>

            {/* Modal de Listas */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalListasVisivel}
                onRequestClose={() => setModalListasVisivel(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Salvar em qual lista?</Text>
                            <TouchableOpacity onPress={() => setModalListasVisivel(false)}>
                                <Ionicons name="close" size={24} color="#888" />
                            </TouchableOpacity>
                        </View>

                        {carregandoListas ? (
                            <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 30 }} />
                        ) : (
                            <FlatList
                                data={minhasListas}
                                keyExtractor={(item) => item.id}
                                style={{ maxHeight: 300 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.listaItemModal}
                                        onPress={() => adicionarJogoNaLista(item)}
                                        activeOpacity={0.7}
                                    >
                                        <View>
                                            <Text style={styles.listaItemNome}>{item.nome}</Text>
                                            <Text style={styles.listaItemQtd}>{item.jogos?.length || 0} jogos</Text>
                                        </View>
                                        <Ionicons name="add-circle" size={28} color="#007AFF" />
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyListText}>Você ainda não tem listas criadas.</Text>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050505' },
    headerBackground: { width: '100%', height: Platform.OS === 'web' ? 300 : 250, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    backButton: { position: 'absolute', top: Platform.OS === 'web' ? 20 : 50, left: 20, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20, zIndex: 10 },
    posterContainer: { position: 'absolute', bottom: -60, alignSelf: 'center', borderRadius: 12, elevation: 15 },
    posterImage: { width: Platform.OS === 'web' ? 150 : 130, aspectRatio: 3 / 4, borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A' },
    content: { paddingHorizontal: 24, alignItems: 'center', marginTop: 80, width: '100%', maxWidth: 800, alignSelf: 'center' },
    titulo: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 20 },
    descriptionContainer: { width: '100%', backgroundColor: '#111111', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 25 },
    descriptionText: { color: '#BBBBBB', fontSize: 15, lineHeight: 22, textAlign: 'justify' },
    actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12, marginBottom: 35 },
    btnAvaliar: { flex: 1, flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    btnLista: { flex: 1, flexDirection: 'row', backgroundColor: '#222', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
    btnTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
    
    // Estilos da Seção Social modificados
    socialSection: { width: '100%', alignItems: 'flex-start', marginTop: 10 },
    socialTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
    reviewCard: { width: '100%', backgroundColor: '#111', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#1A1A1A' },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 10 },
    userDataRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatarMini: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#333' },
    avatarMiniFallback: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#222', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    reviewUser: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    reviewNota: { color: '#007AFF', fontWeight: '600', fontSize: 14 },
    reviewComment: { color: '#aaa', fontSize: 14, lineHeight: 20, backgroundColor: '#1A1A1A', padding: 10, borderRadius: 8, marginTop: 4 },
    emptySocialText: { color: '#666', fontSize: 14, fontStyle: 'italic', marginTop: 5 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#111', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderTopWidth: 1, borderTopColor: '#222' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    listaItemModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12 },
    listaItemNome: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    listaItemQtd: { fontSize: 13, color: '#888' },
    emptyListText: { color: '#888', textAlign: 'center', marginTop: 20, fontSize: 16 }
});