import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../../i18n";
import { styles } from "./Style";

export default function MyTLens() {
  const router = useRouter();
 const { t, i18n } = useTranslation(); // 👈 Inicializa o tradutor



  
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadLang = async () => {
      const saved = await AsyncStorage.getItem("language");
      if (saved) await i18n.changeLanguage(saved);
      setIsReady(true);
    };
    loadLang();
  }, []);

  if (!isReady) return null; // evita renderizar antes do idioma carregar


  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("myTLens.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Conteúdo */}
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push("/MyTlens/language")}
        >
          <Text style={styles.optionText}>{t("myTLens.language")}</Text>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push("/MyTlens/Font")}
        >
          <Text style={styles.optionText}>{t("myTLens.fontSize")}</Text>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push("/MyTlens/speed")}
        >
          <Text style={styles.optionText}>{t("myTLens.displaySpeed")}</Text>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push("/MyTlens/Vizu")}
        >
          <Text style={styles.optionText}>{t("myTLens.viewSide")}</Text>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => router.push("/MyTlens/Forget")}
        >
          <Text style={styles.optionText}>{t("myTLens.desconectar")}</Text>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
