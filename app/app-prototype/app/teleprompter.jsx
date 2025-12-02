// app/teleprompter.jsx
import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  SafeAreaView,
  Button,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ConnectionContext } from '../src/context/ConnectionContext';

// Chave para salvar as configs no celular
const TELEPROMPTER_CONFIG_KEY = 'teleprompter_config_v2';

// Hook customizado para salvar/carregar as configs
const useTeleprompterConfig = () => {
  const [config, setConfig] = useState({
    mode: 'writing', // 'writing' ou 'scrolling'
    fontSize: 14,
    writingSpeed: 0.3, // "Intervalo entre palavras"
    scrollingSpeed: 2, // "Velocidade da exibição"
    writingWaitTime: 5.0, // "Tempo de Pausa Final"
    scrollingDirection: 'left', // 'left' ou 'right'
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const saveTimerRef = useRef(null);

  // Carregar config na inicialização
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(TELEPROMPTER_CONFIG_KEY);
        if (jsonValue != null) {
          // [CORREÇÃO] Usa o setConfig funcional para MESCLAR com os padrões
          setConfig((prevDefaults) => ({
            ...prevDefaults, // 👈 Garante os valores padrão (como writingWaitTime: 5.0)
            ...JSON.parse(jsonValue), // 👈 Sobrescreve com o que estava salvo
          }));
        }
      } catch (e) {
        console.error('Falha ao carregar config do teleprompter', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadConfig();
  }, []);

  // [MUDANÇA 1] Criamos uma função de salvar, mas ela NÃO vai rodar sozinha.
  const saveConfig = useCallback(async (currentConfig) => {
    // Só salva se já tiver terminado de carregar as configs
    if (!isLoaded) return;
    
    try {
      console.log('SALVANDO CONFIG (DEBOUNCE):', JSON.stringify(currentConfig));
      await AsyncStorage.setItem(
        TELEPROMPTER_CONFIG_KEY,
        JSON.stringify(currentConfig)
      );
    } catch (e) {
      console.error('Falha ao salvar config do teleprompter', e);
    }
  }, [isLoaded]); // Depende de 'isLoaded' para não salvar antes da hora

  // [MUDANÇA 2] - O EFEITO DE SALVAR COM DEBOUNCE
  // Roda toda vez que 'config' muda
  useEffect(() => {
    // Se não carregou, não faça nada.
    if (!isLoaded) {
      return;
    }

    // 1. Limpa o timer anterior (se houver)
    // Isso impede salvar a cada micro-movimento do slider
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 2. Agenda um novo salvamento para daqui a 1.5 segundos
    // O usuário pode arrastar o slider à vontade.
    // O app só vai salvar 1.5s DEPOIS que ele PARAR de mexer.
    saveTimerRef.current = setTimeout(() => {
      saveConfig(config);
    }, 1500); // 1.5 segundos

    // Função de limpeza: se o hook for destruído, cancela o timer
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [config, isLoaded, saveConfig]); // Roda se config, isLoaded, ou saveConfig mudar

  // [MUDANÇA 3] - O hook agora só retorna o que a tela precisa
  return [config, setConfig, isLoaded];
};

const WritingOptions = ({ config, updateConfig }) => (
    <>
      <Text style={styles.label}>
        Tamanho da Fonte: {Math.round(config.fontSize)}px
      </Text>
      <Slider
        value={config.fontSize}
        onValueChange={(val) => updateConfig('fontSize', val)}
        minimumValue={8}
        maximumValue={16}
        step={1}
      />
      <Text style={styles.label}>
        Intervalo entre Palavras: {config.writingSpeed.toFixed(1)}s
      </Text>
      <Slider
        value={config.writingSpeed}
        onValueChange={(val) => updateConfig('writingSpeed', val)}
        minimumValue={0.5}
        maximumValue={3.0}
        step={0.1}
      />
      <Text style={styles.label}>
        Tempo de Pausa Final: {config.writingWaitTime.toFixed(1)}s
      </Text>
      <Slider
        value={config.writingWaitTime}
        onValueChange={(val) => updateConfig('writingWaitTime', val)}
        minimumValue={1.0}
        maximumValue={10.0}
        step={0.5}
      />
    </>
  );

  const ScrollingOptions = ({ config, updateConfig }) => (
    <>
      <Text style={styles.label}>
        Tamanho da Fonte: {Math.round(config.fontSize)}px
      </Text>
      <Slider
        value={config.fontSize}
        onValueChange={(val) => updateConfig('fontSize', val)}
        minimumValue={8}
        maximumValue={24}
        step={1}
      />
      <Text style={styles.label}>
        Velocidade de Exibição: {Math.round(config.scrollingSpeed)}
      </Text>
      <Slider
        value={config.scrollingSpeed}
        onValueChange={(val) => updateConfig('scrollingSpeed', val)}
        minimumValue={1}
        maximumValue={10}
        step={1}
      />
      <Text style={styles.label}>Direção da Exibição</Text>
      <View style={styles.segmentControl}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            config.scrollingDirection === 'left' && styles.segmentButtonActive,
          ]}
          onPress={() => updateConfig('scrollingDirection', 'left')}
        >
          <Text style={styles.segmentButtonText}>Esquerda</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            config.scrollingDirection === 'right' && styles.segmentButtonActive,
          ]}
          onPress={() => updateConfig('scrollingDirection', 'right')}
        >
          <Text style={styles.segmentButtonText}>Direita</Text>
        </TouchableOpacity>
      </View>
    </>
  );

