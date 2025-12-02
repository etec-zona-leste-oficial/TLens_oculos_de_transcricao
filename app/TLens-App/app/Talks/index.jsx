
import * as Speech from "expo-speech";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next";
import { styles } from "./Style";

// ---------- Chaves do armazenamento ----------
const STORAGE_KEYS = {
  pt: "@respostas_pt",
  en: "@respostas_en",
};

// ---------- Componente Principal ----------
export default function Talk() {
  const router = useRouter();
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language.startsWith("en") ? "en" : "pt";
  const storageKey = STORAGE_KEYS[currentLang];

  const [respostas, setRespostas] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [novaResposta, setNovaResposta] = useState("");
  const [falando, setFalando] = useState(false);

  // ---------- Carrega respostas salvas ou padrão ----------
  useEffect(() => {
    const loadRespostas = async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          setRespostas(JSON.parse(saved));
        } else {
          // Carrega padrões do JSON de tradução
          const defaults = t("talk.quickReplies", { returnObjects: true });
          setRespostas(defaults);
          await AsyncStorage.setItem(storageKey, JSON.stringify(defaults));
        }
      } catch (error) {
        console.error("Erro ao carregar respostas:", error);
      }
    };

    loadRespostas();
  }, [i18n.language]);

  // ---------- Salva respostas ----------
  const saveRespostas = async (newList) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(newList));
    } catch (error) {
      console.error("Erro ao salvar respostas:", error);
    }
  };

  // ---------- Fala ----------
  const falar = async (texto) => {
    if (falando) return;
    setFalando(true);

    const idiomaAtual = currentLang === "en" ? "en-US" : "pt-BR";

    Speech.speak(texto, {
      language: idiomaAtual,
      pitch: 1.0,
      rate: 1.0,
      onDone: () => setFalando(false),
      onStopped: () => setFalando(false),
      onError: () => setFalando(false),
    });
  };

  // ---------- Adicionar nova resposta ----------
  const adicionarResposta = async () => {
    const nova = novaResposta.trim();
    if (!nova) return;

    const novaLista = [...respostas, nova];
    setRespostas(novaLista);
    await saveRespostas(novaLista);

    setNovaResposta("");
    setModalVisible(false);
  };

  // ---------- Excluir ----------
  const excluirResposta = (index) => {
    Alert.alert(
      t("talk.deleteTitle"),
      `${t("talk.deleteMessage")} "${respostas[index]}"?`,
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            const novaLista = respostas.filter((_, i) => i !== index);
            setRespostas(novaLista);
            await saveRespostas(novaLista);
          },
        },
      ]
    );
  };

  // ---------- Render ----------
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("talk.title")}</Text>

        <TouchableOpacity onPress={() => setModalVisible(true)} disabled={falando}>
          <Ionicons name="add" size={26} color={falando ? "#777" : "#fff"} />
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.centerContainer}>
          {respostas.map((texto, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => falar(texto)}
              onLongPress={() => excluirResposta(i)}
              style={styles.button}
              disabled={falando}
            >
              <Text style={styles.buttonText}>{texto}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal: adicionar nova resposta */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t("talk.addTitle")}</Text>

            <TextInput
              style={styles.input}
              placeholder={t("talk.placeholder")}
              placeholderTextColor="#999"
              value={novaResposta}
              onChangeText={setNovaResposta}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#444" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#007AFF" }]}
                onPress={adicionarResposta}
              >
                <Text style={styles.modalButtonText}>{t("common.save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
