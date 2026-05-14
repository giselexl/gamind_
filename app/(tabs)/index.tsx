import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getGamesByFilter, searchGames } from "../../services/gameApi";

interface Game {
  id: number;
  name: string;
  background_image: string;
  rating: number;
}

export default function HomeScreen() {
  const [sections, setSections] = useState<{ title: string; data: Game[] }[]>(
    [],
  );
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

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

  async function handleSearch() {
    if (searchQuery.trim() === "") {
      setIsSearching(false);
      return;
    }
    setLoading(true);
    setIsSearching(true);
    const results = await searchGames(searchQuery);
    setSearchResults(results);
    setLoading(false);
  }

  const renderGameCard = ({ item }: { item: Game }) => (
    <View style={styles.card}>
      <Image
        source={{
          uri: item.background_image || "https://via.placeholder.com/150",
        }}
        style={styles.poster}
      />
      <Text style={styles.gameName} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={styles.rating}>⭐ {item.rating?.toFixed(1) || "N/A"}</Text>
    </View>
  );

  if (loading && !isSearching) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Gamind</Text>

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquise aqui..."
          placeholderTextColor="#050505"/// tem mudar aqui depois
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        {isSearching && (
          <TouchableOpacity
            onPress={() => {
              setIsSearching(false);
              setSearchQuery("");
            }}
          >
            <Text style={styles.clearText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={[styles.card, { width: "45%", marginBottom: 20 }]}>
              <Image
                source={{ uri: item.background_image }}
                style={[styles.poster, { width: "100%" }]}
              />
              <Text style={styles.gameName}>{item.name}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
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
  container: { flex: 1, backgroundColor: "#050505", paddingTop: 60 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050505",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 20,
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#050505", /// tem mudar aqui depois
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  clearText: { color: "#007AFF", marginLeft: 15, fontWeight: "bold" },
  rowContainer: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 20,
    marginBottom: 15,
  },
  card: { width: 140, marginRight: 15 },
  poster: { width: 140, height: 190, borderRadius: 12 },
  gameName: { color: "#fff", marginTop: 8, fontSize: 13, fontWeight: "600" },
  rating: { color: "#007AFF", fontSize: 11, marginTop: 2 },
});
