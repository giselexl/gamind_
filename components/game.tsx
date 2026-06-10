import { searchGames } from "@/services/gameApi";
import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    TextInput,
    Image,
    ActivityIndicator,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    FlatList,
} from 'react-native';
import { useRouter } from "expo-router";

type Game = {
    id: number;
    name: string;
    released: string;
    background_image: string;
    rating: number;
};

interface GameComponentProps {
    onGamePress?: (game: any) => void;
}

export default function Games({ onGamePress }: GameComponentProps) {
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [games, setGames] = useState<Game[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const router = useRouter();
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchGame = async (searchQuery: string) => {
        setLoading(true);
        setError(null);
        setGames([]);
        setPage(1);
        setHasMore(true);

        try {
            const response = await searchGames(searchQuery, 1);
            if (!response || response.length === 0) {
                setError("Nenhum jogo encontrado.");
                return;
            }
            setGames(response);
        } catch (err) {
            setError("Não foi possível encontrar o jogo.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // reinicia o timer em cada mudança
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // limpa campos e resultados se a busca estiver vazia
        if (!name.trim()) {
            setGames([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        debounceTimer.current = setTimeout(() => {
            fetchGame(name);
        }, 500);

        // limpa o timer se o componente for desmontado ou se a busca mudar antes do tempo
        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
        };
    }, [name]);

    // conforme scroll, carrega mais resultados (se houver)
    const loadMore = async () => {
        if (loadingMore || !hasMore || !name.trim()) return;

        setLoadingMore(true);

        const nextPage = page + 1;

        try {
            const response = await searchGames(name, nextPage);

            if (!response || response.length === 0) {
                setHasMore(false);
            } else {
                setGames((current) => [...current, ...response]);
                setPage(nextPage);
            }
        } catch (err) {
            console.log("Erro ao carregar mais jogos: ", err);
        } finally {
            setLoadingMore(false);
        }
    };

    const handlePress = (item: Game) => {
        if (onGamePress) {
            onGamePress(item);
        } else {
            router.push({
                pathname: "/rate",
                params: { 
                    id: item.id.toString(), 
                    name: item.name, 
                    background_image: item.background_image,
                    from: "search"
                }
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={games}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.scrollContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                keyboardShouldPersistTaps="handled"
                alwaysBounceVertical={true}
                scrollEnabled={true}
                keyboardDismissMode="on-drag"
                ListHeaderComponent={
                    <>
                        <View style={styles.searchContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Digite um jogo"
                                placeholderTextColor="#888"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {loading && !loadingMore && (
                            <ActivityIndicator size="large" color="#FFF" style={styles.feedbackSpace} />
                        )}

                        {error && <Text style={styles.errorText}>{error}</Text>}
                    </>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.gameCard}
                        onPress={() => handlePress(item)}
                    >
                        <Image
                            source={{ uri: item.background_image }}
                            style={styles.cardImage}
                            resizeMode="cover"
                        />
                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle} numberOfLines={2}>
                                {item.name}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loadingMore && !loading ? <ActivityIndicator size="small" color="#FFF" style={{ marginVertical: 20 }} /> : null
                }
            />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },

    keyboardView: {
        flex: 1,
    },

    scrollContent: {
        padding: 20,
    },

    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 20,
    },

    searchContainer: {
        width: '100%',
        marginBottom: 25,
    },

    input: {
        width: '100%',
        height: 50,
        backgroundColor: '#1A1A1A',
        borderRadius: 8,
        paddingHorizontal: 16,
        color: '#FFFFFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },

    feedbackSpace: {
        marginVertical: 20,
    },

    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        textAlign: 'center',
        marginVertical: 10,
    },

    gameCard: {
        flexDirection: 'row',
        backgroundColor: '#121212',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
    },

    separator: {
        height: 12,
    },

    cardImage: {
        width: 110,
        aspectRatio: 16 / 9,
        borderRadius: 6,
    },

    textContainer: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },

    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});