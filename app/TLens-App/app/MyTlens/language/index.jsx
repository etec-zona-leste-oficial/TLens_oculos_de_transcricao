import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next"; // 👈 Importa o hook do i18n
import { styles } from "./Style";

// Assets
import USAFlag from "../../../assets/icons/USA.png";
import BrazilFlag from "../../../assets/icons/brasil.png";

export default function Language() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 Inicializa o tradutor

  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showModal, setShowModal] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState(null);

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem("language");
        if (savedLanguage) {
          setSelectedLanguage(savedLanguage);
        }
      } catch (error) {
        console.log("Erro ao carregar idioma:", error);
      }
    };

    loadLanguage();
  }, []);

  const handleLanguagePress = (language) => {
    if (language === selectedLanguage) return;
    setPendingLanguage(language);
    setShowModal(true);
  };

  const confirmLanguageChange = async () => {
    try {
      setSelectedLanguage(pendingLanguage);
      await AsyncStorage.setItem("language", pendingLanguage);
    } catch (error) {
      console.log("Erro ao salvar idioma:", error);
    } finally {
      setPendingLanguage(null);
      setShowModal(false);
    }
  };

  const cancelLanguageChange = () => {
    setPendingLanguage(null);
    setShowModal(false);
  };

  const handleContinue = async () => {
    try {
      await AsyncStorage.setItem("language", selectedLanguage);
      router.push("/parear");
    } catch (error) {
      console.log("Erro ao salvar idioma:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("language.title")}</Text>

        {/* Espaço para centralizar o título */}
        <View style={{ width: 28 }} />
      </View>

      {/* ---------- Seleção de Idiomas ---------- */}
      <View style={styles.languagesContainer}>
        {/* Idioma Inglês */}
        <TouchableOpacity
          style={[
            styles.languageButton,
            selectedLanguage === "en" && styles.languageSelected,
          ]}
          onPress={() => handleLanguagePress("en")}
        >
          <Image source={USAFlag} style={styles.flag} />
          <Text style={styles.languageText}>English</Text>
        </TouchableOpacity>

        {/* Idioma Português */}
        <TouchableOpacity
          style={[
            styles.languageButton,
            selectedLanguage === "pt" && styles.languageSelected,
          ]}
          onPress={() => handleLanguagePress("pt")}
        >
          <Image source={BrazilFlag} style={styles.flag} />
          <Text style={styles.languageText}>Português</Text>
        </TouchableOpacity>
      </View>

      {/* ---------- Modal de Confirmação ---------- */}
      <Modal
        transparent
        animationType="slide"
        visible={showModal}
        onRequestClose={cancelLanguageChange}
      >
        <View style={styles.bottomOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={cancelLanguageChange} />

          <View style={styles.bottomSheet}>
            <Ionicons name="alert-circle-outline" size={40} color="#ff0000ff" />
            <Text style={styles.sheetTitle}>{t("language.confirmTitle")}</Text>

            <Text style={styles.sheetMessage}>
              {t("language.confirmMessage")}{" "}
              <Text style={{ fontWeight: "bold" }}>
                {pendingLanguage === "en" ? "English" : "Português"}?
              </Text>
            </Text>

            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={[styles.sheetButton, styles.cancelButton]}
                onPress={cancelLanguageChange}
              >
                <Text style={styles.cancelText}>{t("language.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sheetButton, styles.confirmButton]}
                onPress={confirmLanguageChange}
              >
                <Text style={styles.confirmText}>{t("language.confirm")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------- Botão Continuar ---------- */}
     <TouchableOpacity style={styles.optionButton} onPress={handleContinue}>
             <Text style={styles.continueText}> {t("language.continue")}</Text>
           </TouchableOpacity>
    </View>

   
  );
}
