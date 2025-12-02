// app/control.js
import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, SafeAreaView } from 'react-native';
import { useConnection } from '../src/context/ConnectionContext';

export default function ControlPanelScreen() {
  const { connectedDevice, deviceSettings, sendMuteToggle, sendScreensToggle } = useConnection();

  if (!connectedDevice) {
      return <View style={styles.container}><Text>Dispositivo não conectado.</Text></View>;
  }

  const isMuted = deviceSettings.is_muted === true || deviceSettings.is_muted === 'true';

  const areScreensOn = deviceSettings.screens_on === true || deviceSettings.screens_on === 'true';

  return (
    <SafeAreaView style={styles.scrollView}>
      <View style={styles.container}>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.container}></ScrollView>
        
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status do Microfone</Text>
          
          <Text style={[styles.statusText, isMuted ? styles.statusMuted : styles.statusRecording]}>
            {isMuted ? "MUTADO" : "GRAVANDO"}
          </Text>
          
          <Switch
            trackColor={{ false: "#767577", true: "#f4f3f4" }}
            thumbColor={isMuted ? "#f5dd4b" : "#4CAF50"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={sendMuteToggle}
            value={isMuted}
            style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Status das Telas</Text>
          
          <Text style={[styles.statusText, areScreensOn ? styles.statusOn : styles.statusOff]}>
            {areScreensOn ? "LIGADAS" : "DESLIGADAS"}
          </Text>
          
          <Switch
            trackColor={{ false: "#767577", true: "#f4f3f4" }}
            thumbColor={areScreensOn ? "#4CAF50" : "#f5dd4b"} // Inverti a cor do "thumb" (amarelo = desligado)
            ios_backgroundColor="#3e3e3e"
            onValueChange={sendScreensToggle}
            value={areScreensOn}
            style={{ transform: [{ scaleX: 1.5 }, { scaleY: 1.5 }] }}
          />
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 25,
    width: '100%',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333'
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  statusRecording: {
    color: '#4CAF50'
  },
  statusMuted: {
    color: '#f44336'
  },
  statusOn: {
    color: '#4CAF50'
  },
  statusOff: {
    color: '#f44336'
  }
});