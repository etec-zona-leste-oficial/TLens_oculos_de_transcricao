// app/wifi.jsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, SectionList, TouchableOpacity, TextInput, 
  Alert, ActivityIndicator, Modal, Button, DeviceEventEmitter, 
  RefreshControl, Switch, Keyboard
} from 'react-native';
import { router } from 'expo-router';
import bleService, { WIFI_EVENT } from '../src/services/BLEService';

export default function WifiScreen() {
  const [networks, setNetworks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [password, setPassword] = useState('');

  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configNetwork, setConfigNetwork] = useState(null);
  const [configAutoconnect, setConfigAutoconnect] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(WIFI_EVENT, (data) => {
      
      if (data.type === 'WIFI_LIST') {
        console.log("WIFI_LIST recebida:", data.payload);
        setNetworks(data.payload);
        setIsLoading(false);
        setIsRefreshing(false);
      } 
      
      else if (data.type === 'WIFI_STATUS') {
        setIsLoading(false); // <-- Libera os botões
        setPasswordModalVisible(false);
        setPassword('');
        
        if (data.payload.success) {
            Alert.alert("Sucesso", `Conectado a ${data.payload.ssid}!`);
            setNetworks(prevNetworks => 
              prevNetworks.map(net => {
                net.is_active = false;
                if (net.ssid === data.payload.ssid) {
                  net.is_active = true;
                  net.is_saved = true;
                  net.conn_name = data.payload.conn_name;
                  net.autoconnect = data.payload.autoconnect;
                }
                return net;
              })
            );
        } else {
            const ssid = data.payload.ssid || 'rede desconhecida';
            const rawError = data.payload.msg || "Falha desconhecida";
            const userMessage = `Não foi possível conectar a rede "${ssid}".`;
            console.log(`WIFI_STATUS: Erro ao conectar. Mensagem do Pi: ${rawError}`);
            Alert.alert("Erro na Conexão", userMessage);
        }
      }
    });
    
    requestScan();
    return () => sub.remove();
  }, []);

  const requestScan = async () => {
    if (isLoading) return; // Não deixa escanear se já estiver carregando
    setIsLoading(true);
    setNetworks([]);
    try {
      await bleService.sendCommand({ type: 'WIFI_SCAN', payload: {} });
    } catch (e) {
      setIsLoading(false);
      setIsRefreshing(false);
      Alert.alert("Erro", "Falha ao solicitar scan.");
    }
  };
  
  const onRefresh = () => {
    if (isLoading) return; // Não deixa dar refresh se estiver carregando
    setIsRefreshing(true);
    requestScan();
  };

  const connectToSavedNetwork = async (network) => {
    if (isLoading || !network) return; // <-- Bloqueia aqui
    setIsLoading(true); // <-- Trava os botões
    try {
      await bleService.sendCommand({
        type: 'WIFI_CONNECT',
        payload: { ssid: network.ssid, psk: '' }
      });
    } catch (e) {
      setIsLoading(false); // Libera se der erro
      Alert.alert("Erro", "Falha ao enviar comando de conexão.");
    }
  };

  const connectWithPassword = async () => {
    if (isLoading || !selectedNetwork) return; // <-- Bloqueia aqui

    Keyboard.dismiss();
    setPasswordModalVisible(false);

    setIsLoading(true); // <-- Trava os botões
    try {
      await bleService.sendCommand({
        type: 'WIFI_CONNECT',
        payload: { ssid: selectedNetwork.ssid, psk: password }
      });
    } catch (e) {
      setIsLoading(false); // Libera se der erro
      Alert.alert("Erro", "Falha ao enviar comando de conexão.");
    }
  };
  

  const forgetNetwork = async (network) => {
    if (isLoading || !network || !network.conn_name) return; // <-- Bloqueia aqui
    
    Alert.alert(
      "Esquecer Rede",
      `Tem certeza que quer esquecer a rede "${network.ssid}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Esquecer", 
          style: "destructive", 
          onPress: async () => {
            setIsLoading(true); // <-- Trava os botões
            try {
              await bleService.sendCommand({
                type: 'WIFI_FORGET',
                payload: { conn_name: network.conn_name }
              });
              setConfigModalVisible(false);
              setNetworks(prev => prev.map(n => 
                n.conn_name === network.conn_name 
                ? { ...n, is_saved: false, is_active: false, autoconnect: false, conn_name: null } 
                : n
              ));
              // O Pi vai enviar um WIFI_LIST que vai destravar o isLoading
              requestScan(); // Pede um novo scan para destravar
            } catch (e) {
              setIsLoading(false); // Libera se der erro
              Alert.alert("Erro", "Falha ao enviar comando para esquecer.");
            }
          }
        }
      ]
    );
  };
  
  const toggleAutoconnect = async (network, newValue) => {
    // Esta ação é rápida, não precisa travar a UI inteira
    if (!network || !network.conn_name) return;
    setConfigAutoconnect(newValue);
    setNetworks(prev => prev.map(n => 
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

  const handleNetworkPress = (network) => {
    if (isLoading) return; // Bloqueio principal
    
    if (network.is_active) {
      handleConfigPress(network);
    } else if (network.is_saved) {
      connectToSavedNetwork(network); 
    } else {
      setSelectedNetwork(network);
      setPasswordModalVisible(true);
    }
  };

  const handleConfigPress = (network) => {
    if (isLoading) return; // Bloqueio principal
    setConfigNetwork(network);
    setConfigAutoconnect(network.autoconnect);
    setConfigModalVisible(true);
  };

  // --- Organização dos Dados (SectionList) ---
  const sections = React.useMemo(() => {
    const active = [];
    const saved = [];
    const available = [];

    networks.forEach(net => {
      if (net.is_active) {
        active.push(net);
      } else if (net.is_saved) {
        saved.push(net);
      } else {
        available.push(net);
      }
    });

    saved.sort((a, b) => b.signal - a.signal);
    available.sort((a, b) => b.signal - a.signal);

    const s = [];
    
    if (active.length > 0) {
      s.push({ title: "Rede Atual", data: active });
    }
    if (saved.length > 0) {
      s.push({ title: "Redes Salvas", data: saved });
    }
    if (available.length > 0) {
      s.push({ title: "Redes Disponíveis", data: available });
    }
    return s;
  }, [networks]);

  // --- Componentes de Renderização ---

  const renderItem = ({ item }) => (
    <View style={[
      styles.netItem, 
      item.is_active && styles.activeItem,
      isLoading && styles.disabledItem // [NOVO] Estilo para item desabilitado
    ]}>
      <TouchableOpacity 
        style={styles.netItemClickable} 
        onPress={() => handleNetworkPress(item)}
        disabled={isLoading} // [A CORREÇÃO]
      >
        <Text style={[styles.ssid, item.is_active && styles.activeSsid]}>{item.ssid}</Text>
        <Text style={styles.details}>
          {item.is_active ? "Conectado" : (item.is_saved ? "Salva" : `Sinal: ${item.signal}% | ${item.security || 'Aberta'}`)}
        </Text>
      </TouchableOpacity>
      
      {item.is_saved && (
        <TouchableOpacity 
          style={styles.configButton} 
          onPress={() => handleConfigPress(item)}
          disabled={isLoading} // [A CORREÇÃO]
        >
          <Text style={styles.configButtonText}>⚙️</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* [MODIFICADO] Mostra o loading no topo, fora da lista */}
      {isLoading && !isRefreshing && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text style={styles.loadingText}>Processando...</Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.ssid}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        ListEmptyComponent={!isLoading && <Text style={styles.emptyText}>Nenhuma rede encontrada.</Text>}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            enabled={!isLoading} // [A CORREÇÃO]
          />
        }
        ListFooterComponent={
          <TouchableOpacity 
            style={[styles.manageButton, isLoading && styles.disabledItem]} // [NOVO] Estilo
            onPress={() => router.push('/saved_networks')}
            disabled={isLoading} // [A CORREÇÃO]
          >
            <Text style={styles.manageButtonText}>Gerenciar redes salvas</Text>
          </TouchableOpacity>
        }
      />

      {/* --- Modais --- */}
      {/* O React já bloqueia a UI atrás de um modal, então não precisamos
          desabilitar os botões "Cancelar" ou "Conectar" neles. */}

      <Modal visible={passwordModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Conectar a {selectedNetwork?.ssid}</Text>
            <TextInput style={styles.input} placeholder="Senha da Rede" secureTextEntry value={password} onChangeText={setPassword}/>
            <View style={styles.modalButtons}>
                <Button title="Cancelar" color="red" onPress={() => setPasswordModalVisible(false)} />
                <Button title="Conectar" onPress={connectWithPassword} />
            </View>
          </View>
        </View>
      </Modal>

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
                  // Desabilita o switch se uma operação maior estiver em andamento
                  disabled={isLoading} 
                />
              </View>
              <Button 
                title="Esquecer Rede" 
                color="red" 
                onPress={() => forgetNetwork(configNetwork)} 
                disabled={isLoading} // [A CORREÇÃO]
              />
              <View style={{marginTop: 10}}>
                <Button 
                  title="Fechar" 
                  onPress={() => setConfigModalVisible(false)} 
                  disabled={isLoading} // [A CORREÇÃO]
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loading: { 
    padding: 10, 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'center',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#eee'
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333'
  },
  emptyText: { textAlign: 'center', marginTop: 20, color: 'gray' },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 10,
  },
  netItem: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeItem: {
    backgroundColor: '#e6f0ff',
  },
  disabledItem: { // [NOVO]
    backgroundColor: '#f0f0f0', // Fica cinza
    opacity: 0.6, // Fica semi-transparente
  },
  netItemClickable: { flex: 1 },
  ssid: { fontSize: 17, color: '#000' },
  activeSsid: {
    color: '#0055cc',
    fontWeight: 'bold',
  },
  details: { color: 'gray', fontSize: 13, marginTop: 2 },
  configButton: { paddingHorizontal: 15, paddingVertical: 5 },
  configButtonText: { fontSize: 24, color: '#555' },
  modalContainer: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10 },
  modalTitle: { fontSize: 18, marginBottom: 15, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 5, padding: 10, marginBottom: 20, color: 'black' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  configLabel: { fontSize: 16 },
  manageButton: {
    backgroundColor: 'white',
    padding: 15,
    margin: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee'
  },
  manageButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  }
});