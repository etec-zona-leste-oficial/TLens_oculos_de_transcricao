import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next"; // 👈 import do i18n
import { styles } from "./Style";
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export default function Speed() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 inicializa tradução

  const [wordInterval, setWordInterval] = useState(1.0);
  const [finalInterval, setFinalInterval] = useState(3.0);

  const [posWord] = useState(new Animated.Value(0));
  const [posFinal] = useState(new Animated.Value(0));

  const minWord = 0.5;
  const maxWord = 3.0;
  const minFinal = 1.0;
  const maxFinal = 10.0;

  useEffect(() => {
    const loadIntervals = async () => {
      try {
        const savedWord = await AsyncStorage.getItem("wordInterval");
        const savedFinal = await AsyncStorage.getItem("finalInterval");

        if (savedWord !== null) {
          const value = parseFloat(savedWord);
          setWordInterval(value);
          posWord.setValue((value - minWord) / (maxWord - minWord));
        }
        if (savedFinal !== null) {
          const value = parseFloat(savedFinal);
          setFinalInterval(value);
          posFinal.setValue((value - minFinal) / (maxFinal - minFinal));
        }
      } catch (error) {
        console.log("Erro ao carregar intervalos:", error);
      }
    };

    loadIntervals();
  }, []);

  const handleWordChange = async (value) => {
    setWordInterval(value);
    const relative = (value - minWord) / (maxWord - minWord);
    posWord.setValue(relative);
    try {
      await AsyncStorage.setItem("wordInterval", value.toString());
    } catch (error) {
      console.log("Erro ao salvar intervalo entre palavras:", error);
    }
  };

  const handleFinalChange = async (value) => {
    setFinalInterval(value);
    const relative = (value - minFinal) / (maxFinal - minFinal);
    posFinal.setValue(relative);
    try {
      await AsyncStorage.setItem("finalInterval", value.toString());
    } catch (error) {
      console.log("Erro ao salvar intervalo final:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("speed.title")}</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* ---------- Intervalo entre palavras ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("speed.wordTitle")}</Text>
        <Text style={styles.sectionSubtitle}>{t("speed.wordDescription")}</Text>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderSymbol}>-</Text>

          <Slider
            style={{ flex: 1 }}
            minimumValue={minWord}
            maximumValue={maxWord}
            step={0.1}
            value={wordInterval}
            minimumTrackTintColor="#00AEEF"
            maximumTrackTintColor="#333"
            thumbTintColor="#fff"
            onValueChange={handleWordChange}
          />

          <Text style={styles.sliderSymbol}>+</Text>

          <Animated.View
            style={[
              styles.floatingLabel,
              {
                left: posWord.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["10%", "75%"],
                }),
              },
            ]}
          >
            <Text style={styles.floatingText}>{wordInterval.toFixed(1)}s</Text>
          </Animated.View>
        </View>
      </View>

      {/* ---------- Intervalo final ---------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("speed.finalTitle")}</Text>
        <Text style={styles.sectionSubtitle}>{t("speed.finalDescription")}</Text>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderSymbol}>-</Text>

          <Slider
            style={{ flex: 1 }}
            minimumValue={minFinal}
            maximumValue={maxFinal}
            step={0.5}
            value={finalInterval}
            minimumTrackTintColor="#00AEEF"
            maximumTrackTintColor="#333"
            thumbTintColor="#fff"
            onValueChange={handleFinalChange}
          />

          <Text style={styles.sliderSymbol}>+</Text>

          <Animated.View
            style={[
              styles.floatingLabel,
              {
                left: posFinal.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["10%", "75%"],
                }),
              },
            ]}
          >
            <Text style={styles.floatingText}>{finalInterval.toFixed(1)}s</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
