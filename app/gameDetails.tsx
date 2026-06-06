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
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";

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
    }, [id]);

    const abrirTelaAvaliacao = () => {
        router.push({
            pathname: "/rate",
            params: {
                id: id,
                name: name,
                background_image: background_image,
                from: "detail"
            }
        });
    };

    const abrirModalListas = async () => {
        setModalListasVisivel(true);
        setCarregandoListas(true);
        try {
            const q = query(collection(db, "listas_jogos"), orderBy("dataCriacao", "desc"));
            const snapshot = await getDocs(q);
            const listasTemp: any[] = [];
            snapshot.forEach(doc => {
                listasTemp.push({ id: doc.id, ...doc.data() });
            });
            setMinhasListas(listasTemp);
        } catch (error) {
            console.error("Erro ao buscar listas: ", error);
            Alert.alert("Erro", "Não foi possível carregar suas listas.");
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
            Alert.alert("Erro", "Não foi possível adicionar o jogo na lista.");
        }
    };

    return (
        <View style={ styles.container }>
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

                </View>
                <View style={{ height: 40 }} />
            </ScrollView>

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
    posterContainer: { position: 'absolute', bottom: -60, alignSelf: 'center', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 15 },
    posterImage: { width: Platform.OS === 'web' ? 150 : 130, aspectRatio: 3 / 4, borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A' },
    content: { paddingHorizontal: 24, alignItems: 'center', marginTop: 80 },
    titulo: { fontSize: 26, fontWeight: 'bold', color: '#ffffff', textAlign: 'center', marginBottom: 20 },
    descriptionContainer: { width: '100%', backgroundColor: '#111111', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1A1A1A', marginBottom: 25, minHeight: 80, justifyContent: 'center' },
    descriptionText: { color: '#BBBBBB', fontSize: 15, lineHeight: 22, textAlign: 'justify' },
    
    actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
    btnAvaliar: { flex: 1, flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', },
    btnLista: { flex: 1, flexDirection: 'row', backgroundColor: '#222', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#333' },
    btnTexto: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',},
    modalContent: { backgroundColor: '#111', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderTopWidth: 1, borderTopColor: '#222', },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    listaItemModal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 12, },
    listaItemNome: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
    listaItemQtd: { fontSize: 13, color: '#888' },
    emptyListText: { color: '#888', textAlign: 'center', marginTop: 20, fontSize: 16 },
});