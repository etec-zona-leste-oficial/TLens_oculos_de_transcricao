// app/index.jsx
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Button,
  FlatList,
  PermissionsAndroid,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  DeviceEventEmitter
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router'; 
import bleService, { DISCONNECTED_EVENT } from '../src/services/BLEService'; 
import { ConnectionContext } from '../src/context/ConnectionContext';

const MY_DEVICES_KEY = 'my_t_lens_devices';

export default function ConnectionScreen() {
  const [myDevices, setMyDevices] = useState([]);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manuallyDisconnectedIds, setManuallyDisconnectedIds] = useState([]);
  
  const { connectedDevice, setConnectedDevice } = useContext(ConnectionContext);

  // Ouve por desconexões GLOBAIS
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(DISCONNECTED_EVENT, (event) => {
      const disconnectedId = event?.deviceId; 
      console.log(`INDEX: Recebido evento de desconexão de ${disconnectedId}. Limpando estado.`);
      
      if (disconnectedId) {
        setManuallyDisconnectedIds((prev) => [...prev, disconnectedId]);
      }

      setConnectedDevice(null);
      setIsLoading(false);
      // [REMOVIDO] router.push('/') - Não é mais necessário, já estamos aqui
      Alert.alert("Desconectado", "A conexão com o dispositivo foi perdida.");
    });

    return () => {
      subscription.remove();
    };
  }, []); // [REMOVIDO] router da dependência, não é necessário

  // Scan automático quando a tela entra em foco
  useFocusEffect(
    React.useCallback(() => {
      loadMyDevices().then((loadedDevices) => {
        if (connectedDevice) {
          console.log("Tela em foco, mas já conectado. Não vai escanear.");
          return;
        }
        console.log("Tela de Conexão em foco, iniciando scan...");
        startScan(loadedDevices || []); 
      });

      return () => {
        console.log("Tela de Conexão perdeu foco, parando scan.");
        bleService.stopScan();
        setIsScanning(false); 
      };
    }, [connectedDevice]) 
  );

  const loadMyDevices = async () => {
    try {
      const devicesJson = await AsyncStorage.getItem(MY_DEVICES_KEY);
      if (devicesJson) {
        const loaded = JSON.parse(devicesJson);
        setMyDevices(loaded);
        console.log("Dispositivos salvos carregados:", loaded);
        return loaded; 
      }
    } catch (e) {
      console.error("Falha ao carregar dispositivos salvos.", e);
    }
    return []; 
  };

  const saveDevice = async (device, key) => {
    try {
      const newDevice = {
        id: device.id,
        name: device.localName || device.name,
        pairingKey: key,
      };
      
      // [MODIFICADO] Atualiza myDevices usando o estado anterior para evitar race conditions
      setMyDevices((prevDevices) => {
        const otherDevices = prevDevices.filter(d => d.id !== newDevice.id);
        const updatedDevices = [...otherDevices, newDevice];
        
        // Salva no AsyncStorage
        AsyncStorage.setItem(MY_DEVICES_KEY, JSON.stringify(updatedDevices))
          .catch(e => console.error("Falha ao salvar dispositivo.", e));
          
        console.log("Novo dispositivo salvo:", newDevice);
        return updatedDevices;
      });

    } catch (e) {
      console.error("Falha ao preparar para salvar dispositivo.", e);
    }
  };

  // --- [NOVA FUNÇÃO] ---
  /**
   * Remove um dispositivo do AsyncStorage e do estado local.
   * Usado para "Esquecer" dispositivos.
   */
  const forgetDevice = async (deviceIdToForget) => {
    console.log(`INDEX: Esquecendo dispositivo ${deviceIdToForget}...`);
    try {
      // 1. Atualiza o estado local
      const updatedDevices = myDevices.filter(d => d.id !== deviceIdToForget);
      setMyDevices(updatedDevices);
      
      // 2. Atualiza o AsyncStorage
      await AsyncStorage.setItem(MY_DEVICES_KEY, JSON.stringify(updatedDevices));
      
      console.log(`INDEX: Dispositivo ${deviceIdToForget} esquecido.`);
      Alert.alert("Dispositivo Esquecido", "O dispositivo foi removido da sua lista.");

    } catch (e) {
      console.error("Falha ao esquecer dispositivo.", e);
      // Tenta recarregar o estado original em caso de falha
      loadMyDevices();
    }
  };
  // --- [FIM DA NOVA FUNÇÃO] ---

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      const coarseLocation = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION, { title: 'Permissão de Localização', message: 'O App precisa de acesso à localização para o scan BLE.', buttonPositive: 'OK' });
      const fineLocation = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, { title: 'Permissão de Localização Precisa', message: 'O App precisa de acesso à localização para o scan BLE.', buttonPositive: 'OK' });
      if (Platform.Version >= 31) {
        const scanPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, { title: 'Permissão de Scan BLE', message: 'O App precisa de permissão para procurar dispositivos BLE.', buttonPositive: 'OK' });
        const connectPermission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, { title: 'Permissão de Conexão BLE', message: 'O App precisa de permissão para se conectar a dispositivos BLE.', buttonPositive: 'OK' });
        return scanPermission === 'granted' && connectPermission === 'granted' && fineLocation === 'granted';
      }
      return coarseLocation === 'granted' && fineLocation === 'granted';
    }
    return true; 
  };

  const startScan = async (loadedMyDevices) => {
    if (connectedDevice) return; 

    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      Alert.alert("Permissões necessárias não foram concedidas.");
      return;
    }
    
    setIsScanning(true);
    setAvailableDevices([]); 
    
    bleService.scanForDevices((device) => {
      // Atualiza a lista de dispositivos salvos para o auto-connect
      const myCurrentDevices = loadedMyDevices || [];
      const pairedDevice = myCurrentDevices.find((d) => d.id === device.id);

      if (pairedDevice && !manuallyDisconnectedIds.includes(device.id)) {
        if (isLoading || connectedDevice) return; 

        console.log(`Dispositivo pareado ${pairedDevice.name} encontrado. Tentando autoconexão...`);
        bleService.stopScan();
        setIsScanning(false);
        handleConnectPaired(pairedDevice, true);
      } else {
        setAvailableDevices((prevDevices) => {
          const isAlreadyInList = prevDevices.find((d) => d.id === device.id);
          // [MODIFICADO] Usa myCurrentDevices aqui também
          const isAlreadyPaired = myCurrentDevices.some((d) => d.id === device.id);
          if (!isAlreadyInList && !isAlreadyPaired) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
      }
    });
  };
  
  const handleConnectAndPair = async (device) => {
    if (isLoading) return; 
    setIsLoading(true);
    
    try {
      const pairingKey = await bleService.connectAndPair(device.id);

      Alert.alert(
        "Pareado!",
        `Dispositivo ${device.localName} conectado e chave recebida.`
      );

      setConnectedDevice({ id: device.id, name: device.localName || device.name });
      
      await saveDevice(device, pairingKey);
      
      setAvailableDevices((prev) => prev.filter((d) => d.id !== device.id));
      router.push('/control');

    } catch (error) {
      Alert.alert("Falha no Pareamento", error.message);
      setConnectedDevice(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectPaired = async (device, isAutoConnect = false) => {
    if (isLoading) return; 
    setIsLoading(true);

    try {
      const connectedBleDevice = await bleService.connect(device.id, device.pairingKey);
      
      setConnectedDevice({ id: connectedBleDevice.id, name: connectedBleDevice.name });

      if (!isAutoConnect) { 
        Alert.alert(
          "Conectado!",
          `Conectado com sucesso ao ${connectedBleDevice.name}.`
        );
      }
      
      router.push('/control'); 

    } catch (error) {
      Alert.alert("Falha ao Conectar", error.message);
      setConnectedDevice(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (isLoading || !connectedDevice) return; 
    console.log("INDEX: Iniciando desconexão manual...");
    setIsLoading(true); 

    try {
      setManuallyDisconnectedIds((prev) => [...prev, connectedDevice.id]);
      await bleService.disconnect(true);
      setConnectedDevice(null);

    } catch (e) {
      console.error("INDEX: Erro ao tentar desconectar", e);
    } finally {
      setIsLoading(false);
    }
  };

  // [MODIFICADO] Botão de "Limpar" agora é "Esquecer"
  const handleForgetDevice = (device) => {
    if (connectedDevice?.id === device.id) {
      Alert.alert("Aviso", "Você não pode esquecer um dispositivo enquanto está conectado a ele. Por favor, desconecte-se primeiro ou use o botão 'Desparear' nas Configurações.");
      return;
    }

    Alert.alert(
      "Esquecer Dispositivo",
      `Tem certeza que quer esquecer o dispositivo "${device.name}"?\n\nIsso NÃO limpa a chave no Pi. Para isso, conecte-se e use o botão "Desparear" nas Configurações.`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Esquecer", 
          style: "destructive", 
          onPress: () => forgetDevice(device.id) // Chama a nova função
        }
      ]
    );
  };

  // --- COMPONENTES DE RENDERIZAÇÃO ---
  
  const renderAvailableDevice = ({ item }) => (
    <TouchableOpacity 
      style={styles.deviceItem}
      onPress={() => handleConnectAndPair(item)} 
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.deviceText}>{item.localName || item.name}</Text>
        <Text style={styles.deviceIdText}>{item.id}</Text>
      </View>
      <Button 
        title="Parear" 
        onPress={() => handleConnectAndPair(item)} 
        disabled={isLoading || connectedDevice != null} 
      />
    </TouchableOpacity>
  );

  const renderMyDevice = ({ item }) => {
    const isConnected = connectedDevice?.id === item.id;

    return (
      <View style={[styles.myDeviceItem, isConnected && styles.myDeviceConnected]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.deviceText}>{item.name} {isConnected ? "(Conectado)" : "(Salvo)"}</Text>
          <Text style={styles.deviceIdText}>{item.id}</Text>
        </View>
        
        {isConnected ? (
          <Button 
            title="Desconectar" 
            onPress={handleDisconnect}
            color="#c0392b" 
            disabled={isLoading} 
          />
        ) : (
          <View style={{flexDirection: 'row'}}>
            <Button 
              title="Esquecer"
              onPress={() => handleForgetDevice(item)}
              color="#888"
              disabled={isLoading || connectedDevice != null}
            />
            <View style={{width: 10}} />
            <Button 
              title="Conectar" 
              onPress={() => handleConnectPaired(item)}
              disabled={isLoading || connectedDevice != null} 
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>{isScanning ? 'Procurando...' : (connectedDevice ? 'Conectado' : 'Conectando...')}</Text>
        </View>
      )}

      {isScanning && !connectedDevice && !isLoading && (
        <Text style={styles.scanningText}>Procurando dispositivos...</Text>
      )}

      <Text style={styles.listTitle}>Meus Dispositivos</Text>
      <FlatList
        data={myDevices}
        keyExtractor={(item) => item.id}
        renderItem={renderMyDevice}
        ListEmptyComponent={<Text style={styles.emptyText}>Nenhum dispositivo pareado salvo.</Text>}
      />
      
      <Text style={styles.listTitle}>Dispositivos Disponíveis</Text>
      <FlatList
        data={availableDevices}
        keyExtractor={(item) => item.id}
        renderItem={renderAvailableDevice}
        ListEmptyComponent={!isScanning && !isLoading && <Text style={styles.emptyText}>Nenhum dispositivo novo encontrado.</Text>}
      />
    </View>
  );
}

// --- ESTILOS ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff', // Fundo branco
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  scanningText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#555',
    marginVertical: 10,
  },
  emptyText: {
    color: '#777',
    paddingHorizontal: 10,
    fontStyle: 'italic',
  },
  deviceItem: {
    padding: 15, // Mais padding
    backgroundColor: '#f9f9f9', // Cor mais clara
    marginBottom: 8, // Mais espaço
    borderRadius: 8, // Bordas arredondadas
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  myDeviceItem: {
    padding: 15,
    backgroundColor: '#f0f9f0', // Verde claro
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d0e0d0', // Borda verde
  },
  myDeviceConnected: {
    backgroundColor: '#e6f0ff', // Azul claro
    borderColor: '#c0d0e0', // Borda azul
  },
  deviceText: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1, 
  },
  deviceIdText: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});