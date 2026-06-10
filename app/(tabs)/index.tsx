import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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
  const [sections, setSections] = useState<{ title: string; data: Game[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadDefaultHome();
  }, []);

  async function loadDefaultHome() {
    setLoading(true);
    const [pop, top, act] = await Promise.all([
      getGamesByFilter("ordering=-added"),
      getGamesByFilter("ordering=-metacritic"),
      getGamesByFilter("genres=action"),
    ]);
    setSections([
      { title: "🔥 Populares", data: pop },
      { title: "🏆 Melhores Avaliados", data: top },
      { title: "⚔️ Ação", data: act },
    ]);
    setLoading(false);
  }

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
    <View style={styles.container}>

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
        <ScrollView showsVerticalScrollIndicator={false}>
          {sections.map((section, index) => (
            <View key={index} style={styles.rowContainer}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <FlatList
                data={section.data}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderGameCard}
                contentContainerStyle={{ paddingLeft: 20 }}
              />
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050505", paddingTop: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#050505" },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
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
  toggleText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  rowContainer: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#fff", marginLeft: 20, marginBottom: 15 },
  card: { width: 140, marginRight: 15 },
  poster: { width: 140, height: 190, borderRadius: 12 },
  gameName: { color: "#fff", marginTop: 8, fontSize: 13, fontWeight: "600" },
  rating: { color: "#007AFF", fontSize: 11, marginTop: 2 },
});