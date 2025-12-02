// app/saved_networks.jsx
import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  Alert, ActivityIndicator, Modal, Button, DeviceEventEmitter, Switch 
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import bleService, { WIFI_EVENT } from '../src/services/BLEService';

export default function SavedNetworksScreen() {
  const [savedNetworks, setSavedNetworks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // --- Estados do Modal de Configurações ---
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configNetwork, setConfigNetwork] = useState(null);
  const [configAutoconnect, setConfigAutoconnect] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      // 1. Ouve por eventos
      const sub = DeviceEventEmitter.addListener(WIFI_EVENT, (data) => {
        if (data.type === 'SAVED_NETWORKS_LIST') {
          console.log("SAVED_NETWORKS_LIST recebida:", data.payload);
          setSavedNetworks(data.payload);
          setIsLoading(false);
        }
      });

      // 2. Pede a lista ao entrar na tela
      requestSavedNetworks();

      // 3. Limpa ao sair
      return () => sub.remove();
    }, [])
  );

  const requestSavedNetworks = async () => {
    setIsLoading(true);
    setSavedNetworks([]);
    try {
      await bleService.sendCommand({ type: 'GET_SAVED_NETWORKS', payload: {} });
    } catch (e) {
      setIsLoading(false);
      Alert.alert("Erro", "Falha ao solicitar redes salvas.");
    }
  };

  // --- Ações do Modal ---

  const forgetNetwork = async (network) => {
    if (!network || !network.conn_name) return;
    Alert.alert(
      "Esquecer Rede",
      `Tem certeza que quer esquecer a rede "${network.ssid}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Esquecer", 
          style: "destructive", 
          onPress: async () => {
            try {
              await bleService.sendCommand({
                type: 'WIFI_FORGET',
                payload: { conn_name: network.conn_name }
              });
              setConfigModalVisible(false);
              // Remove da lista local e espera o Pi confirmar
              setSavedNetworks(prev => prev.filter(n => n.conn_name !== network.conn_name));
            } catch (e) {
              Alert.alert("Erro", "Falha ao enviar comando para esquecer.");
            }
          }
        }
      ]
    );
  };
  
  const toggleAutoconnect = async (network, newValue) => {
    if (!network || !network.conn_name) return;
    setConfigAutoconnect(newValue);
    // Atualiza o estado local
    setSavedNetworks(prev => prev.map(n => 
      n.conn_name === network.conn_name ? { ...n, autoconnect: newValue } : n
    ));
    try {
      await bleService.sendCommand({
        type: 'WIFI_SET_AUTOCONNECT',
        payload: { conn_name: network.conn_name, value: newValue }
      });
    } catch (e) {
      Alert.alert("Erro", "Falha ao enviar comando de autoconexão.");
    }
  };

  // --- Handlers de UI ---

  const handleConfigPress = (network) => {
    setConfigNetwork(network);
    setConfigAutoconnect(network.autoconnect); // Agora temos o valor real
    setConfigModalVisible(true);
  };

  // --- Componentes de Renderização ---

  const renderItem = ({ item }) => (
    <View style={styles.netItem}>
      <TouchableOpacity style={styles.netItemClickable} onPress={() => handleConfigPress(item)}>
        <Text style={styles.ssid}>{item.ssid}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.configButton} onPress={() => handleConfigPress(item)}>
        <Text style={styles.configButtonText}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading && <ActivityIndicator size="large" color="#0000ff" style={styles.loading} />}

      <FlatList
        data={savedNetworks}
        keyExtractor={(item) => item.conn_name}
        renderItem={renderItem}
        ListEmptyComponent={!isLoading && <Text style={styles.emptyText}>Nenhuma rede salva encontrada.</Text>}
      />

      {/* --- Modal de Configurações --- */}
      {configNetwork && (
        <Modal visible={configModalVisible} transparent animationType="slide">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{configNetwork.ssid}</Text>
              
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Conexão automática</Text>
                <Switch
                  value={configAutoconnect}
                  onValueChange={(newValue) => toggleAutoconnect(configNetwork, newValue)}
                />
              </View>

              <Button 
                title="Esquecer Rede" 
                color="red" 
                onPress={() => forgetNetwork(configNetwork)} 
              />
              
              <Button 
                title="Fechar" 
                onPress={() => setConfigModalVisible(false)} 
                style={{marginTop: 10}}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// --- Estilos (copiados do wifi.jsx, mas simplificados) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loading: { marginVertical: 20 },
  emptyText: { textAlign: 'center', marginTop: 20, color: 'gray' },
  netItem: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  netItemClickable: { flex: 1 },
  ssid: { fontSize: 18 },
  configButton: { paddingHorizontal: 15, paddingVertical: 5 },
  configButtonText: { fontSize: 24, color: '#555' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 18, marginBottom: 15, fontWeight: 'bold' },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  configLabel: { fontSize: 16 }
});