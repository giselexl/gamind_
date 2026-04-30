import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';

export default function Login() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Perfil</Text>
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
});