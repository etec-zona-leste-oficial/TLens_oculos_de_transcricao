// app/_layout.js
import React, { useContext } from 'react';
import { Tabs, router } from 'expo-router'; // <-- ADICIONADO 'router'
import { Text, View, Button, Platform } from 'react-native'; // <-- ADICIONADO 'Button' e 'Platform'
import { ConnectionProvider, ConnectionContext } from '../src/context/ConnectionContext';

/**
 * Componente 1: O indicador que fica no topo
 * (Sem mudanças aqui)
 */
const ConnectionIndicator = () => {
  const { connectedDevice } = useContext(ConnectionContext); 

  if (!connectedDevice) {
    return null;
  }

  return (
    <View style={{ marginRight: 15, padding: 5, backgroundColor: '#e0f0e0', borderRadius: 5 }}>
      <Text style={{ color: '#005500', fontSize: 12, fontWeight: 'bold' }}>
        Conectado: {connectedDevice.name}
      </Text>
    </View>
  );
};

/**
 * Componente 2: O seu layout de abas original.
 * (Com a mudança na tela 'wifi')
 */
function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerRight: () => <ConnectionIndicator />, 
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Conexão', 
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color: color }}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: 'Painel',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color: color }}>🎛️</Text>,
        }}
      />
      <Tabs.Screen
        name="teleprompter"
        options={{
          title: 'Teleprompter',
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color: color }}>📺</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color: color }}>📖</Text>,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Configurações',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24, color: color }}>⚙️</Text>,
        }}
      />

      {/* --- A TELA CORRIGIDA --- */}
      <Tabs.Screen
        name="wifi"
        options={{
          title: 'Configurar Wi-Fi',
          href: null,
          headerLeft: () => (
            <Button 
              onPress={() => router.back()} 
              title="Voltar" 
              color={Platform.OS === 'ios' ? '#007AFF' : '#000000'} 
            />
          ),
        }}
      />

      {/* [NOVA TELA ADICIONADA AQUI] */}
      <Tabs.Screen
        name="saved_networks" // Nome do arquivo (app/saved_networks.jsx)
        options={{
          title: 'Gerenciar Redes Salvas',
          href: null, // Esconde da barra de abas
          headerLeft: () => (
            <Button 
              onPress={() => router.back()} 
              title="Voltar" 
              color={Platform.OS === 'ios' ? '#007AFF' : '#000000'} 
            />
          ),
        }}
      />
      
    </Tabs>
  );
}

/**
 * Componente 3: O export default
 * (Sem mudanças aqui)
 */
export default function AppLayout() {
  return (
    <ConnectionProvider>
      <RootLayout />
    </ConnectionProvider>
  );
}