export default function TeleprompterScreen() {
  const {
    connectedDevice,
    isTeleprompterActive,
    sendTeleprompterStart,
    sendTeleprompterStop,
  } = useContext(ConnectionContext);

  const [config, setConfig, isConfigLoaded] = useTeleprompterConfig();
  const [text, setText] = useState('');

  const updateConfig = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleBroadcast = () => {
    if (isTeleprompterActive) {
      // Se está ativo, manda parar
      sendTeleprompterStop();
    } else {
      // Se está inativo, manda iniciar
      if (!text.trim()) {
        alert('Por favor, digite um texto para exibir.');
        return;
      }

      // Monta o payload baseado no modo
      let payload = {
        text: text,
        font_size: Math.round(config.fontSize),
      };

      if (config.mode === 'writing') {
        payload.mode = 'writing';
        payload.speed = config.writingSpeed;
        payload.wait_time = config.writingWaitTime;
      } else {
        payload.mode = 'scrolling';
        payload.speed = Math.round(config.scrollingSpeed);
        payload.direction = config.scrollingDirection;
      }
      sendTeleprompterStart(payload);
    }
  };

  if (!isConfigLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!connectedDevice) {
    return (
      <View style={styles.center}>
        <Text>Dispositivo não conectado.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Função Teleprompter</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Escreva o texto abaixo para ser exibido nos óculos..."
          multiline
          value={text}
          onChangeText={setText}
        />

        {/* Seletor de Modo (estilo Checkbox) */}
        <TouchableOpacity
          style={styles.modeSelector}
          onPress={() => updateConfig('mode', 'scrolling')}
        >
          <Text style={styles.modeText}>Letreiro</Text>
          <View
            style={[
              styles.checkbox,
              config.mode === 'scrolling' && styles.checkboxActive,
            ]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modeSelector}
          onPress={() => updateConfig('mode', 'writing')}
        >
          <Text style={styles.modeText}>Digitação</Text>
          <View
            style={[
              styles.checkbox,
              config.mode === 'writing' && styles.checkboxActive,
            ]}
          />
        </TouchableOpacity>

        {/* Opções Condicionais */}
        <View style={styles.optionsContainer}>
          {config.mode === 'writing' ? (
            <WritingOptions config={config} updateConfig={updateConfig} />
          ) : (
            <ScrollingOptions config={config} updateConfig={updateConfig} />
          )}
        </View>

        {/* Botão Principal */}
        <Button
          title={isTeleprompterActive ? 'Parar Exibição' : 'Exibir nos Óculos'}
          color={isTeleprompterActive ? '#c0392b' : '#007AFF'}
          onPress={handleToggleBroadcast}
          disabled={!text.trim() && !isTeleprompterActive}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f5f5f5' },
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  textInput: {
    backgroundColor: 'white',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 150,
    padding: 10,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
  },
  modeText: { fontSize: 18 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  checkboxActive: { backgroundColor: '#007AFF' },
  optionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginVertical: 10,
  },
  label: { fontSize: 16, color: '#333', marginTop: 10, marginBottom: 5 },
  segmentControl: { flexDirection: 'row', width: '100%', marginTop: 10 },
  segmentButton: {
    flex: 1,
    padding: 10,
    backgroundColor: '#eee',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  segmentButtonActive: { backgroundColor: '#007AFF' },
  segmentButtonText: { textAlign: 'center', fontSize: 16 },
});