import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { styles } from "./Style";
import { useTranslation } from "react-i18next"; // 👈 Importa o hook de tradução

export default function Notification() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 Hook do i18next

  // 🔹 Exemplo de notificações (pode vir de API futuramente)
  const notifications = [
    {
      id: 1,
      date: "12 " + t("notification.months.august"),
      time: "09:32",
      description: t("notification.updateAvailable"),
    },
    {
      id: 2,
      date: "00 " + t("notification.months.month"),
      time: "00:00",
      description: t("notification.placeholder"),
    },
    {
      id: 3,
      date: "00 " + t("notification.months.month"),
      time: "00:00",
      description: t("notification.placeholder"),
    },
  ];

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notification.title")}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* ---------- Lista de Notificações ---------- */}
      <ScrollView contentContainerStyle={styles.content}>
        {notifications.map((item) => (
          <View key={item.id} style={styles.notificationCard}>
            <Text style={styles.dateText}>{item.date}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
            <Text style={styles.descriptionText}>{item.description}</Text>
            <View style={styles.divider} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
