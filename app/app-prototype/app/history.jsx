// app/history.jsx
import React, { useContext } from 'react'; // 1. Importe o useContext
import { View, Text, StyleSheet, FlatList, SafeAreaView } from 'react-native';
import { ConnectionContext } from '../src/context/ConnectionContext'; // 2. Importe o Contexto

export default function HistoryScreen() {
  // 3. Pegue o histórico do contexto
  const { history } = useContext(ConnectionContext);

  // 4. Função para renderizar cada card
  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardText}>{item.text}</Text>
      <Text style={styles.cardTimestamp}>
        {/* Formata a data para ficar legível */}
        {new Date(item.timestamp).toLocaleString('pt-BR')}
      </Text>
    </View>
  );

  return (
    // 5. Use SafeAreaView e FlatList
    <SafeAreaView style={styles.container}>
      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <Text style={styles.title}>Histórico de Transcrição</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma transcrição salva ainda.</Text>
        }
      />
    </SafeAreaView>
  );
}

// 6. Novos estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5', // Um fundo suave
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  cardText: {
    fontSize: 16,
    marginBottom: 10,
  },
  cardTimestamp: {
    fontSize: 12,
    color: 'gray',
    textAlign: 'right',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: 'gray',
  },
});