import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  useWindowDimensions, // Importado para monitorar o tamanho da tela
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGamesByFilter } from "../../services/gameApi";
import { useRouter } from "expo-router";
import GameComponent from "../../components/game";
import { Ionicons } from '@expo/vector-icons';

interface Game {
  id: number;
  name: string;
  background_image: string;
  rating: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions(); // Pega a largura atual da tela
  const [sections, setSections] = useState<{ title: string; data: Game[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  const listRefs = [useRef<FlatList>(null), useRef<FlatList>(null), useRef<FlatList>(null)];
  const scrollPositions = useRef([0, 0, 0]);

  // Define se deve exibir as setas: precisa ser plataforma Web E ter largura de Desktop/Tablet (> 768px)
  const exibirSetas = Platform.OS === 'web' && width > 768;

  useEffect(() => {
    loadDefaultHome();
  }, []);

  async function loadDefaultHome() {
    setLoading(true);
    try {
      const pop = await getGamesByFilter("ordering=-added");
      const top = await getGamesByFilter("ordering=-metacritic");
      const act = await getGamesByFilter("genres=action");

      setSections([
        { title: "Populares", data: pop || [] },
        { title: "Melhores Avaliados", data: top || [] },
        { title: "Ação", data: act || [] },
      ]);
    } catch (globalError) {
      console.error("Erro ao carregar dados da Home:", globalError);
    } finally {
      setLoading(false);
    }
  }

  const handleScrollSetas = (index: number, direction: 'left' | 'right') => {
    const listRef = listRefs[index].current;
    if (!listRef) return;

    const scrollAmount = 400;
    let currentPos = scrollPositions.current[index];

    if (direction === 'left') {
      currentPos = Math.max(0, currentPos - scrollAmount);
    } else {
      currentPos = currentPos + scrollAmount;
    }

    scrollPositions.current[index] = currentPos;
    listRef.scrollToOffset({ offset: currentPos, animated: true });
  };

  const goToGameDetails = (game: any) => {
    router.push({
      pathname: "/gameDetails",
      params: {
        id: game.id.toString(),
        name: game.name,
        background_image: game.background_image,
      },
    });
  };

  const renderGameCard = ({ item }: { item: Game }) => (
    <TouchableOpacity style={styles.card} onPress={() => goToGameDetails(item)}>
      <Image
        source={{ uri: item.background_image || "https://via.placeholder.com/150" }}
        style={styles.poster}
      />
      <Text style={styles.gameName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.rating}>⭐ {item.rating?.toFixed(1) || "N/A"}</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.webCenteringWrapper}>
        
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => setShowSearch(false)} activeOpacity={0.7}>
            <Text style={styles.headerTitle}>
              {showSearch ? "Buscar Jogo" : "Gamind_"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggleSearchBtn}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showSearch ? "close" : "search"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>

        {showSearch ? (
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <GameComponent onGamePress={goToGameDetails} />
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {sections.map((section, index) => (
              <View key={index} style={styles.rowContainer}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                
                <View style={styles.listWrapper}>
                  {/* Seta Esquerda condicional baseada no tamanho da tela */}
                  {exibirSetas && (
                    <TouchableOpacity 
                      style={[styles.setaContainer, styles.setaEsquerda]} 
                      onPress={() => handleScrollSetas(index, 'left')}
                    >
                      <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}

                  <FlatList
                    ref={listRefs[index]}
                    data={section.data}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderGameCard}
                    contentContainerStyle={styles.flatListContent}
                    onScroll={(e) => {
                      scrollPositions.current[index] = e.nativeEvent.contentOffset.x;
                    }}
                    scrollEventThrottle={16}
                  />

                  {/* Seta Direita condicional baseada no tamanho da tela */}
                  {exibirSetas && (
                    <TouchableOpacity 
                      style={[styles.setaContainer, styles.setaDireita]} 
                      onPress={() => handleScrollSetas(index, 'right')}
                    >
                      <Ionicons name="chevron-forward" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#050505" 
  },
  webCenteringWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 1200 : '100%',
    alignSelf: 'center',
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center", 
    backgroundColor: "#050505" 
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 20
  },
  toggleSearchBtn: {
    backgroundColor: '#1A1A1A',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'web' ? 100 : 120, 
  },
  rowContainer: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginLeft: 20, marginBottom: 15 },
  
  listWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  flatListContent: {
    paddingLeft: 20, 
    paddingBottom: 10,
    ...Platform.select({
      web: {
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      } as any
    })
  },
  card: { width: 140, marginRight: 15 },
  poster: { width: 140, height: 190, borderRadius: 12 },
  gameName: { color: "#fff", marginTop: 8, fontSize: 13, fontWeight: "600" },
  rating: { color: "#007AFF", fontSize: 11, marginTop: 2 },

  setaContainer: {
    position: 'absolute',
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#333',
    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)', 
  },
  setaEsquerda: {
    left: 5,
  },
  setaDireita: {
    right: 5,
  }
});