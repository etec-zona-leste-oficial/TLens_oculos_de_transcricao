import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { styles } from "./Style";
import i18n from "../i18n"; // 👈 integração global com i18next

// Assets
import Logo from "../assets/icons/logo3.png";
import USAFlag from "../assets/icons/USA.png";
import BrazilFlag from "../assets/icons/brasil.png";

/**
 * Tela de seleção de idioma.
 * Apenas define o idioma global e salva no AsyncStorage.
 */
export default function Idioma() {
const [selectedLanguage, setSelectedLanguage] = useState("en");

  const router = useRouter();

  // 👇 Altera o idioma global em tempo real
 const handleLanguageSelect = (lang) => {
  setSelectedLanguage(lang);
  i18n.changeLanguage(lang);
};

  // 👇 Salva o idioma e vai pra próxima tela
  const handleContinue = async () => {
  try {
    await AsyncStorage.setItem("language", selectedLanguage); // 👈 igual ao _layout.js
    router.push("/parear");
  } catch (error) {
    console.error("Erro ao salvar idioma:", error);
  }
};
  return (
    <View style={styles.container}>
      {/* Logo principal */}
      <Image source={Logo} style={styles.logoImage} />

      {/* Títulos fixos */}
      <Text style={styles.title}>Escolha seu idioma</Text>
      <Text style={styles.subtitle}>Choose your language</Text>

      {/* Descrição */}
      <Text style={styles.description}>
        Selecione o idioma que deseja usar no TLens.
      </Text>
<Text style={styles.subdescription}>
        Select your preferred language to use TLens
      </Text>
      {/* Botões de idioma */}
      <View style={styles.languagesContainer}>
        {/* 🇺🇸 Inglês */}
        <TouchableOpacity
          style={[
            styles.languageButton,
            selectedLanguage === "en" && styles.languageSelected,
          ]}
          onPress={() => handleLanguageSelect("en")}
        >
          <Image source={USAFlag} style={styles.flag} />
          <Text style={styles.languageText}>English</Text>
        </TouchableOpacity>

        {/* 🇧🇷 Português */}
        <TouchableOpacity
          style={[
            styles.languageButton,
            selectedLanguage === "pt" && styles.languageSelected,
          ]}
          onPress={() => handleLanguageSelect("pt")}
        >
          <Image source={BrazilFlag} style={styles.flag} />
          <Text style={styles.languageText}>Português</Text>
        </TouchableOpacity>
      </View>

      {/* Botão continuar */}
      <TouchableOpacity style={styles.optionButton} onPress={handleContinue}>
        <Text style={styles.continueText}>Continuar</Text>
      </TouchableOpacity>
    </View>
  );
}
