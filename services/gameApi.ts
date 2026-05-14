// services/gameApi.ts
const RAWG_KEY = process.env.EXPO_PUBLIC_RAWG_API_KEY;
const BASE_URL = "https://api.rawg.io/api";

export const getGamesByFilter = async (params: string) => {
  try {
    const url = `${BASE_URL}/games?key=${RAWG_KEY}&${params}&page_size=10`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Erro ao buscar games:", error);
    return [];
  }
};

export const getRandomGames = async () => {
  try {
    // Busca 5 jogos aleatórios para preencher o perfil
    const url = `${BASE_URL}/games?key=${RAWG_KEY}&page_size=5&ordering=-rating`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error("Erro ao buscar jogos para o perfil:", error);
    return [];
  }
};

// services/gameApi.ts

// ... (mantenha as outras funções)

export const getGameDetails = async (id: number) => {
  try {
    const url = `${BASE_URL}/games/${id}?key=${RAWG_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Erro ao buscar detalhes do jogo:", error);
    return null;
  }
};



export const searchGames = async (query: string) => {
  try {
    const url = `${BASE_URL}/games?key=${RAWG_KEY}&search=${query}&page_size=10`;
    const response = await fetch(url);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Erro ao pesquisar jogos:", error);
    return [];
  }
};