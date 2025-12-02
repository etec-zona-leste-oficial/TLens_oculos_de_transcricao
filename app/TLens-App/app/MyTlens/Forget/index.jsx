import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { styles } from "./Style";
import { useTranslation } from "react-i18next"; // 👈 Importa o hook de tradução

export default function Disconnect() {
  const router = useRouter();
  const [oculosList, setOculosList] = useState([]);
  const { t } = useTranslation(); // 👈 Hook do i18next

  // Carrega a lista de óculos ao iniciar
  useEffect(() => {
    loadOculos();
  }, []);

  // Recupera a lista armazenada no AsyncStorage
  const loadOculos = async () => {
    try {
      const savedList = await AsyncStorage.getItem("oculosList");
      if (savedList) {
        setOculosList(JSON.parse(savedList));
      }
    } catch (error) {
      console.error("Erro ao carregar lista de óculos:", error);
    }
  };

  // Remove o óculos selecionado e atualiza o AsyncStorage
  const handleDisconnect = async (selectedItem) => {
    try {
      const updatedList = oculosList.filter((item) => item !== selectedItem);
      setOculosList(updatedList);
      await AsyncStorage.setItem("oculosList", JSON.stringify(updatedList));

      // Se não houver mais dispositivos, volta para a tela de pareamento
      if (updatedList.length === 0) {
        router.replace("/parear");
      }
    } catch (error) {
      console.error("Erro ao desconectar óculos:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("desconectar.titulo")}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* ---------- Lista de dispositivos ---------- */}
      <FlatList
        data={oculosList}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.itemRow}>
            <Text style={styles.itemText}>{item}</Text>
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={() => handleDisconnect(item)}
            >
              <Text style={styles.disconnectText}>
                {t("desconectar.botao")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("desconectar.semDispositivos")}</Text>
        }
      />
    </View>
  );
}
