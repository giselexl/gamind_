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
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getGameDetails } from '../services/gameApi';
import { Stack } from 'expo-router';

export default function GameDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [expanded, setExpanded] = useState<boolean>(false);
    const { id, name, background_image } = params;
    const [description, setDescription] = useState<string>("");
    const [loadingDetails, setLoadingDetails] = useState<boolean>(true);

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

    return (
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
                        <Text
                            style={styles.descriptionText}
                            numberOfLines={expanded ? undefined : 3}
                        >
                            {description}
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnAvaliar} onPress={abrirTelaAvaliacao} activeOpacity={0.8}>
                    <Text style={styles.btnTexto}>Avaliar Jogo</Text>
                </TouchableOpacity>

            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    headerBackground: {
        width: '100%',
        height: Platform.OS === 'web' ? 300 : 250,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 20 : 50,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 8,
        borderRadius: 20,
        zIndex: 10,
    },
    posterContainer: {
        position: 'absolute',
        bottom: -60,
        alignSelf: 'center',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 15,
    },
    posterImage: {
        width: Platform.OS === 'web' ? 150 : 130,
        aspectRatio: 3 / 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#1A1A1A',
    },
    content: {
        paddingHorizontal: 24,
        alignItems: 'center',
        marginTop: 80,
    },
    titulo: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 20,
    },
    descriptionContainer: {
        width: '100%',
        backgroundColor: '#111111',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1A1A1A',
        marginBottom: 25,
        minHeight: 80,
        justifyContent: 'center'
    },
    descriptionText: {
        color: '#BBBBBB',
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'justify',
    },
    btnAvaliar: {
        width: '100%',
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    btnTexto: {
        color: '#ffffff',
        fontWeight: 'bold',
        fontSize: 16
    }
});