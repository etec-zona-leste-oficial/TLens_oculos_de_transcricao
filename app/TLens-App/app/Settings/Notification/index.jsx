import React, { useState, useEffect } from "react";
import { View, Text, Switch, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "./Style";
import { useTranslation } from "react-i18next"; // 👈 Importa o hook de tradução

export default function Notification() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 Hook do i18next

  const [batteryNotif, setBatteryNotif] = useState(false);
  const [updateNotif, setUpdateNotif] = useState(false);

  // 🔹 Carrega preferências do AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const batteryValue = await AsyncStorage.getItem("notif_battery");
        const updateValue = await AsyncStorage.getItem("notif_update");

        if (batteryValue !== null) setBatteryNotif(JSON.parse(batteryValue));
        if (updateValue !== null) setUpdateNotif(JSON.parse(updateValue));
      } catch (error) {
        console.error("Erro ao carregar configurações de notificação:", error);
      }
    };
    loadSettings();
  }, []);

  // 🔹 Alterna e salva notificação de bateria
  const toggleBattery = async (value) => {
    try {
      setBatteryNotif(value);
      await AsyncStorage.setItem("notif_battery", JSON.stringify(value));
    } catch (error) {
      console.error("Erro ao salvar notificação de bateria:", error);
    }
  };

  // 🔹 Alterna e salva notificação de atualização
  const toggleUpdate = async (value) => {
    try {
      setUpdateNotif(value);
      await AsyncStorage.setItem("notif_update", JSON.stringify(value));
    } catch (error) {
      console.error("Erro ao salvar notificação de atualização:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("manageNotifications.titulo")}</Text>

        {/* Espaço para centralizar o título */}
        <View style={{ width: 28 }} />
      </View>

      {/* ---------- Opções de Notificação ---------- */}
      <View style={styles.optionContainer}>
        {/* Notificação de bateria */}
        <View style={styles.optionRow}>
          <Text style={styles.optionText}>
            {t("manageNotifications.bateria")}
          </Text>
          <Switch
            value={batteryNotif}
            onValueChange={toggleBattery}
            thumbColor={batteryNotif ? "#fff" : "#999"}
          />
        </View>

        <View style={styles.separator} />

        {/* Notificação de atualização */}
        <View style={styles.optionRow}>
          <Text style={styles.optionText}>
            {t("manageNotifications.atualizacao")}
          </Text>
          <Switch
            value={updateNotif}
            onValueChange={toggleUpdate}
            thumbColor={updateNotif ? "#fff" : "#999"}
          />
        </View>
      </View>
    </View>
  );
}
