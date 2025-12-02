import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { styles } from "./Style";
import { useTranslation } from "react-i18next"; // 👈 Importa o hook de tradução

export default function Settings() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 Hook que dá acesso às traduções

  /**
   * Exibe um alerta confirmando a limpeza do cache.
   * Apenas visual — sem limpeza real.
   */
  const handleCacheClear = () => {
    Alert.alert(t("settings.cacheLimpo"), t("settings.cacheMensagem"));
  };

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("settings.titulo")}</Text>

        {/* Espaço de balanceamento para centralizar o título */}
        <View style={{ width: 28 }} />
      </View>

      {/* ---------- Conteúdo Principal ---------- */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Informações sobre a versão atual */}
        <View style={styles.optionButton}>
          <Text style={styles.optionText}>{t("settings.sobreVersao")}</Text>
          <Text style={styles.versionText}>v1.0.3</Text>
        </View>

        {/* Gerenciar notificações */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push("/Settings/Notification")}
        >
          <Text style={styles.optionText}>{t("settings.notificacoes")}</Text>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Desconectar */}
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push("/Settings/Disconnect")}
        >
          <Text style={styles.optionText}>{t("settings.desconectar")}</Text>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Limpar cache */}
        <TouchableOpacity
          style={[styles.optionButton, styles.lastButton]}
          onPress={handleCacheClear}
        >
          <Text style={styles.optionText}>{t("settings.limparCache")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
