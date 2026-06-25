import * as Location from 'expo-location';

export interface RegiaoUsuario {
  cidade: string;
  estado: string;
}

export const obterRegiaoAproximada = async (): Promise<RegiaoUsuario | null> => {
  try {
    // 1. Solicita permissão de localização ao usuário
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permissão de localização negada');
    }

    // 2. Captura a coordenada com precisão BAIXA (consome menos bateria e é mais rápida)
    const localizacao = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });

    // 3. Transforma as coordenadas em endereço (Reverse Geocoding)
    const [endereco] = await Location.reverseGeocodeAsync({
      latitude: localizacao.coords.latitude,
      longitude: localizacao.coords.longitude,
    });

    if (endereco) {
      return {
        cidade: endereco.city || 'Cidade não encontrada',
        estado: endereco.region || 'Estado não encontrado',
      };
    }

    return null;
  } catch (error) {
    console.error("Erro ao obter geolocalização aproximada:", error);
    throw error;
  }
};