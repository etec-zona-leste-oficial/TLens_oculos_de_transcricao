import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next"; // 👈 import do i18n
import { styles } from "./Style";

export default function Vizu() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 inicializa tradução

  const [selected, setSelected] = useState("left");

  const STORAGE_KEY = "@ladoSelecionado";

  useEffect(() => {
    const loadSelection = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setSelected(saved);
        }
      } catch (error) {
        console.error("Erro ao carregar seleção:", error);
      }
    };
    loadSelection();
  }, []);

  const handlePress = async (side) => {
    setSelected(side);

    try {
      await AsyncStorage.setItem(STORAGE_KEY, side);
    } catch (error) {
      console.error("Erro ao salvar seleção:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("vizu.title")}</Text>

        <View style={{ width: 28 }} />
      </View>

      {/* ---------- Título principal ---------- */}
      <Text style={styles.title}>{t("vizu.subtitle")}</Text>
      <Text style={styles.sectionSubtitle}>{t("vizu.wordDescription")}</Text>

      {/* ---------- Controle de seleção ---------- */}
      <View style={styles.deviceList}>
        {/* Opção - Esquerdo */}
        <TouchableOpacity
          style={[
            styles.deviceButton,
            selected === "left" && styles.deviceSelected, // selecionado
          ]}
          onPress={() => handlePress("left")}
        >
          <Text
            style={[
              styles.deviceText,
              selected === "left" && styles.deviceTextActive, // texto ativo
            ]}
          >
            {t("vizu.left")}
          </Text>
        </TouchableOpacity>

        {/* Opção - Direito */}
        <TouchableOpacity
          style={[
            styles.deviceButton,
            selected === "right" && styles.deviceSelected, // selecionado
          ]}
          onPress={() => handlePress("right")}
        >
          <Text
            style={[
              styles.deviceText,
              selected === "right" && styles.deviceTextActive, // texto ativo
            ]}
          >
            {t("vizu.right")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
