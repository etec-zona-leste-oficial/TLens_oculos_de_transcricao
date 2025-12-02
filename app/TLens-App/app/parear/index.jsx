import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { styles } from "./Style";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next"; // 👈 hook para tradução

// Assets
import Logo from "../../assets/icons/logo3.png";
import Glasses from "../../assets/icons/glasses.png";

export default function Parear() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 usa o i18n

  /**
   *  Emparelha o primeiro TLens e salva no AsyncStorage.
   *  Cria a lista inicial com "TLens 1" e redireciona para o menu principal.
   */
  const handleEmparelhar = async () => {
    try {
      const firstOculos = ["TLens 1"];

      // Salva a lista inicial de TLens
      await AsyncStorage.setItem("oculosList", JSON.stringify(firstOculos));

      // Garante que o contador comece em 1 (para futuras adições)
      await AsyncStorage.setItem("oculosCounter", "1");

      // Redireciona para o menu
      router.push("/List");
    } catch (error) {
      console.log("Erro ao emparelhar:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo principal */}
      <Image source={Logo} style={styles.logoImage} />

      {/* Textos de boas-vindas */}
      <Text style={styles.title}>{t("welcomeTitle")}</Text>
      <Text style={styles.subtitle}>{t("welcomeSubtitle")}</Text>

      {/* Imagem dos óculos */}
      <Image source={Glasses} style={styles.glasses} />

      {/* Botão de emparelhamento */}
      <TouchableOpacity style={styles.button} onPress={handleEmparelhar}>
        <Text style={styles.buttonText}>{t("pairButton")}</Text>
      </TouchableOpacity>
    </View>
  );
}
