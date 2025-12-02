import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated } from "react-native";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTranslation } from "react-i18next"; // 👈 Importa o hook de tradução
import { styles } from "./Style";

export default function Font() {
  const router = useRouter();
  const { t } = useTranslation(); // 👈 Inicializa o tradutor

  const [fontSize, setFontSize] = useState(12);
  const [position] = useState(new Animated.Value(0));

  const min = 8;
  const max = 16;

  useEffect(() => {
    const loadFontSize = async () => {
      try {
        const savedSize = await AsyncStorage.getItem("fontSize");
        if (savedSize !== null) {
          const size = parseInt(savedSize);
          setFontSize(size);
          const relative = (size - min) / (max - min);
          position.setValue(relative);
        }
      } catch (error) {
        console.log("Erro ao carregar tamanho da fonte:", error);
      }
    };

    loadFontSize();
  }, []);

  const handleValueChange = async (value) => {
    setFontSize(value);

    const relative = (value - min) / (max - min);

    Animated.timing(position, {
      toValue: relative,
      duration: 200,
      useNativeDriver: false,
    }).start();

    try {
      await AsyncStorage.setItem("fontSize", value.toString());
    } catch (error) {
      console.log("Erro ao salvar tamanho da fonte:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* ---------- Cabeçalho ---------- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("font.title")}</Text>
        
        

        {/* Espaço para manter o título centralizado */}
        <View style={styles.headerSpacer} />
      </View>
    <Text style={styles.sectionSubtitle}>{t("speed.wordDescription")}</Text>
    
      {/* ---------- Controle de Fonte (Slider) ---------- */}
      <View style={styles.sliderWrapper}>
        <View style={styles.sliderContainer}>
          {/* Letra pequena (mínimo) */}
          <Text style={styles.smallA}>A</Text>

          {/* Slider de ajuste */}
          <Slider
            style={{ flex: 1 }}
            minimumValue={min}
            maximumValue={max}
            step={1}
            value={fontSize}
            minimumTrackTintColor="#00AEEF"
            maximumTrackTintColor="#333"
            thumbTintColor="#fff"
            onValueChange={handleValueChange}
          />

          {/* Letra grande (máximo) */}
          <Text style={styles.bigA}>A</Text>
        </View>

        {/* Label flutuante com o valor da fonte */}
        <Animated.View
          style={[
            styles.floatingLabel,
            {
              left: position.interpolate({
                inputRange: [0, 1],
                outputRange: ["2%", "75%"],
              }),
            },
          ]}
        >
          <Text style={styles.floatingText}>
            {fontSize} {t("font.unit")}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}
