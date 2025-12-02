// src/context/ConnectionContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import bleService, { CONFIG_EVENT, HISTORY_EVENT } from '../services/BLEService';

export const ConnectionContext = createContext(null);

const MY_DEVICES_KEY = 'my_t_lens_devices';

const HISTORY_STORAGE_KEY = 'my_t_lens_history';

const TELEPROMPTER_CONFIG_KEY = 'teleprompter_config_v2'; 

export const ConnectionProvider = ({ children }) => {
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [history, setHistory] = useState([]);
  const [isTeleprompterActive, setIsTeleprompterActive] = useState(false);

  const [deviceSettings, setDeviceSettings] = useState({
    brightness: 100,
    fontsize: 10,
    language: 'pt',
    clock_format: '24h',
    screen_swap: false,
    delay_entre_palavras_seg: 0.5,
    tempo_limpar_tela_seg: 5.0,
    device_name: 'TLens',
    is_muted: false,
    screens_on: true,
  });

  // ... (Hooks useEffect de histórico e config permanecem os mesmos) ...
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyJson = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
        if (historyJson) {
          setHistory(JSON.parse(historyJson));
          console.log('🧠 [Context] Histórico carregado do AsyncStorage.');
        }
      } catch (e) {
        console.error('🧠 [Context] Falha ao carregar histórico.', e);
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    // Se o dispositivo for desconectado, reseta o estado do teleprompter
    if (!connectedDevice) {
      setIsTeleprompterActive(false);
    }
  }, [connectedDevice]);

  const updateStorageAndStateName = async (newFullName) => {
    // Só roda se tivermos um ID de dispositivo para usar como chave
    if (!connectedDevice?.id) {
      console.warn('🧠 [Context] Queria atualizar nome, mas connectedDevice.id é nulo.');
      return; 
    }

    const currentId = connectedDevice.id;
    console.log(`🧠 [Context] Atualizando nome em AsyncStorage para ID ${currentId}...`);
    
    try {
      // 1. Atualiza o AsyncStorage
      const devicesJson = await AsyncStorage.getItem(MY_DEVICES_KEY);
      if (devicesJson) {
        let devices = JSON.parse(devicesJson);
        const deviceIndex = devices.findIndex(d => d.id === currentId);
        
        if (deviceIndex !== -1) {
          // Atualiza o nome no array e salva de volta
          devices[deviceIndex].name = newFullName;
          await AsyncStorage.setItem(MY_DEVICES_KEY, JSON.stringify(devices));
          console.log(`🧠 [Context] AsyncStorage atualizado para: ${newFullName}`);
        } else {
          console.warn(`🧠 [Context] Não achou o device ${currentId} no storage para atualizar nome.`);
        }
      }

      // 2. Atualiza o estado do 'connectedDevice' no contexto
      setConnectedDevice((prev) => {
        if (prev && prev.id === currentId) {
          return { ...prev, name: newFullName };
        }
        return prev;
      });

    } catch (e) {
      console.error("🧠 [Context] Falha ao atualizar nome no AsyncStorage:", e);
    }
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(CONFIG_EVENT, (data) => {
      try {
        if (!data) return;
        
        if (data.type === 'INITIAL_SETTINGS') {
          console.log('🧠 [Context] INITIAL_SETTINGS recebidas:', data.payload);
          setDeviceSettings((prev) => ({ ...prev, ...data.payload }));
        } 
        
        else if (data.type === 'SYNC_SETTING') {
          console.log(`🧠 [Context] SYNC_SETTING: ${data.payload.key} = ${data.payload.value}`);
          setDeviceSettings((prev) => ({ ...prev, [data.payload.key]: data.payload.value }));
        } 
        
        else if (data.type === 'STATUS_UPDATE') {
          console.log('🧠 [Context] STATUS_UPDATE:', data.payload);
          
          // 1. Salva o payload (ex: is_muted) no deviceSettings
          setDeviceSettings((prev) => ({ ...prev, ...data.payload }));

          // [LÓGICA PRINCIPAL AQUI]
          // 2. Verifica se o Pi mandou o novo nome completo
          if (data.payload.new_full_name) {
            const newFullName = data.payload.new_full_name;
            console.log(`🧠 [Context] Recebido novo nome completo: ${newFullName}`);
            
            // 3. Chama nossa nova função
            updateStorageAndStateName(newFullName);
          }
        }
      } catch (err) {
        console.error('Erro ao processar evento CONFIG_EVENT:', err);
      }
    });

    const historySubscription = DeviceEventEmitter.addListener(HISTORY_EVENT, async (data) => {
      try {
        if (data?.type === 'TRANSCRIPTION_RESULT' && data.payload?.text) {
          const text = data.payload.text;
          console.log(`🧠 [Context] HISTORY_EVENT recebido: "${text}"`);
          
          // Cria o novo item
          const newItem = {
            id: Date.now().toString(), // ID único para o FlatList
            text: text,
            timestamp: new Date().toISOString(), // Salva a data/hora
          };

          // Atualiza o estado (coloca o mais novo no topo)
          const updatedHistory = [newItem, ...history];
          setHistory(updatedHistory);

          // Salva a lista inteira de volta no AsyncStorage
          await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
        }
      } catch (e) {
        console.error('🧠 [Context] Falha ao salvar item do histórico.', e);
      }
    });

    return () => {
      subscription.remove();
      historySubscription.remove();
    };
  }, [connectedDevice, history]);


  // ... (funções updateSetting, sendMuteToggle, etc. permanecem as mesmas) ...
  const updateSetting = async (key, value) => {
    console.log(`⚙️ [Context] updateSetting: ${key} = ${value}`);
    setDeviceSettings((prev) => ({ ...prev, [key]: value }));
    try {
      await bleService.sendCommand({
        type: 'APPLY_SETTING',
        payload: { key, value },
      });
    } catch (e) {
      console.error('Falha ao enviar configuração BLE:', e);
    }
  };

  const sendMuteToggle = async () => {
    try {
      await bleService.sendCommand({
        type: 'TOGGLE_MUTE',
        payload: {},
      });
    } catch (e) {
      console.error('Falha ao enviar comando de Mudo:', e);
    }
  };

  const sendScreensToggle = async () => {
    console.log('⚙️ [Context] sendScreensToggle: Enviando comando TOGGLE_SCREENS...');
    try {
      await bleService.sendCommand({
        type: 'TOGGLE_SCREENS',
        payload: {}, // O Pi só precisa saber que o evento rolou
      });
    } catch (e) {
      console.error('Falha ao enviar comando de Telas:', e);
    }
  };

  const sendTeleprompterStart = async (payload) => {
    console.log(`⚙️ [Context] sendTeleprompterStart: Enviando payload...`);
    try {
      await bleService.sendCommand({
        type: 'TELEPROMPTER_START',
        payload: payload, // Agora sim, usa o payload que o teleprompter.jsx montou
      });
      setIsTeleprompterActive(true);
    } catch (e) {
      console.error('Falha ao enviar comando de Teleprompter Start:', e);
    }
  };

  /**
   * Envia o comando para PARAR o teleprompter no Pi.
   */
  const sendTeleprompterStop = async () => {
    console.log(`⚙️ [Context] sendTeleprompterStop: Parando...`);
    try {
      await bleService.sendCommand({
        type: 'TELEPROMPTER_STOP',
        payload: {}, // O Pi só precisa saber que o evento rolou
      });
      setIsTeleprompterActive(false);
    } catch (e) {
      console.error('Falha ao enviar comando de Teleprompter Stop:', e);
    }
  };

  // --- [NOVA FUNÇÃO] ---
  /**
   * Envia o comando de despareamento para o Pi, se desconecta
   * e remove o dispositivo do AsyncStorage.
   */
  const unpairAndDisconnect = async () => {
    if (!connectedDevice) {
      console.warn('🧠 [Context] Tentou desparear, mas nada está conectado.');
      return;
    }
    
    const deviceIdToForget = connectedDevice.id;
    console.log(`🧠 [Context] Iniciando despareamento para ${deviceIdToForget}...`);

    try {
      // 1. Manda o comando para o Pi limpar a chave
      await bleService.sendCommand({ type: 'UNPAIR', payload: {} });
      console.log('🧠 [Context] Comando UNPAIR enviado.');

      // 2. Desconecta manualmente (isManual = true)
      await bleService.disconnect(true);
      console.log('🧠 [Context] Desconexão manual forçada.');
      
      // 3. Remove do AsyncStorage
      const devicesJson = await AsyncStorage.getItem(MY_DEVICES_KEY);
      if (devicesJson) {
        let devices = JSON.parse(devicesJson);
        const updatedDevices = devices.filter(d => d.id !== deviceIdToForget);
        await AsyncStorage.setItem(MY_DEVICES_KEY, JSON.stringify(updatedDevices));
        console.log(`🧠 [Context] Dispositivo ${deviceIdToForget} removido do AsyncStorage.`);
      }

      // 4. Limpa o estado do contexto
      setConnectedDevice(null);
      
    } catch (e) {
      console.error('🧠 [Context] Erro durante o processo de despareamento:', e);
      // Mesmo se falhar, força a desconexão e limpeza local
      await bleService.disconnect(true);
      setConnectedDevice(null);
    }
  };
  // --- [FIM DA NOVA FUNÇÃO] ---

  const clearAppCache = async () => {
    console.log('🧠 [Context] Iniciando limpeza de cache...');
    try {
      // 1. Remove os itens do AsyncStorage
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
      await AsyncStorage.removeItem(TELEPROMPTER_CONFIG_KEY);
      
      // 2. Limpa o estado local (histórico)
      setHistory([]);

      console.log('🧠 [Context] Cache (Histórico e Teleprompter) limpo com sucesso.');
      return true; // Retorna sucesso
    } catch (e) {
      console.error('🧠 [Context] Erro ao limpar cache:', e);
      return false; // Retorna falha
    }
  };

  return (
    <ConnectionContext.Provider
      value={{
        connectedDevice,
        setConnectedDevice,
        deviceSettings,
        updateSetting,
        sendMuteToggle,
        sendScreensToggle,
        history,
        sendTeleprompterStart,
        sendTeleprompterStop,
        isTeleprompterActive,
        unpairAndDisconnect,
        clearAppCache,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) throw new Error('useConnection deve ser usado dentro de um ConnectionProvider');
  return context;
};