import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Button, ScrollView, TextInput } from 'react-native';
import Slider from '@react-native-community/slider';
import { Picker } from '@react-native-picker/picker';
import { useConnection } from '../context/ConnectionContext';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const { deviceSettings, updateSetting, connectedDevice } = useConnection();

  console.log('📡 [SettingsScreen] Contexto carregado:');
  console.log('connectedDevice:', connectedDevice);
  console.log('deviceSettings:', deviceSettings);

  if (!connectedDevice) {
    return (
      <View style={styles.center}>
        <Text>Dispositivo não conectado.</Text>
      </View>
    );
  }

  const safe = (val, fallback) =>
    val === null || val === undefined || (typeof val === 'number' && isNaN(val))
      ? fallback
      : val;

  const parseNum = (val, def) => {
    const n = parseFloat(val);
    return isNaN(n) ? def : n;
  };

  const [localDeviceName, setLocalDeviceName] = useState(safe(deviceSettings.device_name, ''));

  useEffect(() => {
    const current = safe(deviceSettings.device_name, '');
    if (current !== localDeviceName) setLocalDeviceName(current);
  }, [deviceSettings.device_name]);

  const onDeviceNameSubmit = () => {
    try {
      updateSetting('device_name', localDeviceName);
    } catch (e) {
      console.error('Erro ao enviar nome de dispositivo:', e);
    }
  };

  try {
    console.log('🧩 [SettingsScreen] Renderizou com deviceSettings:', deviceSettings);
  } catch {}

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rede</Text>
        <Button title="Gerenciar Wi-Fi do Óculos" onPress={() => router.push('/wifi')} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Geral</Text>

        <Text style={styles.label}>Nome do Dispositivo (BLE)</Text>
        <TextInput
          style={styles.input}
          value={localDeviceName}
          onChangeText={setLocalDeviceName}
          onEndEditing={onDeviceNameSubmit}
          placeholder="Ex: TLens-Guilherme"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Telas</Text>
        <Text style={styles.label}>
          Brilho: {Math.round(parseNum(deviceSettings.brightness, 80) / 255 * 100)}%
        </Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={1}
          maximumValue={255}
          step={5}
          value={safe(parseNum(deviceSettings.brightness, 80), 80)}
          onSlidingComplete={(val) => updateSetting('brightness', val)}
        />

        <View style={styles.row}>
          <Text style={styles.label}>Inverter Telas (Status/Texto)</Text>
          <Switch
            value={!!deviceSettings.screen_swap}
            onValueChange={(val) => updateSetting('screen_swap', val)}
          />
        </View>

        <Text style={styles.label}>Formato do Relógio (Tela de Status)</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={deviceSettings.clock_format === '12h' ? '12h' : '24h'}
            onValueChange={(val) => updateSetting('clock_format', val)}
          >
            <Picker.Item label="24h (14:30)" value="24h" />
            <Picker.Item label="12h (2:30 PM)" value="12h" />
          </Picker>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transcrição</Text>

        <Text style={styles.label}>
          Tamanho da Fonte (Tela de Texto): {Math.round(parseNum(deviceSettings.fontsize, 10))}px
        </Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={8}
          maximumValue={24}
          step={1}
          value={safe(parseNum(deviceSettings.fontsize, 10), 10)}
          onSlidingComplete={(val) => updateSetting('fontsize', val)}
        />

        <Text style={styles.label}>Idioma de Transcrição</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={deviceSettings.language === 'en' ? 'en' : 'pt'}
            onValueChange={(val) => updateSetting('language', val)}
          >
            <Picker.Item label="Português" value="pt" />
            <Picker.Item label="English" value="en" />
          </Picker>
        </View>

        <Text style={styles.label}>
          Delay entre palavras: {parseNum(deviceSettings.delay_entre_palavras_seg, 0.5).toFixed(1)}s
        </Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={0.1}
          maximumValue={2.0}
          step={0.1}
          value={safe(parseNum(deviceSettings.delay_entre_palavras_seg, 0.5), 0.5)}
          onSlidingComplete={(val) => updateSetting('delay_entre_palavras_seg', val)}
        />

        <Text style={styles.label}>
          Tempo p/ limpar tela: {parseNum(deviceSettings.tempo_limpar_tela_seg, 5.0).toFixed(1)}s
        </Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={1.0}
          maximumValue={20.0}
          step={0.5}
          value={safe(parseNum(deviceSettings.tempo_limpar_tela_seg, 5.0), 5.0)}
          onSlidingComplete={(val) => updateSetting('tempo_limpar_tela_seg', val)}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { backgroundColor: 'white', padding: 15, borderRadius: 10, marginBottom: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  label: { fontSize: 16, marginBottom: 5, marginTop: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  pickerContainer: { borderWidth: 1, borderColor: '#eee', borderRadius: 5, marginTop: 5 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
});
