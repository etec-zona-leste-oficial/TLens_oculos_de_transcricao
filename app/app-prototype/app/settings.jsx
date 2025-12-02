import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Switch, 
  Button, 
  ScrollView, 
  TextInput, 
  ActivityIndicator, 
  Alert 
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { useConnection } from '../src/context/ConnectionContext';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const {
    deviceSettings,
    updateSetting,
    connectedDevice,
    unpairAndDisconnect,
    clearAppCache
  } = useConnection();

  // --- Hooks de Estado ---

  // Estado local para o slider de brilho (para UI fluida)
  const [localBrightnessPercent, setLocalBrightnessPercent] = useState(null);
  
  // Estado local do nome do dispositivo
  const [localDeviceName, setLocalDeviceName] = useState(deviceSettings?.device_name || '');

  // --- Funções Auxiliares ---

  const parseNum = (val, defaultVal) => {
    const num = parseFloat(val);
    return isNaN(num) ? defaultVal : num;
  };
  
  const rawToPercent = (rawVal) => Math.round(parseNum(rawVal, 0) / 255 * 100);
  const percentToRaw = (percent) => Math.round(parseNum(percent, 0) / 100 * 255);

  // --- Hooks de Efeito ---

  // Sincronizar o estado local se o contexto mudar
  useEffect(() => {
    if (deviceSettings?.device_name !== localDeviceName) {
      setLocalDeviceName(deviceSettings?.device_name || '');
    }
    
    // Sincroniza o slider de brilho com o valor do Pi
    const brightnessFromPi = rawToPercent(deviceSettings?.brightness);
    setLocalBrightnessPercent(brightnessFromPi);
    
  }, [deviceSettings]); // Depende do deviceSettings inteiro

  // --- Verificação de Conexão (DEPOIS dos hooks) ---

  if (!connectedDevice || !deviceSettings || localBrightnessPercent === null) {
    return (
      <View style={styles.center}>
        <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 10}}>
          {connectedDevice ? "Carregando configurações..." : "Desconectado"}
        </Text>
        <ActivityIndicator size="large" />
        <Text style={{marginTop: 10, color: 'gray'}}>
          {connectedDevice ? "Aguardando dados do Pi..." : "Vá para a tela de Conexão."}
        </Text>
      </View>
    );
  }

  // --- Funções de Handler ---

  const onDeviceNameChange = (text) => {
    setLocalDeviceName(text);
  };

  const onDeviceNameSubmit = () => {
    console.log('💾 [SettingsScreen] Enviando novo nome do dispositivo:', localDeviceName);
    updateSetting('device_name', localDeviceName);
  };
  
  // Handler para o slider de brilho
  const onBrightnessChange = (percent) => {
    // Atualiza o slider localmente (rápido)
    const roundedPercent = Math.round(percent / 10) * 10;
    setLocalBrightnessPercent(roundedPercent);
  };
  
  const onBrightnessComplete = (percent) => {
    // Arredonda para o 'step' de 10
    const roundedPercent = Math.round(percent / 10) * 10;
    setLocalBrightnessPercent(roundedPercent);
    
    // Converte para 0-255 e envia pro Pi
    const rawValue = percentToRaw(roundedPercent);
    console.log(`🔆 [SettingsScreen] Brilho alterado para: ${roundedPercent}% (Raw: ${rawValue})`);
    updateSetting('brightness', rawValue);
  };

  // Handler de Desparear
  const handleUnpair = () => {
    Alert.alert(
      "Desparear Dispositivo",
      "Tem certeza que deseja desparear este dispositivo? O óculos limpará a chave e você precisará parear novamente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Desparear",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('📤 [SettingsScreen] Usuário confirmou despareamento...');
              await unpairAndDisconnect();
              console.log('✅ [SettingsScreen] Despareamento concluído. Navegando para /');
              router.replace('/');
            } catch (e) {
              console.error('[SettingsScreen] Erro no processo de despareamento:', e);
              Alert.alert("Erro", "Ocorreu um erro ao desparear.");
            }
          }
        }
      ]
    );
  };

  // Handler de Limpar Cache
  const handleClearCache = () => {
    Alert.alert(
      "Limpar Cache do App",
      "Tem certeza que deseja apagar todo o histórico de transcrição e as configurações salvas do teleprompter?\n\n(Isso NÃO afeta os dispositivos salvos.)",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: async () => {
            try {
              console.log('📤 [SettingsScreen] Usuário confirmou limpeza de cache...');
              const success = await clearAppCache();
              if (success) {
                Alert.alert("Sucesso", "O cache do aplicativo foi limpo.");
              } else {
                throw new Error("Falha ao limpar cache.");
              }
            } catch (e) {
              console.error('[SettingsScreen] Erro no processo de limpar cache:', e);
              Alert.alert("Erro", "Ocorreu um erro ao limpar o cache.");
            }
          }
        }
      ]
    );
  };

  // --- Renderização ---

  return (
    <ScrollView style={styles.container}>
      
      {/* --- REDE --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rede</Text>
        <Button title="Gerenciar Wi-Fi do Óculos" onPress={() => router.push('/wifi')} />
      </View>

      {/* --- GERAL --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geral</Text>

        <Text style={styles.label}>Nome do Dispositivo (BLE)</Text>
        <TextInput
          style={styles.input}
          value={localDeviceName}
          onChangeText={onDeviceNameChange}
          onEndEditing={onDeviceNameSubmit}
          placeholder="Ex: TLens-Guilherme"
        />
      </View>

      {/* --- TELAS --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Telas</Text>
        
        <Text style={styles.label}>
          Brilho: {localBrightnessPercent}%
        </Text>
        <Slider
          style={{width: '100%', height: 40}}
          minimumValue={0}
          maximumValue={100}
          step={10} // Step de 10%
          value={localBrightnessPercent}
          onValueChange={onBrightnessChange} // Atualiza a UI
          onSlidingComplete={onBrightnessComplete} // Envia para o Pi
        />

        <View style={styles.row}>
          <Text style={styles.label}>Inverter Telas (Status/Texto)</Text>
          <Switch
            value={!!(deviceSettings?.screen_swap === 'true' || deviceSettings?.screen_swap === true)}
            onValueChange={(val) => {
              console.log('🔁 [SettingsScreen] Inverter telas:', val);
              updateSetting('screen_swap', val);
            }}
          />
        </View>

        <Text style={styles.label}>Formato do Relógio (Tela de Status)</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={deviceSettings?.clock_format === '12h' ? '12h' : '24h'}
            onValueChange={(val) => {
              console.log('⏰ [SettingsScreen] Formato do relógio alterado para:', val);
              updateSetting('clock_format', val);
            }}
          >
            <Picker.Item label="24h (14:30)" value="24h" />
            <Picker.Item label="12h (2:30 PM)" value="12h" />
          </Picker>
        </View>
      </View>

      {/* --- TRANSCRIÇÃO --- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transcrição</Text>

        <Text style={styles.label}>
          Tamanho da Fonte (Tela de Texto): {Math.round(parseNum(deviceSettings?.fontsize, 10))}px
        </Text>
        <Slider
          style={{width: '100%', height: 40}}
          minimumValue={8}
          maximumValue={16}
          step={1} // Step de 1px
          value={parseNum(deviceSettings?.fontsize, 10)}
          onSlidingComplete={(val) => {
            console.log('🔤 [SettingsScreen] Fonte alterada para:', val);
            updateSetting('fontsize', val);
          }}
        />

        <Text style={styles.label}>Idioma de Transcrição</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={deviceSettings?.language === 'en' ? 'en' : 'pt'}
            onValueChange={(val) => {
              console.log('🌐 [SettingsScreen] Idioma alterado para:', val);
              updateSetting('language', val);
            }}
          >
            <Picker.Item label="Português" value="pt" />
            <Picker.Item label="English" value="en" />
          </Picker>
        </View>

        <Text style={styles.label}>
          Delay entre palavras: {parseNum(deviceSettings?.delay_entre_palavras_seg, 0.5).toFixed(1)}s
        </Text>
        <Slider
          style={{width: '100%', height: 40}}
          minimumValue={0.5}
          maximumValue={3.0}
          step={0.1} // Step de 0.1s
          value={parseNum(deviceSettings?.delay_entre_palavras_seg, 0.5)}
          onSlidingComplete={(val) => {
            console.log('⏱️ [SettingsScreen] Delay entre palavras alterado para:', val);
            updateSetting('delay_entre_palavras_seg', val);
          }}
        />

        <Text style={styles.label}>
          Tempo p/ limpar tela: {parseNum(deviceSettings?.tempo_limpar_tela_seg, 5.0).toFixed(1)}s
        </Text>
        <Slider
          style={{width: '100%', height: 40}}
          minimumValue={1.0}
          maximumValue={10.0}
          step={0.5} // Step de 0.5s
          value={parseNum(deviceSettings?.tempo_limpar_tela_seg, 5.0)}
          onSlidingComplete={(val) => {
            console.log('🧹 [SettingsScreen] Tempo limpar tela alterado para:', val);
            updateSetting('tempo_limpar_tela_seg', val);
          }}
        />
      </View>
      
      {/* --- ZONA DE PERIGO --- */}
      <View style={[styles.section, { borderColor: '#c0392b', borderWidth: 1, backgroundColor: '#fff6f5' }]}>
        <Text style={[styles.sectionTitle, { color: '#c0392b' }]}>Zona de Perigo</Text>
        
        <Button 
          title="Desparear Dispositivo" 
          color="#c0392b" // Vermelho
          onPress={handleUnpair} 
        />
        <Text style={styles.dangerText}>
          Força a desconexão, limpa a chave no Pi e esquece o dispositivo no App.
        </Text>

        <View style={{ height: 20 }} />
        
        <Button 
          title="Limpar Cache do App" 
          color="#e67e22" // Laranja
          onPress={handleClearCache} 
        />
        <Text style={styles.dangerText}>
          Apaga o histórico de transcrição e as configs do teleprompter salvas no celular.
        </Text>
        
      </View>

    </ScrollView>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#f5f5ff' 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  section: { 
    backgroundColor: 'white', 
    padding: 15, 
    borderRadius: 10, 
    marginBottom: 20 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee', 
    paddingBottom: 10 
  },
  label: { 
    fontSize: 16, 
    marginBottom: 5, 
    marginTop: 10 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 10, 
    marginBottom: 10 
  },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#eee', 
    borderRadius: 5, 
    marginTop: 5 
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  dangerText: {
    fontSize: 12,
    color: '#555',
    marginTop: 5,
    fontStyle: 'italic'
  }
});